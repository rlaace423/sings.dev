# Series Title & Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape series frontmatter to `series.id/index/total/subtitle?`, add shared display-title helpers, update all title-bearing surfaces to use them, and expand the dummy series into complete Korean and English 3-part fixtures.

**Architecture:** Replace the current series schema and helper assumptions with a metadata model that separates grouping from rendering, then centralize title assembly in reusable utilities. Update detail pages, lists, related-reading, and series navigation to consume shared title helpers so Pagefind keeps indexing the same assembled titles that readers see.

**Tech Stack:** Astro content collections, Astro pages/components, TypeScript utilities, Node test runner, Astro component structure tests

---

## File Structure

### Existing Files To Modify

- `src/content/config.ts`
  - Update the blog content schema from the current `series.slug/title/order` shape to `series.id/index/total/subtitle?`.
- `src/utils/postReading.ts`
  - Update series grouping and ordering logic to use the new metadata keys.
- `src/utils/blog.ts`
  - Add shared title-assembly helpers that every title-bearing surface can consume.
- `src/components/PostHeader.astro`
  - Accept and render assembled display titles instead of raw `post.data.title`.
- `src/components/PostSeriesNav.astro`
  - Accept compact series-list labels like `1/3: ...` and preserve the quiet editorial tone.
- `src/components/RelatedReading.astro`
  - Continue rendering related links, but now consume assembled display titles.
- `src/components/PostReadingFlow.astro`
  - Keep its wrapper behavior but adapt prop names/types if needed after the title-helper refactor.
- `src/components/PostList.astro`
  - Render assembled display titles in archive/category/tag/home lists.
- `src/pages/posts/[...slug].astro`
  - Replace ad hoc title assembly with shared helpers and update the series mapping to the new schema.
- `src/pages/en/posts/[...slug].astro`
  - Same as the Korean detail page.
- `src/pages/index.astro`
  - Ensure the home page recent-post list uses assembled display titles if it renders titles directly.
- `src/pages/en/index.astro`
  - Same as the Korean home page.
- `tests/post-reading-flow.test.ts`
  - Update fixtures and expectations for the new `series.id/index/total/subtitle?` shape, plus add display-title coverage.
- `tests/post-reading-flow-structure.test.mjs`
  - Update structure expectations for the new assembled titles and series-list labels.
- `docs/spec-posts.md`
  - Document the new frontmatter shape.
- `docs/spec-post-detail.md`
  - Document display-title assembly and series-list label behavior.
- `docs/spec-editorial-philosophy.md`
  - Touch only if title assembly needs a brief philosophy note; otherwise leave unchanged.

### New Files To Create

- `src/content/blog/ko/routing-story-middle.md`
  - Korean dummy series part 2.
- `src/content/blog/ko/routing-story-finish.md`
  - Korean dummy series part 3.
- `src/content/blog/en/routing-story-start.md`
  - English dummy series part 1.
- `src/content/blog/en/routing-story-middle.md`
  - English dummy series part 2.
- `src/content/blog/en/routing-story-finish.md`
  - English dummy series part 3.

### Responsibilities

- `src/utils/blog.ts` becomes the single source of truth for:
  - full display title assembly
  - compact series-list label assembly
- `src/utils/postReading.ts` stays focused on:
  - grouping and ordering series posts
  - choosing related posts
- page files stay responsible only for:
  - pulling localized posts
  - mapping them into component props using shared helpers

---

### Task 1: Update Schema And Add Shared Title Helpers

**Files:**
- Modify: `src/content/config.ts`
- Modify: `src/utils/blog.ts`
- Test: `tests/display-title.test.ts`

- [ ] **Step 1: Write the failing title-helper test file**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import type { CollectionEntry } from "astro:content";
import {
	getDisplayTitle,
	getSeriesListLabel,
} from "../src/utils/blog.ts";

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
			title: "Default Title",
			pubDate: new Date("2026-01-01"),
			description: "desc",
			category: "Essay",
			...overrides,
		},
	} as BlogPost);

test("returns the raw title for non-series posts", () => {
	const post = makePost("en/plain", {
		title: "Service Boundaries That Stay Useful",
	});

	assert.equal(getDisplayTitle(post), "Service Boundaries That Stay Useful");
});

test("assembles series titles with and without subtitles", () => {
	const withoutSubtitle = makePost("en/series-1", {
		title: "Routing Story",
		series: {
			id: "routing-story",
			index: 1,
			total: 3,
		},
	});
	const withSubtitle = makePost("en/series-2", {
		title: "Routing Story",
		series: {
			id: "routing-story",
			index: 2,
			total: 3,
			subtitle: "Defining Boundaries First",
		},
	});

	assert.equal(getDisplayTitle(withoutSubtitle), "Routing Story (1/3)");
	assert.equal(
		getDisplayTitle(withSubtitle),
		"Routing Story (2/3): Defining Boundaries First",
	);
});

