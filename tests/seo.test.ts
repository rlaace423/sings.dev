import assert from "node:assert/strict";
import test from "node:test";
import { getLocalizedSeoUrls } from "../src/utils/seo.ts";

test("builds canonical and localized alternates for default-locale routes", () => {
	const seoUrls = getLocalizedSeoUrls("https://sings.dev", "/posts/first-post/");

	assert.equal(seoUrls.canonical, "https://sings.dev/posts/first-post/");
	assert.deepEqual(seoUrls.alternates, {
		ko: "https://sings.dev/posts/first-post/",
		en: "https://sings.dev/en/posts/first-post/",
	});
});

test("builds canonical and localized alternates for english routes", () => {
	const seoUrls = getLocalizedSeoUrls("https://sings.dev", "/en/about/");

	assert.equal(seoUrls.canonical, "https://sings.dev/en/about/");
	assert.deepEqual(seoUrls.alternates, {
		ko: "https://sings.dev/about/",
		en: "https://sings.dev/en/about/",
	});
});

test("maps localized home pages to the expected default and english URLs", () => {
	assert.deepEqual(getLocalizedSeoUrls("https://sings.dev", "/").alternates, {
		ko: "https://sings.dev/",
		en: "https://sings.dev/en/",
	});

	assert.deepEqual(getLocalizedSeoUrls("https://sings.dev", "/en/").alternates, {
		ko: "https://sings.dev/",
		en: "https://sings.dev/en/",
	});
});
