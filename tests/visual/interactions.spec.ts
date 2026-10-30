import { expect, openPage, REPRESENTATIVE_PAGES as PAGES, settle, test } from "./helpers";

/**
 * Client-side behaviour that only exists once the page runs in a browser:
 * the theme toggle (and the mermaid <picture> flip that rides on it), the
 * sticky-header clearance for anchor jumps, the TOC scroll-spy, the reading
 * progress bar, the image lightbox, the code copy button, the search modal,
 * the 404 locale switch, and the mobile header. Every one of these shipped
 * at least one follow-up fix that no test caught.
 */

const TOC_RAIL_LINKS = "article > aside nav[data-toc] a";

test.describe("theme toggle", () => {
	test("switches the palette, flips mermaid diagrams, and remembers the choice", async ({ page }) => {
		await openPage(page, PAGES.postMermaidKo, "light");
		const html = page.locator("html");
		const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
		const toggle = page.locator("[data-theme-toggle]");
		const diagrams = page.locator("article picture:has(source[data-original-media*='dark'])");
		await expect.poll(isDark).toBe(false);
		await expect(diagrams).toHaveCount(2);

		const readDiagramState = () =>
			diagrams.evaluateAll((pictures) =>
				pictures.map((picture) => {
					const source = picture.querySelector<HTMLSourceElement>("source[data-original-media*='dark']");
					const img = picture.querySelector<HTMLImageElement>("img");
					if (!source || !img) return null;
					return {
						media: source.media,
						showsDark: img.currentSrc === source.srcset,
						showsLight: img.currentSrc === new URL(img.getAttribute("src") ?? "", location.href).href,
					};
				}),
			);

		for (const state of await readDiagramState()) {
			expect(state).toEqual({ media: "(prefers-color-scheme: dark)", showsDark: false, showsLight: true });
		}

		await toggle.click();
		await expect.poll(isDark).toBe(true);
		await expect(toggle).toHaveAttribute("aria-pressed", "true");
		// The fade helper is attached only for the duration of the toggle.
		await expect(html).not.toHaveClass(/theme-transition/, { timeout: 2_000 });
		for (const state of await readDiagramState()) {
			expect(state).toEqual({ media: "all", showsDark: true, showsLight: false });
		}

		await page.reload();
		await settle(page);
		await expect.poll(isDark).toBe(true);

		await page.locator("[data-theme-toggle]").click();
		await expect.poll(isDark).toBe(false);
		for (const state of await readDiagramState()) {
			expect(state).toEqual({ media: "(prefers-color-scheme: dark)", showsDark: false, showsLight: true });
		}
	});
});

test.describe("table of contents", () => {
	test.skip(({ isMobile }) => isMobile, "the TOC rail and its scroll-spy only render on wide viewports");

	test("a TOC click lands the heading just below the sticky header and marks the link active", async ({ page }) => {
		await openPage(page, PAGES.postRichKo);
		const links = page.locator(TOC_RAIL_LINKS);
		await expect(links.first()).toBeVisible();
		const link = links.nth(1);
		const id = (await link.getAttribute("href"))!.slice(1);
		const heading = page.locator(`[id="${id}"]`);
		const header = page.locator("header[data-smart-header]");

		await link.click();

		const gapBelowHeader = async () => {
			const [headingBox, headerBox] = await Promise.all([heading.boundingBox(), header.boundingBox()]);
			if (!headingBox || !headerBox) return Number.NaN;
			return headingBox.y - (headerBox.y + headerBox.height);
		};
		await expect.poll(gapBelowHeader, { message: "heading must not hide under the sticky header" }).toBeGreaterThanOrEqual(-1);
		expect(await gapBelowHeader(), "heading should sit right under the header, not far below it").toBeLessThan(48);
		await expect(link).toHaveClass(/toc-active/);
		await expect(page.locator(`${TOC_RAIL_LINKS}.toc-active`)).toHaveCount(1);
	});

	test("the scroll-spy follows the reading position and clears above the first heading", async ({ page }) => {
		await openPage(page, PAGES.postRichKo);
		const links = page.locator(TOC_RAIL_LINKS);
		const count = await links.count();
		expect(count).toBeGreaterThan(2);
		const lastLink = links.nth(count - 1);
		const lastId = (await lastLink.getAttribute("href"))!.slice(1);

		await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), lastId);
		await expect(lastLink).toHaveClass(/toc-active/);

		await page.evaluate(() => window.scrollTo(0, 0));
		await expect(page.locator(`${TOC_RAIL_LINKS}.toc-active`)).toHaveCount(0);
	});
});