test("assembles compact series list labels", () => {
	const withoutSubtitle = makePost("ko/series-1", {
		title: "라우팅 이야기",
		series: {
			id: "routing-story",
			index: 1,
			total: 3,
		},
	});
	const withSubtitle = makePost("ko/series-2", {
		title: "라우팅 이야기",
		series: {
			id: "routing-story",
			index: 2,
			total: 3,
			subtitle: "경계부터 정하기",
		},
	});

	assert.equal(getSeriesListLabel(withoutSubtitle), "1/3: 라우팅 이야기");
	assert.equal(getSeriesListLabel(withSubtitle), "2/3: 경계부터 정하기");
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npm test -- tests/display-title.test.ts`  
Expected: FAIL because `getDisplayTitle` and `getSeriesListLabel` do not exist yet

- [ ] **Step 3: Update the content schema to the new series shape**

```ts
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
				id: z.string(),
				index: z.number().int().positive(),
				total: z.number().int().positive(),
				subtitle: z.string().optional(),
			})
			.optional(),
	}),
});
```

- [ ] **Step 4: Add shared title helpers to `src/utils/blog.ts`**

```ts
export const getDisplayTitle = (post: BlogPost) => {
	const series = post.data.series;

	if (!series) {
		return post.data.title;
	}

	const position = `(${series.index}/${series.total})`;

	return series.subtitle
		? `${post.data.title} ${position}: ${series.subtitle}`
		: `${post.data.title} ${position}`;
};

export const getSeriesListLabel = (post: BlogPost) => {
	const series = post.data.series;

	if (!series) {
		return post.data.title;
	}

	return `${series.index}/${series.total}: ${series.subtitle ?? post.data.title}`;
};
```

- [ ] **Step 5: Run the helper test to verify it passes**

Run: `npm test -- tests/display-title.test.ts`  
Expected: PASS with `3` passing tests

- [ ] **Step 6: Commit**

```bash
git add src/content/config.ts src/utils/blog.ts tests/display-title.test.ts
git commit -m "feat: add series title helpers"
```

---

### Task 2: Update Reading-Flow Logic And Tests For New Metadata

**Files:**
- Modify: `src/utils/postReading.ts`
- Modify: `tests/post-reading-flow.test.ts`

- [ ] **Step 1: Rewrite the failing reading-flow tests to use the new metadata shape**

Replace every fixture like:

```ts
series: { slug: "writing", title: "Writing", order: 2 }
```

with:

```ts
series: { id: "writing", index: 2, total: 3 }
```

and subtitle-aware cases like:

```ts
series: { id: "routing-story", index: 2, total: 3, subtitle: "Middle" }
```

- [ ] **Step 2: Run the reading-flow tests to verify they fail**

Run: `npm test -- tests/post-reading-flow.test.ts`  
Expected: FAIL because `postReading.ts` still expects `slug/order`

- [ ] **Step 3: Update `src/utils/postReading.ts` to use `series.id` and `series.index`**

```ts
const sameSeries = (left: BlogPost, right: BlogPost) =>
	left.data.series?.id === right.data.series?.id;

const compareBySeriesOrder = (left: SeriesItem, right: SeriesItem) =>
	left.order - right.order || left.post.id.localeCompare(right.post.id);

