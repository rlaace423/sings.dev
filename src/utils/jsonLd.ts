/**
 * schema.org JSON-LD builders for sings.dev.
 *
 * Emitted from page templates via Layout's `jsonLd` prop. Each builder
 * returns a plain object that gets serialized into a
 * `<script type="application/ld+json">` block. Crawlers (Google, Bing,
 * Perplexity, LLM citations) use this to understand the page beyond what
 * they can scrape from prose.
 *
 * URI conventions — every entity that other entities reference gets a
 * stable `@id` URI so the graph links up cleanly:
 *   <site>/about/#person       → KO Person (Sam, 한국어 콘텐츠)
 *   <site>/en/about/#person    → EN Person
 *   <site>/#website-<lang>     → WebSite per locale
 *   <post-url>#article         → BlogPosting (self-referential)
 *
 * Both Person definitions point at each other via `sameAs` so crawlers
 * understand they're the same human in two languages.
 */

import type { CollectionEntry } from "astro:content";
import type { Locale } from "../i18n/ui";
import {
	categoryHref,
	getDisplayTitle,
	stripLocaleFromId,
	tagHref,
} from "./blog";

type BlogPost = CollectionEntry<"blog">;
type AboutIdentity = NonNullable<CollectionEntry<"pages">["data"]["identity"]>;

const LANG_TAG: Record<Locale, string> = {
	ko: "ko-KR",
	en: "en-US",
};

/**
 * Personal-blog "publisher" alias for the same human as the author.
 * Google's structured-data spec accepts Person as a publisher for
 * BlogPosting on personal sites.
 */

const aboutPath = (lang: Locale) => (lang === "ko" ? "/about/" : `/${lang}/about/`);
const homePath = (lang: Locale) => (lang === "ko" ? "/" : `/${lang}/`);

const absoluteUrl = (site: URL, path: string) => new URL(path, site).toString();

export const personId = (site: URL, lang: Locale) =>
	`${absoluteUrl(site, aboutPath(lang))}#person`;

const websiteId = (site: URL, lang: Locale) =>
	`${absoluteUrl(site, "/")}#website-${lang}`;

/** Strip mailto: links and other non-profile URLs from `sameAs`. */
const profileLinksOnly = (socials: AboutIdentity["socials"]) =>
	socials
		.map((s) => s.href)
		.filter((href) => /^https?:\/\//i.test(href));

export interface PersonOptions {
	identity: AboutIdentity;
	site: URL;
	lang: Locale;
	/** Other locales' Person `@id`s — emitted in `sameAs` so crawlers link them. */
	siblingPersonIds?: string[];
	/** Include education + experience. Full on /about, omitted on home. */
	fullProfile: boolean;
	/** Body description — `homeSummary` on home, `summary` on /about. */
	description: string;
}

export function buildPerson({
	identity,
	site,
	lang,
	siblingPersonIds = [],
	fullProfile,
	description,
}: PersonOptions) {
	const sameAs = [...profileLinksOnly(identity.socials), ...siblingPersonIds];

	const person: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "Person",
		"@id": personId(site, lang),
		name: identity.name,
		description,
		image: absoluteUrl(site, identity.photo.src),
		url: absoluteUrl(site, aboutPath(lang)),
		inLanguage: LANG_TAG[lang],
		sameAs,
	};

	if (fullProfile) {
		// Most-recent role first in `worksFor`. Schema.org accepts an array.
		person.worksFor = identity.experience.map((job) => ({
			"@type": "Organization",
			name: job.company,
		}));
		// Each role as a separate OrganizationRole gives Google more signal.
		person.hasOccupation = identity.experience.map((job) => ({
			"@type": "Role",
			roleName: job.role,
			startDate: job.start,
			endDate: job.end === "현재" || job.end === "Present" ? undefined : job.end,
		}));
		person.alumniOf = identity.education.map((edu) => ({
			"@type": "EducationalOrganization",
			name: edu.school,
			...(edu.degree ? { description: edu.degree } : {}),
		}));
	}

	return person;
}

export function buildWebSite(site: URL, lang: Locale, description: string) {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": websiteId(site, lang),
		url: absoluteUrl(site, homePath(lang)),
		name: "sings.dev",
		description,
		inLanguage: LANG_TAG[lang],
		publisher: { "@id": personId(site, lang) },
	};
}

export interface BlogPostingOptions {
	post: BlogPost;
	site: URL;
	lang: Locale;
	/** Absolute URL of the OG image for this post. */
	ogImageUrl: string;
}

