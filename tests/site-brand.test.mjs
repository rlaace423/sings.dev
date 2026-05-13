import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const brandUrl = new URL("../src/components/SiteBrand.astro", import.meta.url);

test("SiteBrand renders the prompt, sings, .dev, and cursor in document order", async () => {
	const source = await readFile(brandUrl, "utf8");
	const dollar = source.indexOf(">$<");
	const sings = source.indexOf(">sings<");
	const tld = source.indexOf(">.dev<");
	const cursor = source.indexOf("brand-cursor");

	assert.ok(dollar > -1, "should render the $ prompt");
	assert.ok(sings > dollar, "sings should appear after $");
	assert.ok(tld > sings, ".dev should appear after sings");
	assert.ok(cursor > tld, "cursor should appear after .dev");
});

test("SiteBrand cursor span is aria-hidden", async () => {
	const source = await readFile(brandUrl, "utf8");
	assert.match(
		source,
		/class="[^"]*brand-cursor[^"]*"[^>]*aria-hidden="true"/,
		"the cursor span must carry aria-hidden so screen readers do not announce it",
	);
});

test("SiteBrand applies the brand accent on $, .dev, and the cursor", async () => {
	const source = await readFile(brandUrl, "utf8");
	const matches = source.match(/text-amber-700 dark:text-\[#e0af68\]/g) ?? [];
	assert.ok(
		matches.length >= 3,
		`expected at least 3 brand-accent classes (amber-700 light / #e0af68 dark) on $, .dev, cursor; got ${matches.length}`,
	);
});

test("SiteBrand wrapper uses font-mono and whitespace-nowrap", async () => {
	const source = await readFile(brandUrl, "utf8");
	assert.match(source, /font-mono/, "wrapper must switch to the mono stack");
	assert.match(source, /whitespace-nowrap/, "wrapper must prevent the cursor wrapping to a second line");
});

test("SiteBrand cursor animation respects prefers-reduced-motion", async () => {
	const source = await readFile(brandUrl, "utf8");
	assert.match(source, /@keyframes\s+brand-cursor-blink/, "blink animation must be defined");
	assert.match(
		source,
		/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.brand-cursor[\s\S]*animation:\s*none/,
		"reduced-motion media query must pin the cursor visible",
	);
});
