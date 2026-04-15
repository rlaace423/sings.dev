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
		series: { slug: "writing", title: "Writing", order: 2 },
	});
	const posts = [
		makePost("en/third", { series: { slug: "writing", title: "Writing", order: 3 } }),
		makePost("en/current", {
			series: { slug: "writing", title: "Writing", order: 2 },
		}),
		makePost("en/first", { series: { slug: "writing", title: "Writing", order: 1 } }),
		makePost("en/unrelated", { series: { slug: "other", title: "Other", order: 1 } }),
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

test("returns related posts ranked by category, tag overlap, and recency while excluding weak and series-matched candidates", () => {
	const currentPost = makePost("en/current", {
		category: "Essay",
		tags: ["astro", "notes"],
		pubDate: new Date("2026-01-10"),
		series: { slug: "writing", title: "Writing", order: 2 },
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
			series: { slug: "writing", title: "Writing", order: 1 },
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
});
