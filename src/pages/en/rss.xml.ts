import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import {
	getDisplayTitle,
	isVisiblePost,
	matchesLocale,
	sortPostsByDate,
	stripLocaleFromId,
} from "../../utils/blog.ts";

export async function GET(context: APIContext) {
	const posts = await getCollection(
		"blog",
		(post) => matchesLocale(post.id, "en") && isVisiblePost(post),
	);
	const sortedPosts = sortPostsByDate(posts);

	return rss({
		title: "sings.dev",
		description: "Notes on backend architecture, MPC systems, and infrastructure routing.",
		site: context.site!,
		items: sortedPosts.map((post) => ({
			title: getDisplayTitle(post),
			pubDate: post.data.pubDate,
			description: post.data.description,
			link: `/en/posts/${stripLocaleFromId(post.id)}/`,
		})),
		customData: "<language>en</language>",
	});
}
