# Post Reading Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calm bottom-of-post reading flow with explicit series navigation for series posts, related-reading links for all posts, and one dummy series post example.

**Architecture:** Introduce an optional `series` frontmatter object in the blog schema, add focused helper logic for series navigation and related-post scoring, then render the result through dedicated post-reading components in both localized detail pages. Keep the UI text-first and place it between the article body and the author/comments footer.

**Tech Stack:** Astro, Astro Content Collections, Tailwind CSS, vanilla TypeScript/JavaScript, Node test runner, Astro compiler/container render tests

---

## File Structure

### Create

- `src/utils/postReading.ts`
  - Series-navigation and related-reading helpers for blog posts
- `src/components/PostSeriesNav.astro`
  - Quiet series navigation block for series posts
- `src/components/RelatedReading.astro`
  - Quiet related-reading list for all posts
- `src/components/PostReadingFlow.astro`
  - Shared wrapper that renders the optional series block and common related-reading block
- `src/content/blog/ko/routing-story-start.md`
  - Dummy Korean post that demonstrates the `series` frontmatter shape
- `tests/post-reading-flow.test.ts`
  - Logic tests for series sequencing and related-post selection
- `tests/post-reading-flow-structure.test.mjs`
  - Render/structure tests for the new components and page wiring

### Modify

- `src/content/config.ts`
  - Extend blog frontmatter schema with optional `series`
- `src/pages/posts/[...slug].astro`
  - Compute and render Korean post reading flow
- `src/pages/en/posts/[...slug].astro`
  - Compute and render English post reading flow
- `docs/spec-posts.md`
  - Document optional `series` frontmatter
- `docs/spec-post-detail.md`
  - Document series navigation and related-reading placement

### Intentionally Unchanged In This Iteration

- `src/pages/posts/index.astro`
- `src/pages/en/posts/index.astro`
- `src/pages/category/[category].astro`
- `src/pages/en/category/[category].astro`
- `src/components/SearchModal.astro`

This iteration is focused on post-detail reading flow only. Archive, taxonomy, and search behavior should remain untouched.

---

### Task 1: Add Series Schema And Reading-Flow Helpers

**Files:**
- Create: `src/utils/postReading.ts`
- Modify: `src/content/config.ts`
- Test: `tests/post-reading-flow.test.ts`

- [ ] **Step 1: Write the failing helper tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { getRelatedPosts, getSeriesNavigation } from "../src/utils/postReading.ts";

const makePost = ({
	id,
	title,
	pubDate,
	category = "Development",
	tags = [],
	series,
}: {
	id: string;
	title: string;
	pubDate: string;
	category?: string;
	tags?: string[];
	series?: { slug: string; title: string; order: number };
}) =>
	({
		id,
		data: {
			title,
			pubDate: new Date(pubDate),
			description: `${title} description`,
			category,
			tags,
			...(series ? { series } : {}),
		},
	}) as any;

test("builds ordered series navigation with previous and next posts", () => {
	const posts = [
		makePost({
			id: "ko/routing-story-1.md",
			title: "Routing Story (1)",
			pubDate: "2026-04-01",
			series: { slug: "routing-story", title: "라우팅 이야기", order: 1 },
		}),
		makePost({
			id: "ko/routing-story-3.md",
			title: "Routing Story (3)",
			pubDate: "2026-04-03",
			series: { slug: "routing-story", title: "라우팅 이야기", order: 3 },
		}),
		makePost({
			id: "ko/routing-story-2.md",
			title: "Routing Story (2)",
			pubDate: "2026-04-02",
			series: { slug: "routing-story", title: "라우팅 이야기", order: 2 },
		}),
	];

	const navigation = getSeriesNavigation(posts, posts[2]);

	assert.equal(navigation?.title, "라우팅 이야기");
	assert.equal(navigation?.currentOrder, 2);
	assert.equal(navigation?.total, 3);
	assert.equal(navigation?.previous?.id, "ko/routing-story-1.md");
	assert.equal(navigation?.next?.id, "ko/routing-story-3.md");
	assert.deepEqual(
		navigation?.items.map((post: any) => post.id),
		["ko/routing-story-1.md", "ko/routing-story-2.md", "ko/routing-story-3.md"],
	);
});

