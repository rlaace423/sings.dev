import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayTitle, getSeriesListLabel } from "../src/utils/blog.ts";

test("getDisplayTitle returns the post title for a non-series post", () => {
	const post = {
		data: {
			title: "A standalone post",
		},
	} as any;

	assert.equal(getDisplayTitle(post), "A standalone post");
});

test("getDisplayTitle formats a series post as title and position", () => {
	const post = {
		data: {
			title: "Series chapter",
			series: {
				id: "writing-series",
				index: 2,
				total: 5,
			},
		},
	} as any;

	assert.equal(getDisplayTitle(post), "Series chapter (2/5)");
});

test("getDisplayTitle appends the subtitle when present", () => {
	const post = {
		data: {
			title: "Series chapter",
			series: {
				id: "writing-series",
				index: 2,
				total: 5,
				subtitle: "Finding the right angle",
			},
		},
	} as any;

	assert.equal(getDisplayTitle(post), "Series chapter (2/5): Finding the right angle");
});

test("getSeriesListLabel prefers subtitle and falls back to the title", () => {
	const withSubtitle = {
		data: {
			title: "Series chapter",
			series: {
				id: "writing-series",
				index: 2,
				total: 5,
				subtitle: "Finding the right angle",
			},
		},
	} as any;
	const withoutSubtitle = {
		data: {
			title: "Series chapter",
			series: {
				id: "writing-series",
				index: 2,
				total: 5,
			},
		},
	} as any;

	assert.equal(getSeriesListLabel(withSubtitle), "2/5: Finding the right angle");
	assert.equal(getSeriesListLabel(withoutSubtitle), "2/5: Series chapter");
});
