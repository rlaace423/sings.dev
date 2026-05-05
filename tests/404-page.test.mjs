import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../src/pages/404.astro", import.meta.url);

test("404 page renders Korean and English sections so a single static 404.html serves both locales", async () => {
	const page = await readFile(pageUrl, "utf8");

	assert.match(page, /페이지를 찾을 수 없습니다\./, "Korean headline must be present");
	assert.match(page, /Page not found\./, "English headline must be present");
	assert.match(page, /<h1[^>]*>\s*페이지를 찾을 수 없습니다/, "Korean message must be the h1 (page lang defaults to ko)");
	assert.match(page, /<h2[^>]*>\s*Page not found/, "English message must be the h2 alternate");
	assert.match(page, /<section[^>]*\blang="en"/, "English section must declare lang=en for screen readers");
});

test("404 page links each locale back to its own home", async () => {
	const page = await readFile(pageUrl, "utf8");

	assert.match(page, /href="\/"[^>]*>\s*홈으로 돌아가기/, "Korean section links to /");
	assert.match(page, /href="\/en\/"[^>]*>\s*Back to the home page/, "English section links to /en/");
});

test("404 page passes a localized title to Layout so the tab title stays sensible in either browser locale", async () => {
	const page = await readFile(pageUrl, "utf8");

	assert.match(page, /ko: "404 — 페이지를 찾을 수 없습니다/);
	assert.match(page, /en: "404 — Page not found/);
});
