import assert from "node:assert/strict";
import test from "node:test";
import { formatReadingTime, getReadingTimeMinutes } from "../src/utils/blog.ts";

test("estimates English reading time using word count", () => {
	assert.equal(getReadingTimeMinutes("word ".repeat(221)), 2);
	assert.equal(getReadingTimeMinutes("word ".repeat(30)), 1);
});

test("estimates Korean reading time using CJK character count", () => {
	assert.equal(getReadingTimeMinutes("가".repeat(501)), 2);
	assert.equal(getReadingTimeMinutes("가".repeat(60)), 1);
});

test("formats localized reading-time labels", () => {
	assert.equal(formatReadingTime(7, "en"), "7 min read");
	assert.equal(formatReadingTime(7, "ko"), "7분 읽기");
});

test("ignores markdown syntax while preserving hyphenated prose", () => {
	const markdown = [
		"# Heading",
		"",
		"Intro with a [link text](https://example.com) and ![alt text](image.png).",
		"",
		"```ts",
		`${"code words should not count ".repeat(225)}`.trim(),
		"```",
		"",
		"Inline `code words should not count` but state-of-the-art stays one word.",
	].join("\n");

	const plainText = [
		"Heading",
		"",
		"Intro with a link text and alt text.",
		"",
		"Inline code words should not count but state-of-the-art stays one word.",
	].join("\n");

	assert.equal(getReadingTimeMinutes(markdown), getReadingTimeMinutes(plainText));
	assert.equal(getReadingTimeMinutes(markdown), 1);
});
