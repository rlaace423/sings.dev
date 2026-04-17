import assert from "node:assert/strict";
import test from "node:test";
import { getCountLabel } from "../src/utils/blog.ts";

test("getCountLabel returns Korean wording with the post count", () => {
	assert.equal(getCountLabel(0, "ko"), "0개의 글");
	assert.equal(getCountLabel(1, "ko"), "1개의 글");
	assert.equal(getCountLabel(7, "ko"), "7개의 글");
});

test("getCountLabel uses singular English wording for exactly one post", () => {
	assert.equal(getCountLabel(1, "en"), "1 post");
});

test("getCountLabel uses plural English wording for zero and for more than one post", () => {
	assert.equal(getCountLabel(0, "en"), "0 posts");
	assert.equal(getCountLabel(4, "en"), "4 posts");
});
