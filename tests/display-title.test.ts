import assert from "node:assert/strict";
import test from "node:test";
import type { CollectionEntry } from "astro:content";
import { getDisplayTitle, getSeriesListLabel } from "../src/utils/blog.ts";

type BlogPost = CollectionEntry<"blog">;

const makePost = (
	id: string,
	overrides: Partial<BlogPost["data"]> = {},
): BlogPost =>
	({
		id,
		slug: id.split("/").at(-1) ?? id,
		body: "",
		collection: "blog",
		data: {
			title: "Default Title",
			pubDate: new Date("2026-01-01"),
			description: "desc",
			category: "Essay",
			...overrides,
		},
	} as BlogPost);

test("getDisplayTitle returns the post title for a non-series post", () => {
	const post = makePost("en/plain", {
		title: "A standalone post",
	});

	assert.equal(getDisplayTitle(post), "A standalone post");
});

test("getDisplayTitle formats a series post as title and position", () => {
	const post = makePost("en/series", {
		title: "Series chapter",
		series: {
			id: "writing-series",
			index: 2,
			total: 5,
		},
	});

	assert.equal(getDisplayTitle(post), "Series chapter (2/5)");
});

test("getDisplayTitle appends the subtitle when present", () => {
	const post = makePost("en/series-with-subtitle", {
		title: "Series chapter",
		series: {
			id: "writing-series",
			index: 2,
			total: 5,
			subtitle: "Finding the right angle",
		},
	});

	assert.equal(getDisplayTitle(post), "Series chapter (2/5): Finding the right angle");
});

test("getSeriesListLabel prefers subtitle and falls back to the title", () => {
	const withSubtitle = makePost("en/series-with-subtitle", {
		title: "Series chapter",
		series: {
			id: "writing-series",
			index: 2,
			total: 5,
			subtitle: "Finding the right angle",
		},
	});
	const withoutSubtitle = makePost("en/series-without-subtitle", {
		title: "Series chapter",
		series: {
			id: "writing-series",
			index: 2,
			total: 5,
		},
	});

	assert.equal(getSeriesListLabel(withSubtitle), "2/5: Finding the right angle");
	assert.equal(getSeriesListLabel(withoutSubtitle), "2/5: Series chapter");
});