test("returns null series navigation for non-series posts", () => {
	const posts = [
		makePost({
			id: "ko/standalone.md",
			title: "Standalone",
			pubDate: "2026-04-01",
		}),
	];

	assert.equal(getSeriesNavigation(posts, posts[0]), null);
});

test("scores related posts by category and shared tags while excluding the current post and same-series posts", () => {
	const current = makePost({
		id: "ko/current.md",
		title: "Current",
		pubDate: "2026-04-10",
		category: "Development",
		tags: ["routing", "Architecture"],
		series: { slug: "routing-story", title: "라우팅 이야기", order: 2 },
	});
	const sameSeries = makePost({
		id: "ko/routing-story-3.md",
		title: "Routing Story (3)",
		pubDate: "2026-04-11",
		category: "Development",
		tags: ["routing", "architecture"],
		series: { slug: "routing-story", title: "라우팅 이야기", order: 3 },
	});
	const strong = makePost({
		id: "ko/strong.md",
		title: "Strong Match",
		pubDate: "2026-04-09",
		category: "Development",
		tags: ["routing"],
	});
	const medium = makePost({
		id: "ko/medium.md",
		title: "Medium Match",
		pubDate: "2026-04-08",
		category: "Development",
		tags: [],
	});
	const weak = makePost({
		id: "ko/weak.md",
		title: "Weak Match",
		pubDate: "2026-04-12",
		category: "Operations",
		tags: ["architecture"],
	});

	const related = getRelatedPosts(
		[current, sameSeries, strong, medium, weak],
		current,
		3,
	);

	assert.deepEqual(
		related.map((post: any) => post.id),
		["ko/strong.md", "ko/medium.md", "ko/weak.md"],
	);
});
```

- [ ] **Step 2: Run the targeted helper test to verify it fails**

Run: `npm test -- tests/post-reading-flow.test.ts`

Expected: FAIL because `src/utils/postReading.ts` does not exist and the blog schema does not support `series`

- [ ] **Step 3: Extend the blog schema and add the helper module**

```ts
// src/content/config.ts
const blog = defineCollection({
	loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		category: z.string(),
		tags: z.array(z.string()).optional(),
		series: z
			.object({
				slug: z.string(),
				title: z.string(),
				order: z.number().int().positive(),
			})
			.optional(),
	}),
});
```

```ts
// src/utils/postReading.ts
import type { CollectionEntry } from "astro:content";

import { normalizeTaxonomyTags } from "./blog";

type BlogPost = CollectionEntry<"blog">;

export interface SeriesNavigationData {
	title: string;
	currentOrder: number;
	total: number;
	previous: BlogPost | null;
	next: BlogPost | null;
	items: BlogPost[];
}

const getSeriesSlug = (post: BlogPost) => post.data.series?.slug ?? null;

const getSortedSeriesPosts = (posts: BlogPost[], slug: string) =>
	[...posts]
		.filter((post) => post.data.series?.slug === slug)
		.sort(
			(a, b) =>
				(a.data.series?.order ?? Number.MAX_SAFE_INTEGER) -
				(b.data.series?.order ?? Number.MAX_SAFE_INTEGER),
		);

export const getSeriesNavigation = (
	posts: BlogPost[],
	currentPost: BlogPost,
): SeriesNavigationData | null => {
	const currentSeries = currentPost.data.series;
	if (!currentSeries) return null;

	const items = getSortedSeriesPosts(posts, currentSeries.slug);
	const currentIndex = items.findIndex((post) => post.id === currentPost.id);
	if (currentIndex === -1) return null;

	return {
		title: currentSeries.title,
		currentOrder: currentSeries.order,
		total: items.length,
		previous: items[currentIndex - 1] ?? null,
		next: items[currentIndex + 1] ?? null,
		items,
	};
};

