import type { CollectionEntry } from "astro:content";
import type { Locale } from "../i18n/ui";

type BlogPost = CollectionEntry<"blog">;

export const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export const sortPostsByDate = (posts: BlogPost[]) =>
	[...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

export const matchesLocale = (id: string, locale: Locale) =>
	id.startsWith(`${locale}/`);

export const stripLocaleFromId = (id: string) =>
	id.split("/").slice(1).join("/");

export const slugifyTaxonomy = (value: string | null | undefined) =>
	(value ?? "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "untitled";

export const categoryHref = (category: string | null | undefined) =>
	`/category/${slugifyTaxonomy(category)}/`;

export const tagHref = (tag: string | null | undefined) =>
	`/tags/${slugifyTaxonomy(tag)}/`;

export const uniqueCategories = (posts: BlogPost[]) =>
	Array.from(
		new Set(
			posts
				.map((post) => post.data.category)
				.filter((category): category is string => Boolean(category)),
		),
	).sort((a, b) => a.localeCompare(b));

export const uniqueTags = (posts: BlogPost[]) =>
	Array.from(
		new Set(
			posts
				.flatMap((post) => post.data.tags ?? [])
				.filter((tag): tag is string => Boolean(tag)),
		),
	).sort((a, b) => a.localeCompare(b));
