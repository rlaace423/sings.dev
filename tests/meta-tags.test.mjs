import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutUrl = new URL("../src/layouts/Layout.astro", import.meta.url);
const koPostUrl = new URL("../src/pages/posts/[...slug].astro", import.meta.url);
const enPostUrl = new URL("../src/pages/en/posts/[...slug].astro", import.meta.url);

test("layout emits OpenGraph meta tags driven by the resolved title, description, type, locale, and canonical URL", async () => {
	const layout = await readFile(layoutUrl, "utf8");

	assert.match(layout, /<meta property="og:title" content=\{resolvedTitle\}/);
	assert.match(layout, /<meta property="og:description" content=\{resolvedDescription\}/);
	assert.match(layout, /<meta property="og:type" content=\{ogType\}/);
	assert.match(layout, /<meta property="og:site_name" content="sings\.dev"/);
	assert.match(layout, /<meta property="og:locale" content=\{ogLocale\}/);
	assert.match(layout, /seoUrls && <meta property="og:url" content=\{seoUrls\.canonical\}/);
});

test("layout emits Twitter Card meta tags as a text-only summary card", async () => {
	const layout = await readFile(layoutUrl, "utf8");

	assert.match(layout, /<meta name="twitter:card" content="summary"/);
	assert.match(layout, /<meta name="twitter:title" content=\{resolvedTitle\}/);
	assert.match(layout, /<meta name="twitter:description" content=\{resolvedDescription\}/);
});

test("layout exposes an ogType prop that defaults to website and computes ogLocale from lang", async () => {
	const layout = await readFile(layoutUrl, "utf8");

	assert.match(layout, /ogType\?: "website" \| "article";/);
	assert.match(layout, /ogType = "website",/);
	assert.match(layout, /const ogLocale = lang === "ko" \? "ko_KR" : "en_US";/);
});

test("post detail pages opt into og:type=article on both locales", async () => {
	const koPost = await readFile(koPostUrl, "utf8");
	const enPost = await readFile(enPostUrl, "utf8");

	assert.match(koPost, /ogType="article"/);
	assert.match(enPost, /ogType="article"/);
});
