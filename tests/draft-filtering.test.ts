import assert from "node:assert/strict";
import test from "node:test";
import {
	isVisiblePost,
	sortPostsByDate,
	uniqueCategories,
	uniqueTags,
} from "../src/utils/blog.ts";

type Fixture = {
	id: string;
	slug: string;
	body: string;
	collection: "blog";
	data: {
		title: string;
		pubDate: Date;
		description: string;
		category: string;
		tags?: string[];
		draft?: boolean;
	};
};

const makePost = (id: string, overrides: Partial<Fixture["data"]> = {}): Fixture => ({
	id,
	slug: id.split("/").at(-1) ?? id,
	body: "",
	collection: "blog",
	data: {
		title: `Title for ${id}`,
		pubDate: new Date("2026-04-10T00:00:00.000Z"),
		description: "",
		category: "backend",
		tags: ["astro"],
		draft: false,
		...overrides,
	},
});

const fixtures: Fixture[] = [
	makePost("ko/first"),
	makePost("ko/second", {
		category: "mpc",
		tags: ["mpc", "cryptography"],
		pubDate: new Date("2026-04-12T00:00:00.000Z"),
	}),
	makePost("ko/draft-only", {
		category: "draft-secret",
		tags: ["private-wip"],
		pubDate: new Date("2026-04-15T00:00:00.000Z"),
		draft: true,
	}),
];

test("production filtering drops the draft post from the visible list", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, false));
	const ids = visible.map((post) => post.id);
	assert.deepEqual(ids.sort(), ["ko/first", "ko/second"]);
});

test("dev filtering keeps the draft post in the visible list", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, true));
	const ids = visible.map((post) => post.id);
	assert.deepEqual(ids.sort(), ["ko/draft-only", "ko/first", "ko/second"]);
});

test("sortPostsByDate on the prod-filtered list never surfaces the draft post", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, false));
	const sorted = sortPostsByDate(visible as never);
	assert.ok(sorted.every((post) => post.id !== "ko/draft-only"));
});

test("uniqueCategories on the prod-filtered list never surfaces the draft's category", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, false));
	const categories = uniqueCategories(visible as never);
	assert.ok(!categories.includes("draft-secret"));
});

test("uniqueTags on the prod-filtered list never surfaces the draft's tags", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, false));
	const tags = uniqueTags(visible as never);
	assert.ok(!tags.includes("private-wip"));
});

test("uniqueCategories on the dev-filtered list does include the draft's category", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, true));
	const categories = uniqueCategories(visible as never);
	assert.ok(categories.includes("draft-secret"));
});
