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

test("header uses the SiteLogo mark next to the sings.dev text and keeps the Korean-safe nav guard plus mobile gap tightening", async () => {
	const header = await readFile(new URL("../src/components/Header.astro", import.meta.url), "utf8");

	assert.match(header, /import SiteLogo from "\.\/SiteLogo\.astro";/);
	assert.match(header, /<SiteLogo \/>/);
	assert.match(header, /<span[^>]*>sings\.dev<\/span>/);
	const logoOpens = header.indexOf("<SiteLogo");
	const logoTextOpens = header.indexOf("<span>sings.dev</span>");
	assert.ok(
		logoOpens >= 0 && logoTextOpens > logoOpens,
		"SiteLogo should render before the sings.dev text span",
	);

	assert.match(header, /gap-2 sm:gap-3/);
	assert.match(header, /gap-4 sm:gap-5/);
	assert.match(header, /whitespace-nowrap/);
});