export const getRelatedPosts = (
	posts: BlogPost[],
	currentPost: BlogPost,
	limit = 3,
) => {
	const currentSeriesSlug = getSeriesSlug(currentPost);
	const currentTags = new Set(normalizeTaxonomyTags(currentPost.data.tags ?? []));

	return posts
		.filter((post) => post.id !== currentPost.id)
		.filter((post) => {
			if (!currentSeriesSlug) return true;
			return post.data.series?.slug !== currentSeriesSlug;
		})
		.map((post) => {
			const candidateTags = normalizeTaxonomyTags(post.data.tags ?? []);
			const sharedTags = candidateTags.filter((tag) => currentTags.has(tag)).length;
			const sameCategory = post.data.category === currentPost.data.category ? 10 : 0;
			const score = sameCategory + sharedTags * 3;

			return { post, score };
		})
		.filter(({ score }) => score > 0)
		.sort(
			(a, b) =>
				b.score - a.score ||
				b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf() ||
				a.post.data.title.localeCompare(b.post.data.title),
		)
		.slice(0, limit)
		.map(({ post }) => post);
};
```

- [ ] **Step 4: Run the targeted helper test to verify it passes**

Run: `npm test -- tests/post-reading-flow.test.ts`

Expected: PASS with `3` passing tests

- [ ] **Step 5: Commit**

```bash
git add src/content/config.ts src/utils/postReading.ts tests/post-reading-flow.test.ts
git commit -m "feat: add post reading helpers"
```

---

### Task 2: Add Post Reading Components

**Files:**
- Create: `src/components/PostSeriesNav.astro`
- Create: `src/components/RelatedReading.astro`
- Create: `src/components/PostReadingFlow.astro`
- Test: `tests/post-reading-flow-structure.test.mjs`

- [ ] **Step 1: Write the failing component render tests**

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderAstroComponent(sourceUrl, props, replacements = []) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "post-reading-flow-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const componentPath = join(tempDir, "component.ts");

	try {
		await writeFile(
			runtimeStubPath,
			[
				`export * from ${JSON.stringify(astroRuntimeUrl)};`,
				"export const createMetadata = () => ({})",
				"",
			].join("\n"),
		);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);

		for (const { find, replaceWith } of replacements) {
			rewritten = rewritten.replaceAll(find, replaceWith);
		}

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();
		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

test("series navigation renders current position, adjacent links, and ordered items", async () => {
	const sourceUrl = new URL("../src/components/PostSeriesNav.astro", import.meta.url);
	const rendered = await renderAstroComponent(sourceUrl, {
		lang: "en",
		title: "Routing Story",
		positionLabel: "2 / 3",
		previous: { href: "/en/posts/routing-story-1", title: "Routing Story (1)" },
		next: { href: "/en/posts/routing-story-3", title: "Routing Story (3)" },
		items: [
			{ href: "/en/posts/routing-story-1", title: "Routing Story (1)", order: 1, isCurrent: false },
			{ href: "/en/posts/routing-story-2", title: "Routing Story (2)", order: 2, isCurrent: true },
			{ href: "/en/posts/routing-story-3", title: "Routing Story (3)", order: 3, isCurrent: false },
		],
	}, [{ find: "../i18n/ui", replaceWith: repoUiUrl }]);

	assert.match(rendered, /In This Series/);
	assert.match(rendered, /2 \/ 3/);
	assert.match(rendered, /Routing Story \(1\)/);
	assert.match(rendered, /Routing Story \(3\)/);
});

test("related reading renders a quiet text-first list", async () => {
	const sourceUrl = new URL("../src/components/RelatedReading.astro", import.meta.url);
	const rendered = await renderAstroComponent(sourceUrl, {
		lang: "ko",
		posts: [
			{
				href: "/posts/service-boundaries",
				title: "서비스 경계를 다시 보는 법",
				description: "경계를 다시 정리하는 간단한 메모입니다.",
			},
		],
	}, [{ find: "../i18n/ui", replaceWith: repoUiUrl }]);

	assert.match(rendered, /다음 읽을거리/);
	assert.match(rendered, /서비스 경계를 다시 보는 법/);
	assert.match(rendered, /경계를 다시 정리하는 간단한 메모입니다\./);
});

test("post reading flow source keeps a single top-level content guard", async () => {
	const source = await readFile(
		new URL("../src/components/PostReadingFlow.astro", import.meta.url),
		"utf8",
	);

	assert.match(source, /const hasContent = Boolean\(series\) \|\| relatedPosts\.length > 0;/);
	assert.match(source, /hasContent \? \(/);
	assert.match(source, /<PostSeriesNav lang=\{lang\} \{\.\.\.series\} \/>/);
	assert.match(source, /<RelatedReading lang=\{lang\} posts=\{relatedPosts\} \/>/);
});
```

