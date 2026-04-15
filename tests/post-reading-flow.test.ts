import assert from "node:assert/strict";
import test from "node:test";
import type { CollectionEntry } from "astro:content";
import {
	getRelatedPosts,
	getSeriesNavigation,
} from "../src/utils/postReading.ts";

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
			title: id,
			pubDate: new Date("2026-01-01"),
			description: "desc",
			category: "Essay",
			...overrides,
		},
	} as BlogPost);

test("returns series navigation ordered by series order and centered on the current post", () => {
	const currentPost = makePost("en/current", {
		series: { id: "writing", index: 2, total: 3, subtitle: "Middle" },
	});
	const posts = [
		makePost("en/third", {
			series: { id: "writing", index: 3, total: 3, subtitle: "Closing" },
		}),
		makePost("en/current", {
			series: { id: "writing", index: 2, total: 3, subtitle: "Middle" },
		}),
		makePost("en/first", {
			series: { id: "writing", index: 1, total: 3, subtitle: "Opening" },
		}),
		makePost("en/unrelated", {
			series: { id: "other", index: 1, total: 1, subtitle: "Standalone" },
		}),
	];

	const navigation = getSeriesNavigation(posts, currentPost);

	assert.ok(navigation);
	assert.deepEqual(
		navigation.orderedItems.map((post) => post.id),
		["en/first", "en/current", "en/third"],
	);
	assert.equal(navigation.currentIndex, 1);
	assert.equal(navigation.previousPost?.id, "en/first");
	assert.equal(navigation.nextPost?.id, "en/third");
});

test("returns null series navigation for posts without series metadata", () => {
	const currentPost = makePost("en/standalone");
	const posts = [
		currentPost,
		makePost("en/other", {
			series: { id: "writing", index: 1, total: 2, subtitle: "Opening" },
		}),
	];

	assert.equal(getSeriesNavigation(posts, currentPost), null);
});

test("returns related posts ranked by category, tag overlap, and recency while excluding weak and series-matched candidates", () => {
	const currentPost = makePost("en/current", {
		category: "Essay",
		tags: ["astro", "notes"],
		pubDate: new Date("2026-01-10"),
		series: { id: "writing", index: 2, total: 3, subtitle: "Middle" },
	});
	const posts = [
		makePost("en/same-category-older", {
			category: "Essay",
			tags: ["misc"],
			pubDate: new Date("2026-01-01"),
		}),
		makePost("en/same-category-and-tag", {
			category: "Essay",
			tags: ["astro"],
			pubDate: new Date("2026-01-02"),
		}),
		makePost("en/different-category-tag-match", {
			category: "Notes",
			tags: ["notes"],
			pubDate: new Date("2026-01-03"),
		}),
		makePost("en/same-series-strong-match", {
			category: "Essay",
			tags: ["astro"],
			pubDate: new Date("2026-01-04"),
			series: { id: "writing", index: 1, total: 3, subtitle: "Opening" },
		}),
		makePost("en/no-match", {
			category: "Misc",
			tags: ["other"],
			pubDate: new Date("2026-01-05"),
		}),
		makePost("en/same-score-newer", {
			category: "Notes",
			tags: ["notes"],
			pubDate: new Date("2026-01-04"),
		}),
	];

	const relatedPosts = getRelatedPosts(posts, currentPost);

	assert.deepEqual(
		relatedPosts.map((post) => post.id),
		[
			"en/same-category-and-tag",
			"en/same-category-older",
			"en/same-score-newer",
		],
	);
	assert.ok(
		!relatedPosts.some((post) => post.id === "en/same-series-strong-match"),
	);
	assert.ok(!relatedPosts.some((post) => post.id === "en/no-match"));
});

test("respects the related post limit after scoring candidates", () => {
	const currentPost = makePost("en/current", {
		category: "Essay",
		tags: ["astro", "notes"],
	});
	const posts = [
		makePost("en/highest", {
			category: "Essay",
			tags: ["astro", "notes"],
			pubDate: new Date("2026-01-05"),
		}),
		makePost("en/second", {
			category: "Essay",
			tags: ["astro"],
			pubDate: new Date("2026-01-04"),
		}),
		makePost("en/third", {
			category: "Notes",
			tags: ["notes"],
			pubDate: new Date("2026-01-03"),
		}),
	];

	const relatedPosts = getRelatedPosts(posts, currentPost, 2);

	assert.deepEqual(
		relatedPosts.map((post) => post.id),
		["en/highest", "en/second"],
	);
});

test("normalizes tags before calculating related post overlap", () => {
	const currentPost = makePost("en/current", {
		category: "Notes",
		tags: [" Architecture ", "DOCS"],
	});
	const posts = [
		makePost("en/normalized-match", {
			category: "Other",
			tags: ["architecture", "docs"],
		}),
		makePost("en/no-match", {
			category: "Other",
			tags: ["backend"],
		}),
	];

	const relatedPosts = getRelatedPosts(posts, currentPost);

	assert.deepEqual(
		relatedPosts.map((post) => post.id),
		["en/normalized-match"],
	);
});

test("keeps series navigation and related posts within the current locale", () => {
	const currentPost = makePost("en/current", {
		category: "Essay",
		tags: ["astro"],
		series: { id: "writing", index: 2, total: 2, subtitle: "Middle" },
	});
	const posts = [
		currentPost,
		makePost("en/first", {
			series: { id: "writing", index: 1, total: 2, subtitle: "Opening" },
		}),
		makePost("ko/first", {
			series: { id: "writing", index: 1, total: 2, subtitle: "도입" },
		}),
		makePost("en/related", {
			category: "Essay",
			tags: ["astro"],
		}),
		makePost("ko/related", {
			category: "Essay",
			tags: ["astro"],
		}),
	];

	const navigation = getSeriesNavigation(posts, currentPost);
	const relatedPosts = getRelatedPosts(posts, currentPost);

	assert.deepEqual(
		navigation?.orderedItems.map((post) => post.id),
		["en/first", "en/current"],
	);
	assert.deepEqual(
		relatedPosts.map((post) => post.id),
		["en/related"],
	);
});

test("groups series navigation by series id even when subtitles differ", () => {
	const currentPost = makePost("en/current", {
		series: { id: "writing", index: 2, total: 3, subtitle: "Different subtitle" },
	});
	const posts = [
		makePost("en/first", {
			series: { id: "writing", index: 1, total: 3, subtitle: "Opening" },
		}),
		makePost("en/current", {
			series: { id: "writing", index: 2, total: 3, subtitle: "Different subtitle" },
		}),
		makePost("en/third", {
			series: { id: "writing", index: 3, total: 3, subtitle: "Closing" },
		}),
		makePost("en/other-series", {
			series: { id: "other", index: 1, total: 1, subtitle: "Unrelated" },
		}),
	];

	const navigation = getSeriesNavigation(posts, currentPost);

	assert.deepEqual(
		navigation?.orderedItems.map((post) => post.id),
		["en/first", "en/current", "en/third"],
	);
});
