import {
	expect,
	openPage,
	REPRESENTATIVE_PAGES as PAGES,
	screenshotElement,
	screenshotHovered,
	screenshotPage,
	skipIfBaselinesCreated,
	test,
	THEMES,
} from "./helpers";

/**
 * Pixel baselines for how the site looks.
 *
 * Short pages are captured whole, long listings only as their first screen,
 * and post pages per component: a full-page PNG of a long post is several
 * megabytes, taller than Chromium's capture limit on a phone viewport, and a
 * diff in it says little about which part moved. Each component below had at
 * least one "looked wrong, fixed by eye" commit in the history.
 *
 * Baselines live under tests/visual/__screenshots__/<project>/<platform>/ and
 * are refreshed with `npm run test:visual:update` (see docs/spec-testing.md).
 */

const FULL_PAGES: ReadonlyArray<[name: string, path: string]> = [
	["home-ko", PAGES.homeKo],
	["home-en", PAGES.homeEn],
	["about-ko", PAGES.aboutKo],
	["about-en", PAGES.aboutEn],
	["not-found", PAGES.notFound],
];

const FIRST_SCREEN_PAGES: ReadonlyArray<[name: string, path: string]> = [
	["archive-ko", PAGES.archiveKo],
	["category", PAGES.category],
	["tag", PAGES.tag],
];

// The header is captured once at scroll 0. Everywhere else it is un-stuck so
// its show/hide-on-scroll state (a JS race on mobile) cannot bleed into crops.
const UNSTICK_HEADER = "header[data-smart-header] { position: static !important; }";

for (const theme of THEMES) {
	for (const [name, path] of FULL_PAGES) {
		test(`${name} [${theme}] full page`, async ({ page }) => {
			await openPage(page, path, theme);
			await screenshotPage(page, `${name}-${theme}.png`);
			skipIfBaselinesCreated();
		});
	}

	for (const [name, path] of FIRST_SCREEN_PAGES) {
		test(`${name} [${theme}] first screen`, async ({ page }) => {
			await openPage(page, path, theme);
			await screenshotPage(page, `${name}-${theme}.png`, { fullPage: false });
			skipIfBaselinesCreated();
		});
	}

	test.describe(`post components [${theme}]`, () => {
		test("header, TOC, prose, figure, code block, callout, series rail, footer", async ({ page, isMobile }) => {
			await openPage(page, PAGES.postRichKo, theme);
			const shot = (selector: string, name: string) =>
				screenshotElement(page, selector, `post-${name}-${theme}.png`);

			await shot("header[data-smart-header]", "site-header");
			await page.addStyleTag({ content: UNSTICK_HEADER });

			await shot("article > header", "post-header");
			if (isMobile) {
				await shot("article > details", "toc-collapsed");
				await page.locator("article > details > summary").click();
				await shot("article > details", "toc-expanded");
			} else {
				await shot("article > aside", "toc-rail");
			}

			// Prose primitives: heading colour, list markers, inline code chip,
			// table — the elements behind most of the palette follow-ups.
			await shot("article .prose-site h2", "prose-h2");
			await shot("article .prose-site ul", "prose-ul");
			await shot("article .prose-site ol", "prose-ol");
			await shot("article .prose-site p:has(> code)", "prose-inline-code");
			await shot("article .prose-site table", "prose-table");

			await shot("article .prose-site figure:has(figcaption)", "figure");
			await shot(".code-block", "code-block");
			await screenshotHovered(page.locator(".code-block").first(), `post-code-block-hover-${theme}.png`);
			await shot("article .prose-site aside.callout", "callout");
			await shot("article > section.mt-16", "reading-flow");
			await shot("footer", "footer");
			skipIfBaselinesCreated();
		});

		test("blockquote and h3 typography", async ({ page }) => {
			await openPage(page, PAGES.postQuoteKo, theme);
			await page.addStyleTag({ content: UNSTICK_HEADER });
			await screenshotElement(page, "article .prose-site blockquote", `post-prose-blockquote-${theme}.png`);
			await screenshotElement(page, "article .prose-site h3", `post-prose-h3-${theme}.png`);
			skipIfBaselinesCreated();
		});

		test("mermaid diagrams render in the matching palette", async ({ page }) => {
			await openPage(page, PAGES.postMermaidKo, theme);
			await page.addStyleTag({ content: UNSTICK_HEADER });
			const diagrams = page.locator("article picture:has(source[media])");
			await expect(diagrams).toHaveCount(2);
			await screenshotElement(page, "article picture:has(source[media])", `post-mermaid-1-${theme}.png`);
			await screenshotElement(page, "article picture:has(source[media]):nth-of-type(n) >> nth=1", `post-mermaid-2-${theme}.png`);
			skipIfBaselinesCreated();
		});

		test("a long unbreakable token wraps inside the article column", async ({ page }) => {
			await openPage(page, PAGES.postLongTokenEn, theme);
			await page.addStyleTag({ content: UNSTICK_HEADER });
			await screenshotElement(
				page,
				"article .prose-site ul:has(li:has-text('RandomNumberGenerator.Create'))",
				`post-long-token-${theme}.png`,
			);
			skipIfBaselinesCreated();
		});
	});
}
