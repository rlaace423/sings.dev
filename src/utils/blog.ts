import type { CollectionEntry } from "astro:content";
import type { Locale } from "../i18n/ui";

type BlogPost = CollectionEntry<"blog">;
const CJK_CHARACTERS_PER_MINUTE = 500;
const WORDS_PER_MINUTE = 220;
const CJK_CHARACTER_PATTERN =
	/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;

const stripMarkdownForReadingTime = (source: string) =>
	source
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/^\s*-\s+/gm, " ")
		.replace(/[*_~>#]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

export const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export const sortPostsByDate = (posts: BlogPost[]) =>
	[...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

export const matchesLocale = (id: string, locale: Locale) =>
	id.startsWith(`${locale}/`);

export const stripLocaleFromId = (id: string) =>
	id.split("/").slice(1).join("/");

export const getReadingTimeMinutes = (source: string) => {
	const cleaned = stripMarkdownForReadingTime(source);
	const cjkCharacters = cleaned.match(CJK_CHARACTER_PATTERN) ?? [];
	const latinWords = cleaned
		.replace(CJK_CHARACTER_PATTERN, " ")
		.split(/\s+/)
		.filter(Boolean);

	const estimatedMinutes =
		cjkCharacters.length / CJK_CHARACTERS_PER_MINUTE +
		latinWords.length / WORDS_PER_MINUTE;

	return Math.max(1, Math.ceil(estimatedMinutes));
};

export const formatReadingTime = (minutes: number, lang: Locale) =>
	lang === "ko" ? `${minutes}분 읽기` : `${minutes} min read`;

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