test.describe("reading progress", () => {
	test("the bar is empty at the top and full once the article body has scrolled past", async ({ page }) => {
		await openPage(page, PAGES.postRichKo);
		const fill = page.locator("[data-reading-progress-fill]");
		const progress = () =>
			fill.evaluate((element) => {
				const match = getComputedStyle(element).transform.match(/matrix\(([^,]+),/);
				return match ? Number.parseFloat(match[1]) : Number.NaN;
			});

		expect(await progress()).toBe(0);

		await page.evaluate(() => {
			const prose = document.querySelector("article .prose-site");
			if (!prose) throw new Error("prose body not found");
			window.scrollTo(0, prose.getBoundingClientRect().bottom + window.scrollY - window.innerHeight);
		});
		await expect.poll(progress).toBeGreaterThanOrEqual(0.99);

		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await expect.poll(progress).toBe(1);
	});
});

test.describe("image lightbox", () => {
	test("prose images zoom into the lightbox with their caption and close on Escape", async ({ page }) => {
		await openPage(page, PAGES.postRichKo);
		const figure = page.locator("article .prose-site figure:has(figcaption)").first();
		const image = figure.locator("img");
		const captionText = (await figure.locator("figcaption").innerText()).trim();

		await expect(image, "the lightbox should wire every prose image").toHaveAttribute("data-zoomable", "");
		await expect(image).toHaveCSS("cursor", "zoom-in");

		await image.click();
		const shell = page.locator("[data-post-lightbox]");
		await expect(shell).toHaveAttribute("aria-hidden", "false");
		await expect(shell).toHaveAttribute("data-state", "open");
		await expect(page.locator("[data-post-lightbox-image]")).toHaveAttribute("src", /\/_astro\//);
		const caption = page.locator("[data-post-lightbox-caption]");
		await expect(caption).toHaveText(captionText);
		await expect(caption).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(shell).toHaveAttribute("aria-hidden", "true");
		await expect(shell).toHaveClass(/\bhidden\b/);
		await expect(image).toBeVisible();
	});

	test("mermaid diagrams stay out of the lightbox", async ({ page }) => {
		await openPage(page, PAGES.postMermaidKo);
		const diagram = page.locator("article picture:has(source[media]) img").first();
		await expect(diagram).toBeVisible();
		await expect(diagram).not.toHaveAttribute("data-zoomable");
		await diagram.click();
		await expect(page.locator("[data-post-lightbox]")).toHaveAttribute("aria-hidden", "true");
	});
});

test.describe("code copy button", () => {
	test("appears on hover, copies the block, and reverts its label", async ({ page, context, isMobile }) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await openPage(page, PAGES.postRichKo);
		const block = page.locator(".code-block").first();
		const button = block.locator(".code-copy-button");
		await block.scrollIntoViewIfNeeded();

		if (!isMobile) {
			await expect(button).toHaveCSS("opacity", "0");
			await block.hover();
		}
		await expect(button).toHaveCSS("opacity", "1");

		const expected = await block.locator("pre code").evaluate((code) => (code as HTMLElement).innerText);
		await button.click();
		await expect(button).toHaveAttribute("aria-label", "복사됨");
		await expect(button.locator('[data-state="copied"]')).toBeVisible();
		expect((await page.evaluate(() => navigator.clipboard.readText())).trim()).toBe(expected.trim());
		await expect(button).toHaveAttribute("aria-label", "코드 복사", { timeout: 3_000 });
	});
});

test.describe("search", () => {
	test("the modal opens in the site font and finds posts", async ({ page }) => {
		await openPage(page, PAGES.homeKo);
		await page.locator("[data-search-open]").click();
		const modal = page.locator("[data-search-modal]");
		await expect(modal).toHaveAttribute("aria-hidden", "false");

		const input = modal.locator(".pagefind-ui__search-input");
		await expect(input).toBeVisible({ timeout: 10_000 });
		await expect(input).toHaveCSS("font-family", /Pretendard/);

		await input.fill("EOS");
		await expect(modal.locator(".pagefind-ui__result").first()).toBeVisible({ timeout: 10_000 });

		await page.keyboard.press("Escape");
		await expect(modal).toHaveAttribute("aria-hidden", "true");
	});
});

test.describe("404 page", () => {
	test("shows the English copy and a KO switcher under /en/", async ({ page }) => {
		const response = await openPage(page, "/en/this-page-does-not-exist/");
		expect(response?.status()).toBe(404);
		await expect(page.locator("html")).toHaveAttribute("lang", "en");
		await expect(page.locator("[data-404-en]")).toBeVisible();
		await expect(page.locator("[data-404-ko]")).toBeHidden();
		const switcher = page.locator("[data-locale-switcher]");
		await expect(switcher).toHaveText("KO");
		await expect(switcher).toHaveAttribute("href", "/");
	});

	test("shows the Korean copy everywhere else", async ({ page }) => {
		const response = await openPage(page, "/this-page-does-not-exist/");
		expect(response?.status()).toBe(404);
		await expect(page.locator("html")).toHaveAttribute("lang", "ko");
		await expect(page.locator("[data-404-ko]")).toBeVisible();
		await expect(page.locator("[data-404-en]")).toBeHidden();
		await expect(page.locator("[data-locale-switcher]")).toHaveText("EN");
	});
});

test.describe("mobile chrome", () => {
	test.skip(({ isMobile }) => !isMobile, "narrow viewport only");

	test("the header hides while scrolling down and returns on the way up", async ({ page }) => {
		await openPage(page, PAGES.postRichKo);
		const header = page.locator("header[data-smart-header]");
		await page.evaluate(() => window.scrollTo(0, 400));
		await page.evaluate(() => window.scrollTo(0, 800));
		await expect(header).toHaveClass(/-translate-y-full/);
		await page.evaluate(() => window.scrollTo(0, 600));
		await expect(header).not.toHaveClass(/-translate-y-full/);
	});

	test("the collapsed table of contents expands on tap", async ({ page }) => {
		await openPage(page, PAGES.postRichKo);
		const details = page.locator("article > details");
		const firstLink = details.locator("nav[data-toc] a").first();
		await expect(firstLink).toBeHidden();
		await details.locator("summary").click();
		await expect(firstLink).toBeVisible();
	});
});

test.describe("responsive images", () => {
	test("every AVIF/WebP candidate of a post's images decodes at its declared width", async ({ page }) => {
		// Read the markup before `settle()` collapses the pictures.
		await page.goto(PAGES.postRichKo, { waitUntil: "load" });
		const candidates = await page.evaluate(() => {
			const seen = new Map<string, { url: string; width: number; type: string }>();
			for (const picture of document.querySelectorAll("article picture")) {
				if (picture.querySelector("source[media]")) continue;
				for (const source of picture.querySelectorAll<HTMLSourceElement>("source")) {
					for (const entry of source.srcset.split(",")) {
						const [url, descriptor] = entry.trim().split(/\s+/);
						if (!url) continue;
						seen.set(url, { url, width: Number.parseInt(descriptor ?? "0", 10), type: source.type });
					}
				}
				const img = picture.querySelector("img");
				if (img?.getAttribute("src")) {
					seen.set(img.getAttribute("src")!, {
						url: img.getAttribute("src")!,
						width: Number(img.getAttribute("width")),
						type: "fallback",
					});
				}
			}
			return Array.from(seen.values());
		});
		expect(candidates.length, "the post should expose responsive image candidates").toBeGreaterThan(4);
		expect(candidates.some((c) => c.type === "image/avif"), "AVIF variants should be generated").toBe(true);
		expect(candidates.some((c) => c.type === "image/webp"), "WebP variants should be generated").toBe(true);

		const decoded = await page.evaluate(async (list) => {
			return Promise.all(
				list.map(async ({ url, width, type }) => {
					const img = new Image();
					img.src = url;
					try {
						await img.decode();
						return { url, type, width, naturalWidth: img.naturalWidth, ok: img.naturalWidth === width };
					} catch {
						return { url, type, width, naturalWidth: 0, ok: false };
					}
				}),
			);
		}, candidates);
		const broken = decoded.filter((entry) => !entry.ok);
		expect(broken, `candidates that failed to decode or have the wrong width:\n${JSON.stringify(broken, null, 2)}`).toEqual([]);
	});
});
