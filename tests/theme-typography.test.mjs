import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const srcUrl = new URL("../src/", import.meta.url);
const globalCssUrl = new URL("styles/global.css", srcUrl);
const layoutUrl = new URL("layouts/Layout.astro", srcUrl);

test("global.css declares the Pretendard Std Variable font-face", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /@font-face\s*\{[^}]*font-family:\s*"Pretendard Std Variable"/);
	assert.match(css, /src:\s*url\("\/fonts\/PretendardStdVariable\.woff2"\)\s*format\("woff2-variations"\)/);
	assert.match(css, /font-weight:\s*100 900/);
	assert.match(css, /font-display:\s*swap/);
});

test("global.css @theme block declares font-sans and the eleven night tokens", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /@theme\s*\{/);
	assert.match(css, /--font-sans:[^;]*"Pretendard Std Variable"/);
	for (const shade of [
		["50", "#c0caf5"],
		["100", "#a9b1d6"],
		["200", "#9aa5ce"],
		["300", "#737aa2"],
		["400", "#565f89"],
		["500", "#414868"],
		["600", "#3b4261"],
		["700", "#292e42"],
		["800", "#24283b"],
		["900", "#1f2335"],
		["950", "#16161e"],
	]) {
		const [id, hex] = shade;
		const pattern = new RegExp(`--color-night-${id}:\\s*${hex}`, "i");
		assert.match(css, pattern, `missing --color-night-${id}: ${hex}`);
	}
});

test("global.css :where(.dark) figure rules reference night colors", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /:where\(\.dark\) \.prose figure img[^}]*border-color:\s*rgb\(59 66 97 \/ 1\)/);
	assert.match(css, /:where\(\.dark\) \.prose figcaption[^}]*color:\s*rgb\(115 122 162 \/ 1\)/);
});

test("Layout.astro preloads the Pretendard font and uses the new palette + sans stack", async () => {
	const layout = await readFile(layoutUrl, "utf8");
	assert.match(
		layout,
		/<link rel="preload" href="\/fonts\/PretendardStdVariable\.woff2" as="font" type="font\/woff2" crossorigin/,
	);
	assert.match(layout, /<html [^>]*class="bg-stone-100 text-stone-900 dark:bg-night-800 dark:text-night-100"/);
	assert.match(layout, /<body[\s\S]*?class="[^"]*bg-stone-100[^"]*dark:bg-night-800[^"]*"/);
	assert.doesNotMatch(layout, /font-serif/);
});

async function collectSourceFiles(dirUrl) {
	const results = [];
	const entries = await readdir(dirUrl, { withFileTypes: true });
	for (const entry of entries) {
		const childUrl = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dirUrl);
		if (entry.isDirectory()) {
			results.push(...(await collectSourceFiles(childUrl)));
			continue;
		}
		if (/\.(astro|ts|mjs)$/.test(entry.name)) {
			results.push(childUrl);
		}
	}
	return results;
}

test("no dark:*-stone-* utility remains anywhere under src/", async () => {
	const files = await collectSourceFiles(srcUrl);
	const offenders = [];
	for (const fileUrl of files) {
		const text = await readFile(fileUrl, "utf8");
		const matches = text.match(/dark:[A-Za-z-]*stone-[0-9]+/g);
		if (matches) {
			offenders.push({ file: fileUrl.pathname, matches: Array.from(new Set(matches)) });
		}
	}
	assert.deepEqual(offenders, [], `residual dark stone tokens:\n${JSON.stringify(offenders, null, 2)}`);
});

test("no light-mode bg-stone-50 or panel-level bg-stone-100 / border-stone-100 remains", async () => {
	const files = await collectSourceFiles(srcUrl);
	const patterns = [
		/\bbg-stone-50\b/,
		/\bring-offset-stone-50\b/,
		/(^|[^-])bg-stone-100\b/,
		/\bborder-stone-100\b/,
		/\bprose-pre:bg-stone-100\b/,
		/\bhover:bg-stone-200\b/,
	];
	const offenders = [];
	for (const fileUrl of files) {
		// Skip Layout.astro since it intentionally has bg-stone-100 for light mode background
		if (fileUrl.pathname.endsWith("Layout.astro")) continue;

		const text = await readFile(fileUrl, "utf8");
		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) {
				offenders.push({ file: fileUrl.pathname, pattern: pattern.source, match: match[0] });
			}
		}
	}
	assert.deepEqual(offenders, [], `residual stone tokens:\n${JSON.stringify(offenders, null, 2)}`);
});
