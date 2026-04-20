import assert from "node:assert/strict";
import test from "node:test";
import { isVisiblePost } from "../src/utils/blog.ts";

type TestPost = { data: { draft?: boolean } };

const published: TestPost = { data: { draft: false } };
const draft: TestPost = { data: { draft: true } };

test("isVisiblePost returns true for a published post in a production build", () => {
	assert.equal(isVisiblePost(published as never, false), true);
});

test("isVisiblePost returns true for a published post in a dev build", () => {
	assert.equal(isVisiblePost(published as never, true), true);
});

test("isVisiblePost returns false for a draft post in a production build", () => {
	assert.equal(isVisiblePost(draft as never, false), false);
});

test("isVisiblePost returns true for a draft post in a dev build", () => {
	assert.equal(isVisiblePost(draft as never, true), true);
});