export function buildBlogPosting({ post, site, lang, ogImageUrl }: BlogPostingOptions) {
	const slug = stripLocaleFromId(post.id);
	const postPath = lang === "ko" ? `/posts/${slug}/` : `/${lang}/posts/${slug}/`;
	const postUrl = absoluteUrl(site, postPath);
	const isoDate = post.data.pubDate.toISOString();

	const article: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		"@id": `${postUrl}#article`,
		headline: getDisplayTitle(post),
		description: post.data.description,
		datePublished: isoDate,
		// No separate `updatedDate` in the blog schema yet — mirror datePublished
		// so the field exists for crawlers that require it.
		dateModified: isoDate,
		inLanguage: LANG_TAG[lang],
		url: postUrl,
		mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
		image: ogImageUrl,
		author: { "@id": personId(site, lang) },
		publisher: { "@id": personId(site, lang) },
		articleSection: post.data.category,
	};

	if (post.data.tags && post.data.tags.length > 0) {
		article.keywords = post.data.tags.join(", ");
	}

	if (post.data.series) {
		article.isPartOf = {
			"@type": "CreativeWorkSeries",
			name: post.data.series.id,
			position: post.data.series.index,
		};
	}

	return article;
}

export interface BreadcrumbCrumb {
	name: string;
	url: string;
}

export function buildBreadcrumbList(crumbs: BreadcrumbCrumb[]) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: crumbs.map((crumb, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: crumb.name,
			item: crumb.url,
		})),
	};
}

const labels = {
	home: { ko: "홈", en: "Home" },
	posts: { ko: "포스트", en: "Posts" },
} as const;

const postsArchivePath = (lang: Locale) =>
	lang === "ko" ? "/posts/" : `/${lang}/posts/`;

const homeCrumb = (site: URL, lang: Locale): BreadcrumbCrumb => ({
	name: labels.home[lang],
	url: absoluteUrl(site, homePath(lang)),
});

const postsCrumb = (site: URL, lang: Locale): BreadcrumbCrumb => ({
	name: labels.posts[lang],
	url: absoluteUrl(site, postsArchivePath(lang)),
});

/** Breadcrumb for an individual post: home > posts > category > title. */
export function buildPostBreadcrumbs(
	post: BlogPost,
	site: URL,
	lang: Locale,
): BreadcrumbCrumb[] {
	const slug = stripLocaleFromId(post.id);
	const postPath = lang === "ko" ? `/posts/${slug}/` : `/${lang}/posts/${slug}/`;

	return [
		homeCrumb(site, lang),
		postsCrumb(site, lang),
		{
			name: post.data.category,
			url: absoluteUrl(site, categoryHref(post.data.category, lang)),
		},
		{ name: getDisplayTitle(post), url: absoluteUrl(site, postPath) },
	];
}

/** Breadcrumb for the archive index: home > posts. */
export function buildPostsIndexBreadcrumbs(site: URL, lang: Locale): BreadcrumbCrumb[] {
	return [homeCrumb(site, lang), postsCrumb(site, lang)];
}

/** Breadcrumb for a category page: home > posts > <category>. */
export function buildCategoryBreadcrumbs(
	category: string,
	site: URL,
	lang: Locale,
): BreadcrumbCrumb[] {
	return [
		homeCrumb(site, lang),
		postsCrumb(site, lang),
		{ name: category, url: absoluteUrl(site, categoryHref(category, lang)) },
	];
}

/**
 * Breadcrumb for a tag page: home > posts > #<tag>. The site has no
 * `/tags/` index, so the parent crumb is the posts archive instead.
 */
export function buildTagBreadcrumbs(
	tag: string,
	site: URL,
	lang: Locale,
): BreadcrumbCrumb[] {
	return [
		homeCrumb(site, lang),
		postsCrumb(site, lang),
		{ name: `#${tag}`, url: absoluteUrl(site, tagHref(tag, lang)) },
	];
}

export interface CollectionPageOptions {
	site: URL;
	lang: Locale;
	path: string;
	name: string;
	description: string;
	/** Optional post count — emitted as `numberOfItems` for richer signal. */
	numberOfItems?: number;
}

export function buildCollectionPage({
	site,
	lang,
	path,
	name,
	description,
	numberOfItems,
}: CollectionPageOptions) {
	const url = absoluteUrl(site, path);
	const page: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		"@id": `${url}#collection`,
		url,
		name,
		description,
		inLanguage: LANG_TAG[lang],
		isPartOf: { "@id": websiteId(site, lang) },
	};
	if (typeof numberOfItems === "number") {
		page.numberOfItems = numberOfItems;
	}
	return page;
}

/**
 * Serialize a JSON-LD object for safe embedding in <script>. Escapes
 * `<` to `<` so a literal `</script>` in any string field can't
 * close the tag early.
 */
export function serializeJsonLd(obj: unknown): string {
	return JSON.stringify(obj).replace(/</g, "\\u003c");
}
