import type { CollectionEntry } from "astro:content";

type BlogPost = CollectionEntry<"blog">;

type SeriesItem = {
	post: BlogPost;
	order: number;
};

export type SeriesNavigation = {
	currentIndex: number;
	previousPost: BlogPost | null;
	nextPost: BlogPost | null;
	orderedItems: BlogPost[];
};

const sameSeries = (left: BlogPost, right: BlogPost) =>
	left.data.series?.slug === right.data.series?.slug;

const compareBySeriesOrder = (left: SeriesItem, right: SeriesItem) =>
	left.order - right.order ||
	left.post.id.localeCompare(right.post.id);

const getSharedTagCount = (left: BlogPost, right: BlogPost) => {
	const leftTags = new Set(left.data.tags ?? []);
	let shared = 0;

	for (const tag of right.data.tags ?? []) {
		if (leftTags.has(tag)) {
			shared += 1;
		}
	}

	return shared;
};

export const getSeriesNavigation = (
	posts: BlogPost[],
	currentPost: BlogPost,
): SeriesNavigation | null => {
	if (!currentPost.data.series) {
		return null;
	}

	const orderedItems = posts
		.filter((post) => sameSeries(post, currentPost))
		.map((post) => ({
			post,
			order: post.data.series!.order,
		}))
		.sort(compareBySeriesOrder)
		.map(({ post }) => post);

	const currentIndex = orderedItems.findIndex((post) => post.id === currentPost.id);

	if (currentIndex < 0) {
		return null;
	}

	return {
		currentIndex,
		previousPost: orderedItems[currentIndex - 1] ?? null,
		nextPost: orderedItems[currentIndex + 1] ?? null,
		orderedItems,
	};
};

export const getRelatedPosts = (
	posts: BlogPost[],
	currentPost: BlogPost,
	limit = 3,
) =>
	posts
		.filter((post) => post.id !== currentPost.id)
		.filter((post) =>
			currentPost.data.series ? !sameSeries(post, currentPost) : true,
		)
		.map((post) => {
			const sameCategory = post.data.category === currentPost.data.category ? 1 : 0;
			const sharedTags = getSharedTagCount(post, currentPost);

			return {
				post,
				sameCategory,
				sharedTags,
				date: post.data.pubDate.valueOf(),
			};
		})
		.filter(({ sameCategory, sharedTags }) => sameCategory > 0 || sharedTags > 0)
		.sort((left, right) => {
			return (
				right.sameCategory - left.sameCategory ||
				right.sharedTags - left.sharedTags ||
				right.date - left.date ||
				left.post.id.localeCompare(right.post.id)
			);
		})
		.slice(0, limit)
		.map(({ post }) => post);
