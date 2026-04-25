import assert from "node:assert/strict";
import test from "node:test";

import {
	getArchiveBrowseConfig,
	getCategoryDescription,
} from "../src/data/archiveBrowse.ts";
import { getTopTagsForPosts, normalizeTaxonomyTags } from "../src/utils/blog.ts";

test("returns locale-aware browse metadata", () => {
	const ko = getArchiveBrowseConfig("ko");
	const en = getArchiveBrowseConfig("en");

	assert.ok(ko.categoryDescriptions);
	assert.ok(en.categoryDescriptions);
	assert.equal(
		getCategoryDescription("ko", "Development"),
		"구현과 설계의 선택을 차분하게 풀어낸 글입니다.",
	);
	assert.equal(
		getCategoryDescription("en", "Development"),
		"Notes on implementation choices and system design.",
	);
});

test("returns an empty description for unknown categories", () => {
	assert.equal(getCategoryDescription("ko", "Unknown"), "");
});

test("orders top tags by frequency and then alphabetically", () => {
	const posts = [
		{ data: { tags: ["astro", "docs"] } },
		{ data: { tags: ["astro", "architecture"] } },
		{ data: { tags: ["docs"] } },
	] as any;

	assert.deepEqual(getTopTagsForPosts(posts, 3), [
		"astro",
		"docs",
		"architecture",
	]);
});

test("limits related tags to the requested amount", () => {
	const posts = [
		{ data: { tags: ["architecture"] } },
		{ data: { tags: ["docs"] } },
		{ data: { tags: ["operations"] } },
		{ data: { tags: ["essay"] } },
	] as any;

	assert.deepEqual(getTopTagsForPosts(posts, 2), ["architecture", "docs"]);
});

test("normalizes tags before counting top tags", () => {
	const posts = [
		{ data: { tags: ["astro", ""] } },
		{ data: { tags: ["Astro", "docs"] } },
		{ data: { tags: ["DOCS", "   "] } },
	] as any;

	assert.deepEqual(getTopTagsForPosts(posts, 5), ["astro", "docs"]);
});

test("normalizes taxonomy tag lists before consumers compare them", () => {
	assert.deepEqual(normalizeTaxonomyTags([" Architecture ", "DOCS", "", "  "]), [
		"architecture",
		"docs",
	]);
});

test("deduplicates normalized taxonomy tag lists", () => {
	assert.deepEqual(
		normalizeTaxonomyTags(["DOCS", "docs", " Docs ", "architecture"]),
		["docs", "architecture"],
	);
});
