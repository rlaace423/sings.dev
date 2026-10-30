import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	test as base,
	expect,
	type Locator,
	type Page,
	type PageScreenshotOptions,
} from "playwright/test";

export type Theme = "light" | "dark";
export const THEMES: readonly Theme[] = ["light", "dark"];

export const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));

/**
 * Every HTML page the build produced, as site-relative URL paths.
 * Directory routes come back with a trailing slash (`/posts/foo/`), plus the
 * standalone 404 document.
 */
export function allPagePaths(): string[] {
	const paths: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) {
				if (entry === "pagefind" || entry === "_astro") continue;
				walk(full);
			} else if (entry === "index.html") {
				const rel = relative(DIST, dir).split(sep).join("/");
				paths.push(rel ? `/${rel}/` : "/");
			}
		}
	};
	walk(DIST);
	paths.push("/404.html");
	return paths.sort();
}

/**
 * Pages that stand in for each distinct layout when a check is too costly to
 * run against every route (screenshots, interaction flows).
 */
export const REPRESENTATIVE_PAGES = {
	homeKo: "/",
	homeEn: "/en/",
	aboutKo: "/about/",
	aboutEn: "/en/about/",
	archiveKo: "/posts/",
	archiveEn: "/en/posts/",
	category: "/category/development/",
	tag: "/tags/eos/",
	notFound: "/404.html",
	// Figures with captions, Shiki code blocks, a callout, a table, and a series rail.
	postRichKo: "/posts/eosjs-coin-transfer/",
	// The only posts with mermaid diagrams (light + dark <picture> variants).
	postMermaidKo: "/posts/purpose-driven-systems/",
	postMermaidEn: "/en/posts/purpose-driven-systems/",
	// Contains the long unbreakable token that used to overflow on Android.
	postLongTokenEn: "/en/posts/safe-random-types/",
	// Blockquotes, h3 headings, and paragraphs with inline code chips.
	postQuoteKo: "/posts/eos-dawn-installation/",
} as const;

export const test = base.extend({
	context: async ({ context }, use) => {
		// Everything the site needs is self-hosted. Third-party embeds (giscus,
		// analytics) would make renders nondeterministic, so block them.
		await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort());
		await use(context);
	},
});

export { expect };

/** Navigate with the given colour scheme and wait until the page has settled. */
export async function openPage(page: Page, path: string, theme: Theme = "light") {
	await page.emulateMedia({ colorScheme: theme, reducedMotion: "no-preference" });
	const response = await page.goto(path, { waitUntil: "load" });
	await settle(page);
	return response;
}

/**
 * Make the page reproducible before measuring or capturing it:
 *   - lazy images are switched to eager so nothing is left as a placeholder;
 *   - responsive content pictures are collapsed to their fallback `<img>`.
 *     Chromium picks the srcset candidate while the mobile layout viewport is
 *     still settling, so the same page came back with the 400w variant on one
 *     load and the 640w variant on the next — each with a slightly different
 *     aspect ratio, which moved everything below by a fraction of a pixel and
 *     changed the image pixels themselves. Mermaid pictures keep their
 *     light/dark media-query sources (the theme-toggle tests rely on them);
 *     the candidates themselves are covered by a dedicated decode test;
 *   - web fonts and every image are awaited.
 */
export async function settle(page: Page) {
	await page.evaluate(async () => {
		for (const img of document.querySelectorAll<HTMLImageElement>("img[loading='lazy']")) {
			img.loading = "eager";
		}
		for (const picture of document.querySelectorAll("picture")) {
			if (picture.querySelector("source[media]")) continue;
			for (const source of picture.querySelectorAll("source")) source.remove();
			const img = picture.querySelector("img");
			img?.removeAttribute("srcset");
			img?.removeAttribute("sizes");
		}
		await document.fonts.ready;
		// Let the image-update steps triggered above start their loads first.
		await new Promise((resolve) => setTimeout(resolve, 0));
		await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
	});
}

// ---------------------------------------------------------------------------
// Screenshot baselines
//
// Baselines are platform-specific (Chromium rasterizes text differently on
// macOS and Linux), so a fresh platform — the first CI run, or a new shot —
// has nothing to compare against. Instead of failing, the helpers below write
// the capture as the new baseline, annotate the test, and skip it at the end,
// so the run stays green while the candidate files can be reviewed, committed
// (or downloaded from the CI artifact) and compared from the next run on.
// ---------------------------------------------------------------------------

const SCREENSHOT_DEFAULTS = { animations: "disabled", caret: "hide", scale: "css" } as const;
const createdBaselines = new Map<string, string[]>();

async function compareOrCreate(target: Page | Locator, name: string, options: PageScreenshotOptions) {
	const info = test.info();
	const baseline = info.snapshotPath(name);
	if (existsSync(baseline)) {
		await expect(target as Page).toHaveScreenshot(name, options);
		return;
	}
	mkdirSync(dirname(baseline), { recursive: true });
	writeFileSync(baseline, await target.screenshot({ ...SCREENSHOT_DEFAULTS, ...options }));
	const path = relative(process.cwd(), baseline);
	createdBaselines.set(info.testId, [...(createdBaselines.get(info.testId) ?? []), path]);
	info.annotations.push({ type: "baseline-created", description: path });
}

/** Whole page (default) or just the first screen. */
export function screenshotPage(page: Page, name: string, options: { fullPage?: boolean } = {}) {
	return compareOrCreate(page, name, { fullPage: options.fullPage ?? true });
}

/**
 * One component, cropped from a full-document capture at integer document
 * coordinates. Element screenshots scroll the target into view first and the
 * resulting sub-pixel offsets made the same component come out 1px taller or
 * shifted between runs; a document-space crop has no scroll step at all.
 */
export async function screenshotElement(page: Page, selector: string, name: string) {
	const target = page.locator(selector).first();
	await expect(target, `${selector} should render on ${page.url()}`).toBeVisible();
	const box = await target.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return {
			x: rect.left + window.scrollX,
			y: rect.top + window.scrollY,
			width: rect.width,
			height: rect.height,
		};
	});
	// Integer origin, size padded by one pixel: an element whose bottom edge
	// sits a hair below an integer (e.g. 6530.969) would otherwise make the
	// crop 93px on one run and 94px on the next, which fails as a size mismatch.
	const clip = {
		x: Math.floor(box.x),
		y: Math.floor(box.y),
		width: Math.ceil(box.width) + 1,
		height: Math.ceil(box.height) + 1,
	};
	await compareOrCreate(page, name, { fullPage: true, clip });
}

/** A component in its hovered state (needs the real pointer, so no document crop). */
export async function screenshotHovered(locator: Locator, name: string) {
	await locator.evaluate((element) => element.scrollIntoView({ block: "center" }));
	await locator.hover();
	await compareOrCreate(locator, name, {});
}

/** Call at the end of a screenshot test: skips it when baselines were just created. */
export function skipIfBaselinesCreated() {
	const info = test.info();
	const created = createdBaselines.get(info.testId) ?? [];
	test.skip(
		created.length > 0,
		`${created.length} screenshot baseline(s) were created for ${process.platform}/${info.project.name}. ` +
			"Review them under tests/visual/__screenshots__/, commit them, and rerun to compare.",
	);
}