// inside getSeriesNavigation
.map((post) => ({
	post,
	order: post.data.series!.index,
}))
```

- [ ] **Step 4: Add one explicit test for subtitle-aware series labels staying out of grouping logic**

```ts
test("groups series by id regardless of subtitle differences", () => {
	const currentPost = makePost("en/current", {
		title: "Routing Story",
		series: { id: "routing-story", index: 2, total: 3, subtitle: "Middle" },
	});
	const posts = [
		makePost("en/first", {
			title: "Routing Story",
			series: { id: "routing-story", index: 1, total: 3, subtitle: "Opening" },
		}),
		currentPost,
	];

	const navigation = getSeriesNavigation(posts, currentPost);

	assert.deepEqual(
		navigation?.orderedItems.map((post) => post.id),
		["en/first", "en/current"],
	);
});
```

- [ ] **Step 5: Run the reading-flow tests to verify they pass**

Run: `npm test -- tests/post-reading-flow.test.ts`  
Expected: PASS with all reading-flow tests green

- [ ] **Step 6: Commit**

```bash
git add src/utils/postReading.ts tests/post-reading-flow.test.ts
git commit -m "feat: update series metadata logic"
```

---

### Task 3: Refactor Components To Consume Shared Titles

**Files:**
- Modify: `src/components/PostHeader.astro`
- Modify: `src/components/PostSeriesNav.astro`
- Modify: `src/components/RelatedReading.astro`
- Modify: `src/components/PostReadingFlow.astro`
- Modify: `tests/post-reading-flow-structure.test.mjs`

- [ ] **Step 1: Extend the structure test with failing subtitle-aware expectations**

Add or update tests so they verify:

```js
assert.match(rendered, /2\/3: Middle/);
assert.match(rendered, /Routing Story \(2\/3\): Defining Boundaries First/);
```

and ensure the wrapper still renders nothing with no content.

- [ ] **Step 2: Run the structure test to verify it fails**

Run: `npm test -- tests/post-reading-flow-structure.test.mjs`  
Expected: FAIL because the components still render raw titles

- [ ] **Step 3: Update component prop types to distinguish full titles from compact list labels**

Use these shapes:

```ts
interface SeriesItem {
	href: string;
	label: string;
}

interface Series {
	currentIndex: number;
	items: SeriesItem[];
	title: string;
}

interface RelatedItem {
	description?: string;
	href: string;
	meta?: string;
	title: string;
}
```

- [ ] **Step 4: Update `PostSeriesNav.astro` to render `item.label`**

```astro
<ol class="space-y-2 border-l border-stone-200 pl-4 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-300">
	{items.map((item, index) => (
		<li class:list={[index === currentIndex && "text-stone-950 dark:text-stone-50"]}>
			<a
				href={item.href}
				aria-current={index === currentIndex ? "page" : undefined}
				class="block leading-6 transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
			>
				{item.label}
			</a>
		</li>
	))}
</ol>
```

- [ ] **Step 5: Keep `RelatedReading.astro` text-first, but render assembled `title` values unchanged**

No new behavior beyond consuming the new props. Preserve the current quiet list structure.

- [ ] **Step 6: Run the structure test to verify it passes**

Run: `npm test -- tests/post-reading-flow-structure.test.mjs`  
Expected: PASS with subtitle-aware title rendering assertions green

- [ ] **Step 7: Commit**

```bash
git add src/components/PostHeader.astro src/components/PostSeriesNav.astro src/components/RelatedReading.astro src/components/PostReadingFlow.astro tests/post-reading-flow-structure.test.mjs
git commit -m "feat: render shared series titles"
```

---

### Task 4: Wire Shared Display Titles Into Lists And Detail Pages

**Files:**
- Modify: `src/components/PostList.astro`
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/pages/en/posts/[...slug].astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/en/index.astro`
- Test: `tests/post-detail-structure.test.mjs`

- [ ] **Step 1: Add failing assertions for assembled titles in page wiring tests**

Extend the structure tests so they check for shared title helper usage, for example:

```js
assert.match(page, /import \{[\s\S]*getDisplayTitle[\s\S]*getSeriesListLabel[\s\S]*\} from .*\/utils\/blog";/);
assert.match(page, /title=\{getDisplayTitle\(post\)\}/);
assert.match(page, /title=\`\$\{getDisplayTitle\(post\)\} \| sings\.dev\`/);
assert.match(page, /label: getSeriesListLabel\(entry\)/);
assert.match(page, /title: getDisplayTitle\(entry\)/);
```

- [ ] **Step 2: Run the affected structure tests to verify they fail**

Run: `npm test -- tests/post-detail-structure.test.mjs tests/post-reading-flow-structure.test.mjs`  
Expected: FAIL because detail pages and lists still use raw `post.data.title`

- [ ] **Step 3: Update Korean and English detail pages to use shared title helpers**

Use this pattern in both files:

```ts
import {
	formatDate,
	getDisplayTitle,
	getReadingTimeMinutes,
	getSeriesListLabel,
	matchesLocale,
	sortPostsByDate,
	stripLocaleFromId,
} from "../../utils/blog";

const seriesData = seriesNavigation
	? {
			title: post.data.title,
			currentIndex: seriesNavigation.currentIndex,
			items: seriesNavigation.orderedItems.map((entry) => ({
				label: getSeriesListLabel(entry),
				href: getRelativeLocaleUrl("ko", `posts/${stripLocaleFromId(entry.id)}`),
			})),
		}
	: null;

const relatedItems = relatedPosts.map((entry) => ({
	title: getDisplayTitle(entry),
	href: getRelativeLocaleUrl("ko", `posts/${stripLocaleFromId(entry.id)}`),
	description: entry.data.description,
	meta: `${entry.data.category} · ${formatDate(entry.data.pubDate)}`,
}));
```

