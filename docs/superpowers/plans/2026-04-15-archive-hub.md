# Archive Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/posts` into a lightweight browse hub by adding a calm category-first browse section, while keeping the reverse-chronological archive as the page's main structure and upgrading category pages into shallow landing pages.

**Architecture:** Add a small locale-aware browse metadata module for manually written category descriptions and curated representative tags, then render that metadata through a focused `ArchiveBrowse.astro` component on the archive pages. Reuse the same metadata plus lightweight tag-frequency helpers to enrich category pages, while leaving tag pages as simple result pages in this iteration.

**Tech Stack:** Astro, Tailwind CSS, Astro Content Collections, vanilla TypeScript/JavaScript, Node test runner, Astro compiler/container render tests

---

## File Structure

### Create

- `src/data/archiveBrowse.ts`
  - Locale-aware archive browse metadata
  - Category description lookup
  - Curated representative tags for `/posts`
- `src/components/ArchiveBrowse.astro`
  - Shared browse section renderer for archive hub pages
- `tests/archive-browse.test.ts`
  - Logic tests for browse metadata and related-tag helpers
- `tests/archive-hub-structure.test.mjs`
  - Render/structure tests for archive browse component and page wiring

### Modify

- `src/utils/blog.ts`
  - Add helper for picking top tags from a set of posts
- `src/pages/posts/index.astro`
  - Insert archive browse section above filters
  - Build category items and representative tag links
- `src/pages/en/posts/index.astro`
  - English archive hub wiring
- `src/components/ArchiveFilters.astro`
  - Reduce visual prominence so filters read as secondary to browse
- `src/pages/category/[category].astro`
  - Turn category page into a shallow landing with description and related tags
- `src/pages/en/category/[category].astro`
  - English category landing update
- `docs/spec-posts.md`
  - Document archive hub structure
- `docs/spec-tags-categories.md`
  - Document category landings and tag-page scope

### Intentionally Unchanged In This Iteration

- `src/pages/tags/[tag].astro`
- `src/pages/en/tags/[tag].astro`
- `src/components/SearchModal.astro`

These stay in their current roles so taxonomy browsing remains separate from search, and tag pages remain lightweight result pages.

---

### Task 1: Add Archive Browse Metadata And Helpers

**Files:**
- Create: `src/data/archiveBrowse.ts`
- Modify: `src/utils/blog.ts`
- Test: `tests/archive-browse.test.ts`

- [ ] **Step 1: Write the failing metadata and helper tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
	getArchiveBrowseConfig,
	getCategoryDescription,
} from "../src/data/archiveBrowse.ts";
import { getTopTagsForPosts } from "../src/utils/blog.ts";

test("returns locale-aware archive browse metadata", () => {
	const ko = getArchiveBrowseConfig("ko");
	const en = getArchiveBrowseConfig("en");

	assert.equal(ko.representativeTags.length > 0, true);
	assert.equal(en.representativeTags.length > 0, true);
	assert.ok(getCategoryDescription("ko", "development").length > 0);
	assert.ok(getCategoryDescription("en", "development").length > 0);
});