- [ ] **Step 2: Run the targeted structure test to verify it fails**

Run: `npm test -- tests/post-reading-flow-structure.test.mjs`

Expected: FAIL because the new components do not exist yet

- [ ] **Step 3: Create the post-reading components**

```astro
--- src/components/PostSeriesNav.astro
import { defaultLocale, type Locale, isLocale } from "../i18n/ui";

interface LinkItem {
	href: string;
	title: string;
}

interface SeriesItem extends LinkItem {
	order: number;
	isCurrent: boolean;
}

interface Props {
	lang?: Locale;
	title: string;
	positionLabel: string;
	previous?: LinkItem | null;
	next?: LinkItem | null;
	items: SeriesItem[];
}

const { lang: langProp, title, positionLabel, previous = null, next = null, items } = Astro.props as Props;
const lang = isLocale(langProp) ? langProp : defaultLocale;
const eyebrow = lang === "ko" ? "이 시리즈" : "In This Series";
const previousLabel = lang === "ko" ? "이전 글" : "Previous";
const nextLabel = lang === "ko" ? "다음 글" : "Next";
---

<section class="space-y-5">
	<div class="space-y-1">
		<p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">{eyebrow}</p>
		<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
			<h2 class="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">{title}</h2>
			<p class="text-sm text-stone-500 dark:text-stone-400">{positionLabel}</p>
		</div>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		{previous ? (
			<a href={previous.href} class="block rounded-2xl border border-stone-200 px-4 py-4 dark:border-stone-800">
				<p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">{previousLabel}</p>
				<p class="mt-2 text-base font-medium text-stone-900 dark:text-stone-100">{previous.title}</p>
			</a>
		) : <div />}
		{next ? (
			<a href={next.href} class="block rounded-2xl border border-stone-200 px-4 py-4 dark:border-stone-800">
				<p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">{nextLabel}</p>
				<p class="mt-2 text-base font-medium text-stone-900 dark:text-stone-100">{next.title}</p>
			</a>
		) : <div />}
	</div>

	<ol class="space-y-2">
		{items.map((item) => (
			<li>
				<a href={item.href} class:list={["block text-sm leading-7 transition-colors", item.isCurrent ? "font-semibold text-stone-950 dark:text-stone-50" : "text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-50"]}>
					{item.order}. {item.title}
				</a>
			</li>
		))}
	</ol>
</section>
```

```astro
--- src/components/RelatedReading.astro
import { defaultLocale, type Locale, isLocale } from "../i18n/ui";

interface RelatedPost {
	href: string;
	title: string;
	description: string;
}

interface Props {
	lang?: Locale;
	posts: RelatedPost[];
}

const { lang: langProp, posts } = Astro.props as Props;
const lang = isLocale(langProp) ? langProp : defaultLocale;
const eyebrow = lang === "ko" ? "다음 읽을거리" : "Keep Reading";
---

<section class="space-y-4">
	<div class="space-y-1">
		<p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">{eyebrow}</p>
	</div>

	<ul class="divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800">
		{posts.map((post) => (
			<li class="py-5">
				<a href={post.href} class="block space-y-2">
					<h2 class="text-lg font-semibold tracking-tight text-stone-950 dark:text-stone-50">{post.title}</h2>
					<p class="max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300">{post.description}</p>
				</a>
			</li>
		))}
	</ul>
</section>
```

