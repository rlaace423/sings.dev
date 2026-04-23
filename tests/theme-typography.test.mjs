import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
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
		["400", "#8891b8"],
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

test("global.css @theme block declares the eleven dawn tokens and the terracotta accent", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /--color-dawn-50:\s*#faf8f2/i);
	assert.match(css, /--color-dawn-100:\s*#f5f3ee/i);
	assert.match(css, /--color-dawn-200:\s*#e8e3d9/i);
	assert.match(css, /--color-dawn-300:\s*#dcd6cc/i);
	assert.match(css, /--color-dawn-400:\s*#b8aea1/i);
	assert.match(css, /--color-dawn-500:\s*#7c8196/i);
	assert.match(css, /--color-dawn-600:\s*#565f89/i);
	assert.match(css, /--color-dawn-700:\s*#414868/i);
	assert.match(css, /--color-dawn-800:\s*#24283b/i);
	assert.match(css, /--color-dawn-900:\s*#1a1d2c/i);
	assert.match(css, /--color-dawn-950:\s*#10121b/i);
	assert.match(css, /--color-terracotta-600:\s*#a04e2a/i);
});

test("global.css declares the theme-transition rule with the expected properties", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /html\.theme-transition,\s*\n\s*html\.theme-transition \*/);
	assert.match(css, /background-color\s+250ms\s+ease/);
	assert.match(css, /color\s+250ms\s+ease/);
	assert.match(css, /border-color\s+250ms\s+ease/);
	assert.match(css, /fill\s+250ms\s+ease/);
	assert.match(css, /stroke\s+250ms\s+ease/);
});

test("global.css :where(.dark) figure rules reference night colors", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /:where\(\.dark\) \.prose figure img[^}]*border-color:\s*rgb\(59 66 97 \/ 1\)/);
	assert.match(css, /:where\(\.dark\) \.prose figcaption[^}]*color:\s*rgb\(136 145 184 \/ 1\)/);
});

test("dark-mode muted text (night-400) clears WCAG AA 4.5:1 on night-800 body", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	function hexFromToken(token) {
		const match = css.match(new RegExp(`--color-${token}:\\s*(#[0-9a-f]{6})`, "i"));
		assert.ok(match, `missing --color-${token}`);
		return match[1];
	}
	function relLum(hex) {
		const n = parseInt(hex.replace("#", ""), 16);
		const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
		const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
		return 0.2126 * lin(channels[0]) + 0.7152 * lin(channels[1]) + 0.0722 * lin(channels[2]);
	}
	function contrast(a, b) {
		const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
		return (hi + 0.05) / (lo + 0.05);
	}
	const muted = hexFromToken("night-400");
	const body = hexFromToken("night-800");
	const ratio = contrast(muted, body);
	assert.ok(
		ratio >= 4.5,
		`night-400 (${muted}) on night-800 (${body}) is ${ratio.toFixed(2)}:1; needs >= 4.5:1 for WCAG AA on normal text`,
	);
});

test("Layout.astro preloads the Pretendard font and uses the new palette + sans stack", async () => {
	const layout = await readFile(layoutUrl, "utf8");
	assert.match(
		layout,
		/<link rel="preload" href="\/fonts\/PretendardStdVariable\.woff2" as="font" type="font\/woff2" crossorigin/,
	);
	assert.match(layout, /<html [^>]*class="bg-dawn-100 text-dawn-800 dark:bg-night-800 dark:text-night-100"/);
	assert.match(layout, /<body[\s\S]*?class="[^"]*bg-dawn-100[^"]*text-dawn-800[^"]*dark:bg-night-800[^"]*"/);
	assert.doesNotMatch(layout, /font-serif/);
});

test("Layout.astro theme toggle handlers add and remove the theme-transition class around applyTheme", async () => {
	const layout = await readFile(layoutUrl, "utf8");
	assert.ok(
		/root\.classList\.add\("theme-transition"\);\s*\n\s*applyTheme\(nextTheme\);\s*\n\s*setTimeout\(\(\) => root\.classList\.remove\("theme-transition"\), 300\);/.test(layout),
		"manual click handler should add theme-transition before applyTheme and remove it after 300ms",
	);
	assert.ok(
		/root\.classList\.add\("theme-transition"\);\s*\n\s*applyTheme\(event\.matches \? "dark" : "light"\);\s*\n\s*setTimeout\(\(\) => root\.classList\.remove\("theme-transition"\), 300\);/.test(layout),
		"system-preference handler should add theme-transition before applyTheme and remove it after 300ms",
	);
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

test("no light-mode *-stone-* utility remains anywhere under src/", async () => {
	const files = await collectSourceFiles(srcUrl);
	const offenders = [];
	for (const fileUrl of files) {
		const text = await readFile(fileUrl, "utf8");
		const matches = text.match(/(?<!["'`])(?<!-)\bstone-[0-9]+/g);
		if (matches) {
			offenders.push({ file: fileUrl.pathname, matches: Array.from(new Set(matches)) });
		}
	}
	assert.deepEqual(offenders, [], `residual light-mode stone tokens:\n${JSON.stringify(offenders, null, 2)}`);
});