test("orders top tags by frequency and then alphabetically", () => {
	const posts = [
		{ data: { tags: ["astro", "docs"] } },
		{ data: { tags: ["astro", "architecture"] } },
		{ data: { tags: ["docs"] } },
	] as any;

	assert.deepEqual(getTopTagsForPosts(posts, 3), [
		"astro",
		"docs",
		"architecture",
	]);
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- tests/archive-browse.test.ts`

Expected: FAIL with module or export errors for `src/data/archiveBrowse.ts` and `getTopTagsForPosts`

- [ ] **Step 3: Add the browse metadata module and top-tag helper**

```ts
// src/data/archiveBrowse.ts
import { defaultLocale, type Locale } from "../i18n/ui";
import { slugifyTaxonomy } from "../utils/blog";

interface ArchiveBrowseConfig {
	categoryDescriptions: Record<string, string>;
	representativeTags: string[];
}

export const archiveBrowseConfig: Record<Locale, ArchiveBrowseConfig> = {
	ko: {
		categoryDescriptions: {
			development: "구현과 설계의 선택을 차분하게 풀어낸 글입니다.",
			operations: "운영 과정에서 드러나는 시스템의 결을 다룹니다.",
			essay: "기술 작업의 태도와 감각을 짧게 정리한 글입니다.",
		},
		representativeTags: ["architecture", "operations", "docs", "astro"],
	},
	en: {
		categoryDescriptions: {
			development: "Notes on implementation choices and system design.",
			operations: "Writing about the shape of systems in real operation.",
			essay: "Short technical essays about practice, tone, and judgment.",
		},
		representativeTags: ["architecture", "operations", "docs", "astro"],
	},
};

export const getArchiveBrowseConfig = (lang: Locale) =>
	archiveBrowseConfig[lang] ?? archiveBrowseConfig[defaultLocale];

export const getCategoryDescription = (lang: Locale, category: string) =>
	getArchiveBrowseConfig(lang).categoryDescriptions[slugifyTaxonomy(category)] ?? "";
```

```ts
// src/utils/blog.ts
export const getTopTagsForPosts = (posts: BlogPost[], limit = 4) =>
	Array.from(
		posts.reduce((counts, post) => {
			for (const tag of post.data.tags ?? []) {
				counts.set(tag, (counts.get(tag) ?? 0) + 1);
			}
			return counts;
		}, new Map<string, number>()),
	)
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, limit)
		.map(([tag]) => tag);
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- tests/archive-browse.test.ts`

Expected: PASS with `2` passing tests

- [ ] **Step 5: Commit**

```bash
git add tests/archive-browse.test.ts src/data/archiveBrowse.ts src/utils/blog.ts
git commit -m "feat: add archive browse metadata"
```

---

### Task 2: Add The Shared Archive Browse Section And Wire `/posts`

**Files:**
- Create: `src/components/ArchiveBrowse.astro`
- Modify: `src/pages/posts/index.astro`
- Modify: `src/pages/en/posts/index.astro`
- Modify: `src/components/ArchiveFilters.astro`
- Test: `tests/archive-hub-structure.test.mjs`

- [ ] **Step 1: Write the failing browse render and page wiring tests**

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderArchiveBrowse(props) {
	const sourceUrl = new URL("../src/components/ArchiveBrowse.astro", import.meta.url);
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "archive-browse-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const componentPath = join(tempDir, "ArchiveBrowse.ts");

	try {
		await writeFile(
			runtimeStubPath,
			[
				`export * from ${JSON.stringify(astroRuntimeUrl)};`,
				"export const createMetadata = () => ({})",
				"",
			].join("\n"),
		);

		const rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

test("archive browse renders category descriptions, counts, and representative tags", async () => {
	const rendered = await renderArchiveBrowse({
		heading: "Browse by topic",
		categories: [
			{
				href: "/category/development/",
				name: "Development",
				description: "Notes on implementation choices and system design.",
				postCount: 3,
				postCountLabel: "3 posts",
			},
		],
		tags: [{ href: "/tags/architecture/", name: "architecture" }],
		tagsLabel: "Representative tags",
	});

	assert.match(rendered, /Browse by topic/);
	assert.match(rendered, /Development/);
	assert.match(rendered, /3 posts/);
	assert.match(rendered, /#architecture/);
});

test("archive pages place browse above filters", async () => {
	const koPage = await readFile(new URL("../src/pages/posts/index.astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/posts/index.astro", import.meta.url), "utf8");

	for (const page of [koPage, enPage]) {
		assert.match(page, /import ArchiveBrowse from/);
		assert.match(page, /<ArchiveBrowse[\s\S]*<ArchiveFilters/);
	}
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- tests/archive-hub-structure.test.mjs`

Expected: FAIL because `ArchiveBrowse.astro` does not exist and `/posts` pages do not import it yet

- [ ] **Step 3: Create `ArchiveBrowse.astro` and wire it into both archive pages**

```astro
---
interface BrowseCategory {
	href: string;
	name: string;
	description: string;
	postCount: number;
	postCountLabel: string;
}

interface BrowseTag {
	href: string;
	name: string;
}

interface Props {
	heading: string;
	categories: BrowseCategory[];
	tags: BrowseTag[];
	tagsLabel: string;
}

const { heading, categories, tags, tagsLabel } = Astro.props;
---

<section class="mt-12 space-y-6 border-t border-stone-200 pt-8 dark:border-stone-800">
	<div class="space-y-2">
		<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
			{heading}
		</p>
	</div>

	<ul class="divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800">
		{categories.map((category) => (
			<li class="py-6">
				<a href={category.href} class="block space-y-2">
					<h2 class="text-xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
						{category.name}
					</h2>
					<p class="max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300">
						{category.description}
					</p>
					<p class="text-sm text-stone-500 dark:text-stone-500">{category.postCountLabel}</p>
				</a>
			</li>
		))}
	</ul>

	{tags.length > 0 && (
		<div class="space-y-3">
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
				{tagsLabel}
			</p>
			<ul class="flex flex-wrap gap-2">
				{tags.map((tag) => (
					<li>
						<a href={tag.href} class="inline-flex rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-600 dark:bg-stone-900 dark:text-stone-300">
							#{tag.name}
						</a>
					</li>
				))}
			</ul>
		</div>
	)}
</section>
```

```astro
---
// src/pages/posts/index.astro
import ArchiveBrowse from "../../components/ArchiveBrowse.astro";
import { getArchiveBrowseConfig, getCategoryDescription } from "../../data/archiveBrowse";
import { categoryHref, tagHref } from "../../utils/blog";

const browse = getArchiveBrowseConfig("ko");
const categoryItems = categories.map((category) => ({
	href: categoryHref(category),
	name: category,
	description: getCategoryDescription("ko", category),
	postCount: posts.filter((post) => post.data.category === category).length,
	postCountLabel: `${posts.filter((post) => post.data.category === category).length}개의 글`,
}));
const representativeTags = browse.representativeTags
	.filter((tag) => tags.includes(tag))
	.map((tag) => ({ href: tagHref(tag), name: tag }));
---

<ArchiveBrowse
	heading="주제별로 둘러보기"
	categories={categoryItems}
	tags={representativeTags}
	tagsLabel="대표 태그"
/>

<ArchiveFilters
	categories={categories}
	tags={tags}
	categoryLabel="카테고리"
	tagsLabel="태그"
	allCategoriesLabel="전체 카테고리"
	categoryAriaLabel="카테고리"
/>
```

```astro
---
// src/pages/en/posts/index.astro
import ArchiveBrowse from "../../../components/ArchiveBrowse.astro";
import { getArchiveBrowseConfig, getCategoryDescription } from "../../../data/archiveBrowse";
import { getRelativeLocaleUrl } from "astro:i18n";
import { slugifyTaxonomy } from "../../../utils/blog";

const browse = getArchiveBrowseConfig("en");
const categoryItems = categories.map((category) => ({
	href: getRelativeLocaleUrl("en", `category/${slugifyTaxonomy(category)}`),
	name: category,
	description: getCategoryDescription("en", category),
	postCount: posts.filter((post) => post.data.category === category).length,
	postCountLabel: `${posts.filter((post) => post.data.category === category).length} posts`,
}));
const representativeTags = browse.representativeTags
	.filter((tag) => tags.includes(tag))
	.map((tag) => ({
		href: getRelativeLocaleUrl("en", `tags/${slugifyTaxonomy(tag)}`),
		name: tag,
	}));
---

<ArchiveBrowse
	heading="Browse by topic"
	categories={categoryItems}
	tags={representativeTags}
	tagsLabel="Representative tags"
/>
```

```astro
---
// src/components/ArchiveFilters.astro
<section class="mt-10 space-y-5 border-t border-stone-200 pt-8 dark:border-stone-800">
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- tests/archive-hub-structure.test.mjs`

Expected: PASS for browse rendering and `/posts` wiring tests

- [ ] **Step 5: Commit**

```bash
git add tests/archive-hub-structure.test.mjs src/components/ArchiveBrowse.astro src/pages/posts/index.astro src/pages/en/posts/index.astro src/components/ArchiveFilters.astro
git commit -m "feat: add archive browse section"
```

---

### Task 3: Turn Category Pages Into Shallow Landing Pages

**Files:**
- Modify: `src/pages/category/[category].astro`
- Modify: `src/pages/en/category/[category].astro`
- Modify: `tests/archive-browse.test.ts`
- Modify: `tests/archive-hub-structure.test.mjs`

- [ ] **Step 1: Extend tests for category descriptions and related tags**

```ts
import { getTopTagsForPosts } from "../src/utils/blog.ts";

test("returns top related tags for a category landing", () => {
	const posts = [
		{ data: { tags: ["astro", "docs"] } },
		{ data: { tags: ["astro", "architecture"] } },
		{ data: { tags: ["architecture"] } },
	] as any;

	assert.deepEqual(getTopTagsForPosts(posts, 2), ["astro", "architecture"]);
});
```

```js
test("category pages use manual descriptions and related tags above the post list", async () => {
	const koPage = await readFile(new URL("../src/pages/category/[category].astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/category/[category].astro", import.meta.url), "utf8");

	for (const page of [koPage, enPage]) {
		assert.match(page, /getCategoryDescription/);
		assert.match(page, /getTopTagsForPosts/);
		assert.match(page, /relatedTags/);
	}
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/archive-browse.test.ts tests/archive-hub-structure.test.mjs`

Expected: FAIL because category pages do not use browse metadata or related tags yet

- [ ] **Step 3: Update both category pages to render descriptions and related tags**

```astro
---
import { getCategoryDescription } from "../../data/archiveBrowse";
import { getTopTagsForPosts, tagHref } from "../../utils/blog";

const description = getCategoryDescription("ko", category);
const relatedTags = getTopTagsForPosts(posts, 4);
---

<section class="space-y-4">
	<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
		카테고리
	</p>
	<h1 class="text-4xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 sm:text-5xl">
		{category}
	</h1>
	<p class="max-w-2xl text-lg leading-8 text-stone-600 dark:text-stone-300">
		{description}
	</p>
	{relatedTags.length > 0 && (
		<ul class="flex flex-wrap gap-2">
			{relatedTags.map((tag) => (
				<li>
					<a href={tagHref(tag)} class="inline-flex rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600 dark:bg-stone-900 dark:text-stone-300">
						#{tag}
					</a>
				</li>
			))}
		</ul>
	)}
</section>
```

```astro
---
// src/pages/en/category/[category].astro
import { getRelativeLocaleUrl } from "astro:i18n";
import { getCategoryDescription } from "../../../data/archiveBrowse";
import { getTopTagsForPosts, slugifyTaxonomy } from "../../../utils/blog";

const description = getCategoryDescription("en", category);
const relatedTags = getTopTagsForPosts(posts, 4);
---

<p class="max-w-2xl text-lg leading-8 text-stone-600 dark:text-stone-300">
	{description}
</p>

{relatedTags.length > 0 && (
	<ul class="flex flex-wrap gap-2">
		{relatedTags.map((tag) => (
			<li>
				<a
					href={getRelativeLocaleUrl("en", `tags/${slugifyTaxonomy(tag)}`)}
					class="inline-flex rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600 dark:bg-stone-900 dark:text-stone-300"
				>
					#{tag}
				</a>
			</li>
		))}
	</ul>
)}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- tests/archive-browse.test.ts tests/archive-hub-structure.test.mjs`

Expected: PASS for helper coverage and category page structure coverage

- [ ] **Step 5: Commit**

```bash
git add tests/archive-browse.test.ts tests/archive-hub-structure.test.mjs src/pages/category/[category].astro src/pages/en/category/[category].astro
git commit -m "feat: add category landing context"
```

---

### Task 4: Update SSOT Docs And Run Full Verification

**Files:**
- Modify: `docs/spec-posts.md`
- Modify: `docs/spec-tags-categories.md`

- [ ] **Step 1: Update the archive and taxonomy specs**

```md
<!-- docs/spec-posts.md -->
- `/posts` remains the primary reverse-chronological archive.
- Add a browse section above archive filters with all categories and a curated set of representative tags.
- Keep browse links navigational and keep filters scoped to the current archive page.
```

```md
<!-- docs/spec-tags-categories.md -->
- Category pages act as shallow landing pages with a short description, related tags, and a reverse-chronological post list.
- Tag pages remain lightweight result pages in this iteration.
```

- [ ] **Step 2: Run the focused archive tests**

Run: `npm test -- tests/archive-browse.test.ts tests/archive-hub-structure.test.mjs`

Expected: PASS with all archive-hub tests green

- [ ] **Step 3: Run the full verification commands**

Run: `npm test`

Expected: PASS with all repository tests green

Run: `npm run build`

Expected: PASS with Astro build and Pagefind generation completing successfully

- [ ] **Step 4: Commit**

```bash
git add docs/spec-posts.md docs/spec-tags-categories.md
git commit -m "docs: update archive hub ssot"
```

---

## Self-Review

- **Spec coverage:** The plan covers the archive hub browse section, category landing upgrades, filter role, and SSOT updates. Tag pages are intentionally left simple, matching the approved design.
- **Placeholder scan:** Removed the only placeholder-like archive wiring snippet and kept concrete file paths, commands, and code examples throughout.
- **Type consistency:** The plan uses one metadata module name (`src/data/archiveBrowse.ts`) and consistent helper names (`getArchiveBrowseConfig`, `getCategoryDescription`, `getTopTagsForPosts`) across tasks.