```astro
--- src/components/PostReadingFlow.astro
import { defaultLocale, type Locale, isLocale } from "../i18n/ui";
import PostSeriesNav from "./PostSeriesNav.astro";
import RelatedReading from "./RelatedReading.astro";

interface LinkItem {
	href: string;
	title: string;
}

interface SeriesItem extends LinkItem {
	order: number;
	isCurrent: boolean;
}

interface SeriesNavData {
	title: string;
	positionLabel: string;
	previous?: LinkItem | null;
	next?: LinkItem | null;
	items: SeriesItem[];
}

interface RelatedPost {
	href: string;
	title: string;
	description: string;
}

interface Props {
	lang?: Locale;
	series?: SeriesNavData | null;
	relatedPosts: RelatedPost[];
}

const { lang: langProp, series = null, relatedPosts } = Astro.props as Props;
const lang = isLocale(langProp) ? langProp : defaultLocale;
const hasContent = Boolean(series) || relatedPosts.length > 0;
---

{
	hasContent ? (
		<section class="mt-16 space-y-10 border-t border-stone-200 pt-10 dark:border-stone-800">
			{series ? <PostSeriesNav lang={lang} {...series} /> : null}
			{relatedPosts.length > 0 ? <RelatedReading lang={lang} posts={relatedPosts} /> : null}
		</section>
	) : null
}
```

- [ ] **Step 4: Run the targeted structure test to verify it passes**

Run: `npm test -- tests/post-reading-flow-structure.test.mjs`

Expected: PASS with `3` passing tests

- [ ] **Step 5: Commit**

```bash
git add src/components/PostSeriesNav.astro src/components/RelatedReading.astro src/components/PostReadingFlow.astro tests/post-reading-flow-structure.test.mjs
git commit -m "feat: add post reading components"
```

---

### Task 3: Wire Post Reading Flow Into Detail Pages And Add Dummy Series Content

