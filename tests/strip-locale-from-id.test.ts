import assert from "node:assert/strict";
import test from "node:test";
import { stripLocaleFromId } from "../src/utils/blog.ts";

test("stripLocaleFromId strips the locale prefix for flat-file post IDs", () => {
	assert.equal(stripLocaleFromId("ko/first-post"), "first-post");
	assert.equal(stripLocaleFromId("en/first-post"), "first-post");
});

test("stripLocaleFromId strips the locale prefix AND a trailing /index for folder-form post IDs", () => {
	assert.equal(stripLocaleFromId("ko/first-post/index"), "first-post");
	assert.equal(stripLocaleFromId("en/first-post/index"), "first-post");
});

test("stripLocaleFromId preserves multi-segment slugs and only strips /index at the end", () => {
	assert.equal(stripLocaleFromId("ko/guides/routing"), "guides/routing");
	assert.equal(stripLocaleFromId("ko/guides/routing/index"), "guides/routing");
});

test("stripLocaleFromId does not strip index when it appears mid-slug", () => {
	assert.equal(stripLocaleFromId("ko/index-of-things"), "index-of-things");
	assert.equal(stripLocaleFromId("ko/index/other"), "index/other");
});
