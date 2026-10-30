import { collectContrastViolations } from "./contrast";
import { allPagePaths, expect, openPage, test, THEMES } from "./helpers";

/**
 * Layout and legibility invariants, checked on every page the build emits,
 * in both colour schemes, on both viewports.
 *
 * These are the rendered-output versions of fixes that previously had to be
 * found by eye and were re-fixed several times:
 *   - horizontal overflow (long unbreakable tokens, intrinsic-width images)
 *     which Chrome Android answers by zooming the whole page out;
 *   - text / background pairs below WCAG AA after a palette or token change.
 */
for (const path of allPagePaths()) {
	for (const theme of THEMES) {
		test(`${path} [${theme}] fits the viewport and keeps text legible`, async ({ page }) => {
			await openPage(page, path, theme);

			const layout = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
				bodyScrollWidth: document.body.scrollWidth,
				visualScale: window.visualViewport?.scale ?? 1,
			}));
			expect
				.soft(layout.scrollWidth, `document is wider than the viewport: ${JSON.stringify(layout)}`)
				.toBeLessThanOrEqual(layout.clientWidth);
			expect
				.soft(layout.bodyScrollWidth, `body is wider than the viewport: ${JSON.stringify(layout)}`)
				.toBeLessThanOrEqual(layout.clientWidth);
			expect
				.soft(layout.visualScale, `browser zoomed out to fit overflowing content: ${JSON.stringify(layout)}`)
				.toBeGreaterThanOrEqual(0.99);

			const violations = await page.evaluate(collectContrastViolations);
			const report = violations
				.map(
					(v) =>
						`  ${v.kind.padEnd(6)} ${v.ratio.toFixed(2)}:1 (needs ${v.required}:1) ` +
						`${v.fg} on ${v.bg} @ ${v.fontSize}px/${v.fontWeight} — ${v.where} — "${v.text}"`,
				)
				.join("\n");
			expect.soft(violations, `text below WCAG AA contrast:\n${report}`).toEqual([]);
		});
	}
}