**Files:**
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/pages/en/posts/[...slug].astro`
- Modify: `tests/post-reading-flow-structure.test.mjs`
- Create: `src/content/blog/ko/routing-story-start.md`

- [ ] **Step 1: Extend the structure test with failing page-wiring assertions**

```js
test("detail pages wire post reading flow above author and comments", async () => {
	const koPage = await readFile(new URL("../src/pages/posts/[...slug].astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/posts/[...slug].astro", import.meta.url), "utf8");

	for (const page of [koPage, enPage]) {
		assert.match(page, /import PostReadingFlow from .*\/components\/PostReadingFlow\.astro";/);
		assert.match(page, /const localePosts = sortPostsByDate\(/);
		assert.match(page, /const seriesNavigation = getSeriesNavigation\(localePosts, post\);/);
		assert.match(page, /const relatedPosts = getRelatedPosts\(localePosts, post, 3\);/);
		assert.ok(
			page.indexOf("<PostReadingFlow") < page.indexOf("<AuthorProfile"),
			"Post reading flow should appear before the footer components",
		);
	}
});
```

- [ ] **Step 2: Run the targeted structure test to verify it fails**

Run: `npm test -- tests/post-reading-flow-structure.test.mjs`

Expected: FAIL because detail pages do not import or render `PostReadingFlow` yet

- [ ] **Step 3: Wire the reading flow into both detail pages and add the dummy post**

```ts
// src/pages/posts/[...slug].astro
import { getRelativeLocaleUrl } from "astro:i18n";
import { getCollection, render } from "astro:content";
import AuthorProfile from "../../components/AuthorProfile.astro";
import Comments from "../../components/Comments.astro";
import PostHeader from "../../components/PostHeader.astro";
import PostReadingFlow from "../../components/PostReadingFlow.astro";
import TOC from "../../components/TOC.astro";
import Layout from "../../layouts/Layout.astro";
import { getReadingTimeMinutes, matchesLocale, sortPostsByDate, stripLocaleFromId } from "../../utils/blog";
import { getRelatedPosts, getSeriesNavigation } from "../../utils/postReading";

const { post } = Astro.props;
const localePosts = sortPostsByDate(
	await getCollection("blog", ({ id }) => matchesLocale(id, "ko")),
);

const toPostCard = (entry) => ({
	href: getRelativeLocaleUrl("ko", `posts/${stripLocaleFromId(entry.id)}`),
	title: entry.data.title,
	description: entry.data.description,
});

const seriesNavigation = getSeriesNavigation(localePosts, post);
const relatedPosts = getRelatedPosts(localePosts, post, 3);

const seriesProps = seriesNavigation
	? {
			title: seriesNavigation.title,
			positionLabel: `${seriesNavigation.currentOrder} / ${seriesNavigation.total}`,
			previous: seriesNavigation.previous
				? {
						href: getRelativeLocaleUrl(
							"ko",
							`posts/${stripLocaleFromId(seriesNavigation.previous.id)}`,
						),
						title: seriesNavigation.previous.data.title,
					}
				: null,
			next: seriesNavigation.next
				? {
						href: getRelativeLocaleUrl(
							"ko",
							`posts/${stripLocaleFromId(seriesNavigation.next.id)}`,
						),
						title: seriesNavigation.next.data.title,
					}
				: null,
			items: seriesNavigation.items.map((entry) => ({
				href: getRelativeLocaleUrl("ko", `posts/${stripLocaleFromId(entry.id)}`),
				title: entry.data.title,
				order: entry.data.series?.order ?? 0,
				isCurrent: entry.id === post.id,
			})),
		}
	: null;

const relatedPostCards = relatedPosts.map(toPostCard);
```

```astro
<!-- src/pages/posts/[...slug].astro -->
<PostReadingFlow lang="ko" series={seriesProps} relatedPosts={relatedPostCards} />

<div class="mt-16 border-t border-stone-200 pt-10 dark:border-stone-800">
	<div class="space-y-10">
		<AuthorProfile lang="ko" />
		<div class="border-t border-stone-200 pt-10 dark:border-stone-800">
			<Comments lang="ko" />
		</div>
	</div>
</div>
```

```ts
// src/pages/en/posts/[...slug].astro
import { getRelativeLocaleUrl } from "astro:i18n";
import { getCollection, render } from "astro:content";
import AuthorProfile from "../../../components/AuthorProfile.astro";
import Comments from "../../../components/Comments.astro";
import PostHeader from "../../../components/PostHeader.astro";
import PostReadingFlow from "../../../components/PostReadingFlow.astro";
import TOC from "../../../components/TOC.astro";
import Layout from "../../../layouts/Layout.astro";
import { getReadingTimeMinutes, matchesLocale, sortPostsByDate, stripLocaleFromId } from "../../../utils/blog";
import { getRelatedPosts, getSeriesNavigation } from "../../../utils/postReading";

const { post } = Astro.props;
const localePosts = sortPostsByDate(
	await getCollection("blog", ({ id }) => matchesLocale(id, "en")),
);

const toPostCard = (entry) => ({
	href: getRelativeLocaleUrl("en", `posts/${stripLocaleFromId(entry.id)}`),
	title: entry.data.title,
	description: entry.data.description,
});

const seriesNavigation = getSeriesNavigation(localePosts, post);
const relatedPosts = getRelatedPosts(localePosts, post, 3);
const seriesProps = seriesNavigation
	? {
			title: seriesNavigation.title,
			positionLabel: `${seriesNavigation.currentOrder} / ${seriesNavigation.total}`,
			previous: seriesNavigation.previous
				? {
						href: getRelativeLocaleUrl(
							"en",
							`posts/${stripLocaleFromId(seriesNavigation.previous.id)}`,
						),
						title: seriesNavigation.previous.data.title,
					}
				: null,
			next: seriesNavigation.next
				? {
						href: getRelativeLocaleUrl(
							"en",
							`posts/${stripLocaleFromId(seriesNavigation.next.id)}`,
						),
						title: seriesNavigation.next.data.title,
					}
				: null,
			items: seriesNavigation.items.map((entry) => ({
				href: getRelativeLocaleUrl("en", `posts/${stripLocaleFromId(entry.id)}`),
				title: entry.data.title,
				order: entry.data.series?.order ?? 0,
				isCurrent: entry.id === post.id,
			})),
		}
	: null;

const relatedPostCards = relatedPosts.map(toPostCard);
```

```md
<!-- src/content/blog/ko/routing-story-start.md -->
---
title: "라우팅 이야기 (1): 경계부터 정하기"
pubDate: 2026-04-16
description: "복잡한 인프라 경로를 손대기 전에, 먼저 어떤 책임을 어디까지 둘지 정리하는 시리즈의 출발점입니다."
category: "Development"
tags:
  - routing
  - infrastructure
  - architecture
series:
  slug: "routing-story"
  title: "라우팅 이야기"
  order: 1
---

라우팅을 바꾸는 일은 종종 설정을 바꾸는 일처럼 보이지만, 실제로는 책임을 재배치하는 일에 가깝습니다.

## 먼저 경계를 적는다

트래픽이 어디에서 들어오고, 어디에서 해석되고, 어디에서 최종적으로 책임을 지는지 적지 않으면 이후의 선택은 계속 섞입니다.

## 경로보다 책임을 본다

짧은 경로가 항상 좋은 것은 아닙니다. 설명 가능한 경로가 더 오래 유지됩니다.

## 다음 글에서 이어질 것

다음 글에서는 실제 규칙을 늘리기 전에 어떤 기준으로 경로를 분리해야 하는지 정리합니다.
```

- [ ] **Step 4: Run the targeted structure test to verify it passes**

Run: `npm test -- tests/post-reading-flow-structure.test.mjs`

Expected: PASS with `4` passing tests

- [ ] **Step 5: Commit**

```bash
git add src/pages/posts/[...slug].astro src/pages/en/posts/[...slug].astro src/content/blog/ko/routing-story-start.md tests/post-reading-flow-structure.test.mjs
git commit -m "feat: wire post reading flow"
```

---

### Task 4: Update SSOT Docs And Run Full Verification

**Files:**
- Modify: `docs/spec-posts.md`
- Modify: `docs/spec-post-detail.md`

- [ ] **Step 1: Update the docs to reflect the new model**

```md
<!-- docs/spec-posts.md -->
- `blog` schema requirements:
  - `title` (string)
  - `pubDate` (Date)
  - `description` (string)
  - `category` (string, required)
  - `tags` (array of strings, optional)
  - `series` (object, optional)
    - `slug` (string)
    - `title` (string)
    - `order` (positive integer)
```

```md
<!-- docs/spec-post-detail.md -->
- **Post Reading Flow**:
  - Render a dedicated series-navigation block below the article body when a post has `series` metadata.
  - Render a shared related-reading block for all posts when strong candidates exist.
  - Place these blocks before the author profile and comments area.
  - Keep both blocks text-first, quiet, and free of thumbnail/card-heavy presentation.
```

- [ ] **Step 2: Run the full verification suite**

Run:

```bash
npm test
npm run build
```

Expected:

- all tests PASS
- Astro build succeeds
- Pagefind indexing succeeds

- [ ] **Step 3: Commit**

```bash
git add docs/spec-posts.md docs/spec-post-detail.md
git commit -m "docs: document post reading flow"
```