and:

```astro
<Layout
	title={`${getDisplayTitle(post)} | sings.dev`}
	description={post.data.description}
	lang="ko"
	contentClass="max-w-none"
>
	<PostHeader
		...
		title={getDisplayTitle(post)}
	/>
```

- [ ] **Step 4: Update `PostList.astro` and home pages to use `getDisplayTitle(post)`**

Replace direct uses of `{post.data.title}` with:

```astro
{getDisplayTitle(post)}
```

and add the corresponding import:

```ts
import {
	categoryHref,
	formatDate,
	getDisplayTitle,
	slugifyTaxonomy,
	stripLocaleFromId,
	tagHref,
} from "../utils/blog";
```

- [ ] **Step 5: Run the structure tests to verify they pass**

Run: `npm test -- tests/post-detail-structure.test.mjs tests/post-reading-flow-structure.test.mjs`  
Expected: PASS with the new title-helper assertions green

- [ ] **Step 6: Commit**

```bash
git add src/components/PostList.astro src/pages/posts/[...slug].astro src/pages/en/posts/[...slug].astro src/pages/index.astro src/pages/en/index.astro tests/post-detail-structure.test.mjs tests/post-reading-flow-structure.test.mjs
git commit -m "feat: wire assembled post titles"
```

---

### Task 5: Expand The Dummy Series Content In Both Locales

**Files:**
- Modify: `src/content/blog/ko/routing-story-start.md`
- Create: `src/content/blog/ko/routing-story-middle.md`
- Create: `src/content/blog/ko/routing-story-finish.md`
- Create: `src/content/blog/en/routing-story-start.md`
- Create: `src/content/blog/en/routing-story-middle.md`
- Create: `src/content/blog/en/routing-story-finish.md`

- [ ] **Step 1: Update the existing Korean part 1 frontmatter to the new series shape**

```md
---
title: "라우팅 이야기"
pubDate: 2026-04-16
description: "라우팅을 구현하기 전에, 무엇을 경계로 보고 어디서 책임을 나눌지부터 정리합니다."
category: "Development"
tags:
  - routing
  - infrastructure
  - architecture
series:
  id: "routing-story"
  subtitle: "경계부터 정하기"
  index: 1
  total: 3
---
```

- [ ] **Step 2: Add Korean parts 2 and 3**

Create `src/content/blog/ko/routing-story-middle.md`:

```md
---
title: "라우팅 이야기"
pubDate: 2026-04-17
description: "경로를 실제로 나누기 시작할 때 충돌이 생기는 지점과 naming 기준을 살펴봅니다."
category: "Development"
tags:
  - routing
  - infrastructure
  - architecture
series:
  id: "routing-story"
  subtitle: "충돌 없이 경로 나누기"
  index: 2
  total: 3
---

경계를 정한 뒤에는 실제 path를 어떻게 배치할지가 문제로 남습니다.

## 이름과 중첩을 동시에 본다

라우팅은 단지 보기 좋은 URL을 만드는 일이 아니라, 팀이 구조를 예측할 수 있게 만드는 일입니다.

### 충돌은 예외보다 기본 경로에서 먼저 보인다

경계가 모호하면 예외 규칙보다 기본 path 설계에서 먼저 복잡성이 튀어나옵니다.

## 마지막 편에서 다룰 것

다음 글에서는 이렇게 나눈 경로를 운영과 디버깅 관점에서 어떻게 유지할지 이어서 정리합니다.
```

Create `src/content/blog/ko/routing-story-finish.md`:

```md
---
title: "라우팅 이야기"
pubDate: 2026-04-18
description: "마지막 편에서는 라우팅 구조가 운영과 디버깅에서 어떤 차이를 만드는지 정리합니다."
category: "Development"
tags:
  - routing
  - infrastructure
  - operations
series:
  id: "routing-story"
  subtitle: "운영 가능한 구조로 닫기"
  index: 3
  total: 3
---

좋은 라우팅 설계는 구현 순간보다 운영 순간에 더 큰 차이를 만듭니다.

## 로컬에서 먼저 설명 가능해야 한다

문제를 추적할 때 가장 먼저 필요한 건, 이 요청이 어떤 경로를 따라갔는지 빠르게 설명할 수 있는 구조입니다.

### 예외 처리는 늦게, 기본 흐름은 먼저

운영자는 예외 규칙보다 기본 흐름이 얼마나 선명한지에서 더 큰 도움을 받습니다.
```

