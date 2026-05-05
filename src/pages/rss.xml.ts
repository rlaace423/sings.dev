import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import {
	getDisplayTitle,
	isVisiblePost,
	matchesLocale,
	sortPostsByDate,
	stripLocaleFromId,
} from "../utils/blog.ts";

export async function GET(context: APIContext) {
	const posts = await getCollection(
		"blog",
		(post) => matchesLocale(post.id, "ko") && isVisiblePost(post),
	);
	const sortedPosts = sortPostsByDate(posts);

	return rss({
		title: "sings.dev",
		description: "백엔드 아키텍처, MPC 시스템, 인프라 라우팅에 대한 글을 모아 둔 공간입니다.",
		site: context.site!,
		items: sortedPosts.map((post) => ({
			title: getDisplayTitle(post),
			pubDate: post.data.pubDate,
			description: post.data.description,
			link: `/posts/${stripLocaleFromId(post.id)}/`,
		})),
		customData: "<language>ko</language>",
	});
}
