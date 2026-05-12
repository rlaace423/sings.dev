import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("layout renders the header outside the centered site shell", async () => {
	const layout = await readFile(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8");
	const headerIndex = layout.indexOf("<Header lang={lang} />");
	const shellIndex = layout.indexOf("max-w-4xl");

	assert.notEqual(headerIndex, -1, "Layout should render the shared header");
	assert.notEqual(shellIndex, -1, "Layout should still keep a centered max-w-4xl site shell");
	assert.ok(
		headerIndex < shellIndex,
		"Header should render before the centered site shell so its chrome can be full-bleed",
	);
});

test("header keeps its controls inside an inner centered container", async () => {
	const header = await readFile(new URL("../src/components/Header.astro", import.meta.url), "utf8");

	assert.match(
		header,
		/<div class="mx-auto flex w-full max-w-4xl[^"]*px-4[^"]*sm:px-6/,
		"Header should keep its controls inside an inner centered max-w-4xl container",
	);
});

test("header uses the SiteBrand wordmark, hides primary nav text on sub-sm, and keeps the Korean-safe nav guard plus mobile gap tightening", async () => {
	const header = await readFile(new URL("../src/components/Header.astro", import.meta.url), "utf8");

	assert.match(header, /import SiteBrand from "\.\/SiteBrand\.astro";/);
	assert.match(header, /<SiteBrand \/>/);

	assert.doesNotMatch(header, /import SiteLogo from/, "SiteLogo import must be gone");
	assert.doesNotMatch(header, /<SiteLogo /, "<SiteLogo /> must be gone");
	assert.doesNotMatch(
		header,
		/<span[^>]*>sings\.dev<\/span>/,
		"the inline sings.dev <span> must be gone — the brand component owns the wordmark now",
	);

	assert.match(
		header,
		/navItems\.map[\s\S]*<li class="hidden sm:inline-block">/,
		"each primary-nav <li> must hide on sub-sm via hidden sm:inline-block",
	);

	assert.match(header, /gap-2 sm:gap-3/);
	assert.match(header, /gap-4 sm:gap-5/);
	assert.match(header, /whitespace-nowrap/);
});

test("locale switcher carries a data-locale-switcher hook so the 404 page can flip it client-side", async () => {
	const header = await readFile(new URL("../src/components/Header.astro", import.meta.url), "utf8");

	assert.match(
		header,
		/<a\s+data-locale-switcher[\s\S]*?aria-label=\{`Switch language to \$\{labels\[targetLocale\]\}`\}/,
		"The locale switcher anchor must carry data-locale-switcher; without it the 404 inline script can't flip the button to KO on an /en/ 404",
	);
});