- [ ] **Step 3: Add the English 3-part series**

Create `src/content/blog/en/routing-story-start.md`:

```md
---
title: "Routing Story"
pubDate: 2026-04-16
description: "Before implementation details, start by deciding what the routing boundaries actually are."
category: "Development"
tags:
  - routing
  - infrastructure
  - architecture
series:
  id: "routing-story"
  subtitle: "Defining Boundaries First"
  index: 1
  total: 3
---

Routing problems often tempt us to jump straight into code. In practice, the steadier move is to decide which boundaries should remain stable first.

## Start with boundaries

Routing is not only about moving between screens or handlers. It is also about how responsibilities stay legible inside the system.

### Why the first part stays structural

It is easier to keep a series coherent when the first entry establishes the criteria before the implementation details begin.
```

Create `src/content/blog/en/routing-story-middle.md`:

```md
---
title: "Routing Story"
pubDate: 2026-04-17
description: "Look at where path structures begin to collide and how naming rules can keep them calm."
category: "Development"
tags:
  - routing
  - infrastructure
  - architecture
series:
  id: "routing-story"
  subtitle: "Splitting Paths Without Drift"
  index: 2
  total: 3
---

Once the boundaries are clear, the next problem is how to divide the paths without creating hidden overlap.

## Naming and nesting have to agree

The path structure should help a reader of the code predict where responsibility lives.

### Conflicts show up in the default path first

When the core route structure is vague, exceptions start multiplying much earlier than they should.
```

Create `src/content/blog/en/routing-story-finish.md`:

```md
---
title: "Routing Story"
pubDate: 2026-04-18
description: "Close the series by looking at routing from the perspective of operations and debugging."
category: "Development"
tags:
  - routing
  - infrastructure
  - operations
series:
  id: "routing-story"
  subtitle: "Closing With Operability"
  index: 3
  total: 3
---

The real value of routing clarity often appears later, when someone has to debug a failure quickly.

## The path should be explainable locally

The first operational question is usually simple: where did this request go, and why?

### Handle the default flow before the exceptions

The calmer the default route is, the easier the exceptional route becomes to notice.
```

- [ ] **Step 4: Run a production build to verify the new content and schema**

Run: `npm run build`  
Expected: PASS with all six routing-story pages generated

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/ko/routing-story-start.md src/content/blog/ko/routing-story-middle.md src/content/blog/ko/routing-story-finish.md src/content/blog/en/routing-story-start.md src/content/blog/en/routing-story-middle.md src/content/blog/en/routing-story-finish.md
git commit -m "feat: expand dummy routing series"
```

---

### Task 6: Update Specs And Run Full Verification

**Files:**
- Modify: `docs/spec-posts.md`
- Modify: `docs/spec-post-detail.md`

- [ ] **Step 1: Update `docs/spec-posts.md` with the new series schema**

Document the new optional shape exactly:

```md
- `series` (object, optional)
  - `id` (string)
  - `index` (positive integer)
  - `total` (positive integer)
  - `subtitle` (string, optional)
```

Also document that:

- `title` remains the canonical title field for all posts
- `series.id` is an internal grouping key only

- [ ] **Step 2: Update `docs/spec-post-detail.md` with title-assembly rules**

Document:

- assembled display titles are shared across detail, lists, related-reading, and series navigation
- final display title rules
- compact series-list label rules such as `1/3: subtitle`

- [ ] **Step 3: Run the full test suite**

Run: `npm test`  
Expected: PASS with all tests green

- [ ] **Step 4: Run the full production build**

Run: `npm run build`  
Expected: PASS with Astro build and Pagefind generation succeeding

- [ ] **Step 5: Commit**

```bash
git add docs/spec-posts.md docs/spec-post-detail.md tests/display-title.test.ts tests/post-reading-flow.test.ts tests/post-reading-flow-structure.test.mjs tests/post-detail-structure.test.mjs
git commit -m "docs: finalize series title metadata"
```

---

## Self-Review

- **Spec coverage:** The plan covers the new schema, `series.id`, `subtitle`, always-fraction numbering, shared display-title assembly, compact series-list labels, subtitle-aware search implications through rendered HTML, and the expansion to a 3-part Korean/English dummy series.
- **Placeholder scan:** No `TODO`, `TBD`, or empty “write tests” placeholders remain. Each task includes concrete code or concrete content.
- **Type consistency:** The plan uses one series shape everywhere: `id`, `index`, `total`, `subtitle?`. Shared helpers are consistently named `getDisplayTitle` and `getSeriesListLabel`.
