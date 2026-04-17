# Home Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page's `관심사` / `Focus` prose section with a quiet Categories block that lists each active category alongside its post count, reusing the existing archive-browse data helpers and keeping the home block explicitly lighter than the `/posts` ArchiveBrowse.

**Architecture:** Extract the locale-aware post-count label that currently lives as a closure inside `ArchiveBrowse.astro` into a shared helper in `src/utils/blog.ts`. Introduce a small `HomeCategories.astro` component that both locale home pages consume, computing its input (`{ name, count }[]`) with the same reducer `/posts` already uses. Remove the old `관심사` / `Focus` section from both home pages and render the new component in the slot it vacates.

**Tech Stack:** Astro 6 (content collections + components), Tailwind CSS, TypeScript, `node --test` with `@astrojs/compiler` + `experimental_AstroContainer` for component/page rendering tests, `node --test` with `experimental-strip-types` for pure `.ts` unit tests.

**Reference Spec:** `docs/superpowers/specs/2026-04-18-home-categories-design.md`.

---

## File Structure

### Create

- `src/components/HomeCategories.astro` — quiet Categories block used on both home pages. Takes `{ lang, categories: { name, count }[] }` and renders a `<section>` with an eyebrow heading and a divided list of `<a>` rows. Returns nothing when `categories` is empty.
- `tests/count-label.test.ts` — unit tests for the shared count-label helper.
- `tests/home-categories.test.mjs` — component-level and page-level tests for the Categories block and the rewired home pages.
- `docs/spec-home-categories.md` — SSOT for the home page Categories block (purpose, data contract, editorial guardrails, relation to the `/posts` ArchiveBrowse).

### Modify

- `src/utils/blog.ts` — add `getCountLabel(count, lang)` export.
- `src/components/ArchiveBrowse.astro` — replace the inline `getCountLabel` closure with the shared helper import.
- `src/pages/index.astro` — remove the `<section id="about">관심사 ...</section>` block; compute `categoryCounts` and `categories` the way `src/pages/posts/index.astro` does; render `<HomeCategories lang="ko" categories={...} />` in that slot.
- `src/pages/en/index.astro` — same treatment as the Korean home page: remove the English `Focus` section and render `<HomeCategories lang="en" categories={...} />` in the slot it vacates.
- `docs/spec-home-theme.md` — replace the outdated home page structure description with one that mentions the Categories block between hero and Recent Posts.
- `docs/spec-roadmap.md` — mark the "Add lighter browse entry points from the home page" Discovery step as landed.

---

## Tasks

### Task 1: Extract `getCountLabel` into `src/utils/blog.ts` with TDD

**Files:**
- Create: `tests/count-label.test.ts`
- Modify: `src/utils/blog.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/count-label.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getCountLabel } from "../src/utils/blog.ts";

test("getCountLabel returns Korean wording with the post count", () => {
	assert.equal(getCountLabel(0, "ko"), "0개의 글");
	assert.equal(getCountLabel(1, "ko"), "1개의 글");
	assert.equal(getCountLabel(7, "ko"), "7개의 글");
});

test("getCountLabel uses singular English wording for exactly one post", () => {
	assert.equal(getCountLabel(1, "en"), "1 post");
});

test("getCountLabel uses plural English wording for zero and for more than one post", () => {
	assert.equal(getCountLabel(0, "en"), "0 posts");
	assert.equal(getCountLabel(4, "en"), "4 posts");
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- tests/count-label.test.ts`
Expected: failing tests because `getCountLabel` is not yet exported from `src/utils/blog.ts`.

- [ ] **Step 3: Add the helper to `src/utils/blog.ts`**

Open `src/utils/blog.ts` and append this export (near the other locale-aware formatting helpers such as `formatReadingTime`):

```ts
export const getCountLabel = (count: number, lang: Locale) =>
	lang === "ko"
		? `${count}개의 글`
		: `${count} ${count === 1 ? "post" : "posts"}`;
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- tests/count-label.test.ts`
Expected: all three tests pass.

- [ ] **Step 5: Run the full test suite once to confirm no regression**

Run: `npm test`
Expected: suite pass count grows by 3 relative to the baseline (no failures).

- [ ] **Step 6: Commit**

```bash
git add src/utils/blog.ts tests/count-label.test.ts
git commit -m "$(cat <<'EOF'
feat: extract getCountLabel helper for locale-aware post counts

Adds a shared getCountLabel(count, lang) helper in src/utils/blog.ts so
ArchiveBrowse and the upcoming home Categories block can render the
exact same post-count wording for both locales, and drops the closure
that currently lives inside ArchiveBrowse.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Refactor `ArchiveBrowse.astro` to use the shared helper

**Files:**
- Modify: `src/components/ArchiveBrowse.astro`

- [ ] **Step 1: Add the import**

In `src/components/ArchiveBrowse.astro`, update the existing blog-utils import line so that `getCountLabel` is imported alongside the existing helpers:

Existing:

```ts
import { categoryHref, slugifyTaxonomy, tagHref } from "../utils/blog";
```

Replace with:

```ts
import { categoryHref, getCountLabel, slugifyTaxonomy, tagHref } from "../utils/blog";
```

- [ ] **Step 2: Remove the local closure**

Delete this block from the frontmatter of `src/components/ArchiveBrowse.astro`:

```ts
const getCountLabel = (count: number) =>
	lang === "ko" ? `${count}개의 글` : `${count} ${count === 1 ? "post" : "posts"}`;
```

The component body already calls `getCountLabel(category.count)`. Update the one call site to pass the current `lang` as the second argument:

Existing:

```astro
{getCountLabel(category.count)}
```

Replace with:

```astro
{getCountLabel(category.count, lang)}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests still pass. The existing `tests/archive-browse.test.ts` / `tests/archive-hub-structure.test.mjs` coverage should continue to match because wording is preserved byte-for-byte.

- [ ] **Step 4: Commit**

```bash
git add src/components/ArchiveBrowse.astro
git commit -m "$(cat <<'EOF'
refactor: use shared getCountLabel in ArchiveBrowse

Replaces the inline getCountLabel closure in ArchiveBrowse with the
shared helper from src/utils/blog so the upcoming home Categories block
can render identical post-count wording without duplicating the
formatting logic.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Build `HomeCategories.astro` with TDD

**Files:**
- Create: `tests/home-categories.test.mjs`
- Create: `src/components/HomeCategories.astro`

- [ ] **Step 1: Write the failing component tests**

Create `tests/home-categories.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoHomeCategoriesUrl = new URL(
	"../src/components/HomeCategories.astro",
	import.meta.url,
);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const repoBlogUrl = new URL("../src/utils/blog.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderHomeCategories(props) {
	const source = await readFile(repoHomeCategoriesUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoHomeCategoriesUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "home-categories-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const i18nStubPath = join(tempDir, "astro-i18n-stub.ts");
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
		await writeFile(
			i18nStubPath,
			[
				"export const getRelativeLocaleUrl = (locale, path) => `/${locale}/${path}/`;",
				"",
			].join("\n"),
		);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		rewritten = rewritten.replaceAll("astro:i18n", pathToFileURL(i18nStubPath).href);
		rewritten = rewritten.replaceAll("../i18n/ui", repoUiUrl);
		rewritten = rewritten.replaceAll("../utils/blog", repoBlogUrl);

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

const sampleCategories = [
	{ name: "백엔드", count: 4 },
	{ name: "MPC", count: 2 },
	{ name: "인프라", count: 3 },
];

test("HomeCategories renders an eyebrow heading and one row per category in order", async () => {
	const rendered = await renderHomeCategories({
		lang: "ko",
		categories: sampleCategories,
	});
	assert.match(rendered, /<section[^>]*data-home-categories/);
	assert.match(rendered, /카테고리/);
	const first = rendered.indexOf("백엔드");
	const second = rendered.indexOf("MPC");
	const third = rendered.indexOf("인프라");
	assert.ok(first >= 0 && second > first && third > second, "category order broken");
});

test("HomeCategories renders Korean post counts for each category", async () => {
	const rendered = await renderHomeCategories({
		lang: "ko",
		categories: sampleCategories,
	});
	assert.match(rendered, /4개의 글/);
	assert.match(rendered, /2개의 글/);
	assert.match(rendered, /3개의 글/);
});

test("HomeCategories renders English post counts with singular/plural wording", async () => {
	const rendered = await renderHomeCategories({
		lang: "en",
		categories: [
			{ name: "Backend", count: 1 },
			{ name: "MPC", count: 2 },
		],
	});
	assert.match(rendered, /Categories/);
	assert.match(rendered, /1 post[^s]/);
	assert.match(rendered, /2 posts/);
});

test("HomeCategories links each row to the locale-aware category page", async () => {
	const koRendered = await renderHomeCategories({
		lang: "ko",
		categories: sampleCategories,
	});
	assert.match(koRendered, /<a[^>]*href="\/category\/[^"]+"/);

	const enRendered = await renderHomeCategories({
		lang: "en",
		categories: [{ name: "Backend", count: 1 }],
	});
	assert.match(enRendered, /<a[^>]*href="\/en\/category\/backend\/"/);
});

test("HomeCategories renders nothing when the categories array is empty", async () => {
	const rendered = await renderHomeCategories({
		lang: "ko",
		categories: [],
	});
	assert.doesNotMatch(rendered, /data-home-categories/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- tests/home-categories.test.mjs`
Expected: failing tests because the component does not exist yet.

- [ ] **Step 3: Implement the component**

Create `src/components/HomeCategories.astro`:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n";
import { defaultLocale, type Locale, isLocale } from "../i18n/ui";
import { categoryHref, getCountLabel, slugifyTaxonomy } from "../utils/blog";

interface Category {
	name: string;
	count: number;
}

interface Props {
	lang?: Locale;
	categories: Category[];
}

const { lang: langProp, categories } = Astro.props;
const lang = isLocale(langProp) ? langProp : defaultLocale;
const heading = lang === "ko" ? "카테고리" : "Categories";

const getCategoryLink = (category: string) =>
	lang === defaultLocale
		? categoryHref(category)
		: getRelativeLocaleUrl(lang, `category/${slugifyTaxonomy(category)}`);
---

{
	categories.length > 0 && (
		<section
			data-home-categories
			class="mt-16 space-y-6 border-t border-stone-200 pt-10 dark:border-stone-800"
		>
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
				{heading}
			</p>
			<ul class="divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800">
				{categories.map((category) => (
					<li>
						<a
							href={getCategoryLink(category.name)}
							class="group flex items-baseline justify-between gap-6 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
						>
							<span class="text-base text-stone-950 transition-colors group-hover:text-stone-700 dark:text-stone-50 dark:group-hover:text-stone-200">
								{category.name}
							</span>
							<span class="text-sm tabular-nums text-stone-500 dark:text-stone-400">
								{getCountLabel(category.count, lang)}
							</span>
						</a>
					</li>
				))}
			</ul>
		</section>
	)
}
```

- [ ] **Step 4: Run the component tests and confirm they pass**

Run: `npm test -- tests/home-categories.test.mjs`
Expected: all 5 tests pass.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/HomeCategories.astro tests/home-categories.test.mjs
git commit -m "$(cat <<'EOF'
feat: add HomeCategories component for the home page

Introduces a quiet, name + post-count list for the home page built on
top of the shared getCountLabel helper and the existing categoryHref
utilities. The section is intentionally lighter than ArchiveBrowse: no
descriptions and no tag row. When the categories array is empty the
whole section is skipped.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire `HomeCategories` into both home pages and drop `관심사` / `Focus`

**Files:**
- Modify: `tests/home-categories.test.mjs`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/en/index.astro`

- [ ] **Step 1: Extend the test file with failing page-level tests**

At the top of `tests/home-categories.test.mjs`, merge `mkdir` into the existing `node:fs/promises` import and `dirname` into the existing `node:path` import so the new helper can use them:

- `node:fs/promises` imports should become: `mkdir, mkdtemp, readFile, rm, writeFile`
- `node:path` imports should become: `dirname, join`

At the end of the file, append:

```js
async function renderHomePage(sourceUrl, posts) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "home-page-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const i18nStubPath = join(tempDir, "astro-i18n-stub.ts");
	const contentStubPath = join(tempDir, "astro-content-stub.ts");
	const isEnglishPage = sourceUrl.pathname.includes("/src/pages/en/");
	const pageDirectory = isEnglishPage
		? join(tempDir, "src", "pages", "en")
		: join(tempDir, "src", "pages");
	const pagePath = join(pageDirectory, "page.ts");
	const layoutStubPath = join(tempDir, "src", "layouts", "Layout.ts");
	const homeCategoriesStubPath = join(
		tempDir,
		"src",
		"components",
		"HomeCategories.ts",
	);

	try {
		await mkdir(dirname(layoutStubPath), { recursive: true });
		await mkdir(dirname(homeCategoriesStubPath), { recursive: true });
		await mkdir(pageDirectory, { recursive: true });
		await writeFile(
			runtimeStubPath,
			[
				`export * from ${JSON.stringify(astroRuntimeUrl)};`,
				"export const createMetadata = () => ({})",
				"",
			].join("\n"),
		);
		await writeFile(
			i18nStubPath,
			[
				"export const getRelativeLocaleUrl = (locale, path) => `/${locale}/${path}/`;",
				"",
			].join("\n"),
		);

		const layoutCompiled = await transform(
			[
				"---",
				"const { title = '', lang = 'en' } = Astro.props;",
				"---",
				'<div data-layout-title={title} data-layout-lang={lang}><slot /></div>',
				"",
			].join("\n"),
			{
				filename: join(tempDir, "LayoutStub.astro"),
				internalURL: "astro/runtime/server/index.js",
			},
		);
		await writeFile(
			layoutStubPath,
			layoutCompiled.code.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			),
		);

		const homeCategoriesStubCompiled = await transform(
			[
				"---",
				"const { lang = 'ko', categories = [] } = Astro.props;",
				"---",
				'<div',
				'  data-home-categories-stub',
				'  data-lang={lang}',
				'  data-names={categories.map((c) => c.name).join("|")}',
				'  data-counts={categories.map((c) => String(c.count)).join("|")}',
				"/>",
				"",
			].join("\n"),
			{
				filename: join(tempDir, "HomeCategoriesStub.astro"),
				internalURL: "astro/runtime/server/index.js",
			},
		);
		await writeFile(
			homeCategoriesStubPath,
			homeCategoriesStubCompiled.code.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			),
		);

		await writeFile(
			contentStubPath,
			[
				`const posts = JSON.parse(${JSON.stringify(JSON.stringify(posts))}).map((entry) => ({`,
				"  ...entry,",
				"  data: {",
				"    ...entry.data,",
				"    pubDate: new Date(entry.data.pubDate),",
				"  },",
				"}));",
				"export const getCollection = async (_name, filter) =>",
				"  posts.filter((entry) => (filter ? filter(entry) : true));",
				"",
			].join("\n"),
		);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		rewritten = rewritten.replaceAll("astro:i18n", pathToFileURL(i18nStubPath).href);
		rewritten = rewritten.replaceAll(
			"astro:content",
			pathToFileURL(contentStubPath).href,
		);

		for (const [find, replaceWith] of [
			["../layouts/Layout.astro", "../layouts/Layout.ts"],
			["../../layouts/Layout.astro", "../../layouts/Layout.ts"],
			["../components/HomeCategories.astro", "../components/HomeCategories.ts"],
			["../../components/HomeCategories.astro", "../../components/HomeCategories.ts"],
		]) {
			rewritten = rewritten.replaceAll(find, replaceWith);
		}

		await writeFile(pagePath, rewritten);

		const component = await import(pathToFileURL(pagePath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, {});
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

const samplePost = (id, pubDate, category) => ({
	id,
	slug: id.split("/").at(-1) ?? id,
	body: "",
	collection: "blog",
	data: {
		title: `Title for ${id}`,
		description: `Description for ${id}`,
		pubDate,
		category,
		tags: [],
	},
});

const koPosts = [
	samplePost("ko/one", "2026-04-10T00:00:00.000Z", "backend"),
	samplePost("ko/two", "2026-04-08T00:00:00.000Z", "infra"),
	samplePost("ko/three", "2026-04-05T00:00:00.000Z", "backend"),
	samplePost("ko/four", "2026-04-01T00:00:00.000Z", "mpc"),
];

const enPosts = [
	samplePost("en/one", "2026-04-11T00:00:00.000Z", "backend"),
	samplePost("en/two", "2026-04-06T00:00:00.000Z", "mpc"),
];

test("ko home page renders HomeCategories between the hero and Recent Posts and drops the 관심사 section", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/index.astro", import.meta.url),
		koPosts,
	);

	assert.match(rendered, /data-home-hero/);
	assert.match(rendered, /data-home-categories-stub/);
	assert.match(rendered, /data-lang="ko"/);
	assert.match(rendered, /data-names="backend\|infra\|mpc"/);
	assert.match(rendered, /data-counts="2\|1\|1"/);
	assert.doesNotMatch(rendered, /관심사/);
	assert.doesNotMatch(rendered, /id="about"/);

	const heroIndex = rendered.indexOf("data-home-hero");
	const categoriesIndex = rendered.indexOf("data-home-categories-stub");
	const postsIndex = rendered.indexOf("id=\"posts\"");
	assert.ok(
		heroIndex < categoriesIndex && categoriesIndex < postsIndex,
		"HomeCategories should sit between the hero and the Recent Posts section",
	);
});

test("en home page renders HomeCategories between the hero and Recent Posts and drops the Focus section", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/en/index.astro", import.meta.url),
		enPosts,
	);

	assert.match(rendered, /data-home-hero/);
	assert.match(rendered, /data-home-categories-stub/);
	assert.match(rendered, /data-lang="en"/);
	assert.match(rendered, /data-names="backend\|mpc"/);
	assert.match(rendered, /data-counts="1\|1"/);
	assert.doesNotMatch(rendered, />\s*Focus\s*</);
	assert.doesNotMatch(rendered, /id="about"/);

	const heroIndex = rendered.indexOf("data-home-hero");
	const categoriesIndex = rendered.indexOf("data-home-categories-stub");
	const postsIndex = rendered.indexOf("id=\"posts\"");
	assert.ok(
		heroIndex < categoriesIndex && categoriesIndex < postsIndex,
		"HomeCategories should sit between the hero and the Recent Posts section",
	);
});
```

- [ ] **Step 2: Run the tests and confirm the two new page-level tests fail**

Run: `npm test -- tests/home-categories.test.mjs`
Expected: the five component-level tests still pass; the two new page-level tests fail because `src/pages/index.astro` and `src/pages/en/index.astro` still render `관심사` / `Focus` and do not mount `HomeCategories`.

- [ ] **Step 3: Update `src/pages/index.astro`**

Replace the entire contents of `src/pages/index.astro` with:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n";
import { getCollection } from "astro:content";
import HomeCategories from "../components/HomeCategories.astro";
import Layout from "../layouts/Layout.astro";
import {
	getDisplayTitle,
	matchesLocale,
	sortPostsByDate,
	stripLocaleFromId,
	uniqueCategories,
} from "../utils/blog";

const posts = await getCollection("blog", ({ id }) => matchesLocale(id, "ko"));
const recentPosts = sortPostsByDate(posts).slice(0, 5);
const categoryCounts = posts.reduce((counts, post) => {
	const category = post.data.category;
	if (!category) return counts;

	counts.set(category, (counts.get(category) ?? 0) + 1);
	return counts;
}, new Map<string, number>());
const browseCategories = uniqueCategories(posts).map((name) => ({
	name,
	count: categoryCounts.get(name) ?? 0,
}));

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const legacyBlogUrl = "https://medium.com/@rlaace423";
---

<Layout
	title="홈 | sings.dev"
	description="백엔드 아키텍처, MPC 시스템, 인프라 라우팅에 대한 글을 모아 둔 공간입니다."
	lang="ko"
>
	<section
		data-legacy-notice
		class="space-y-5 rounded-2xl border border-sky-200 bg-sky-50/80 px-6 py-6 dark:border-sky-900/80 dark:bg-sky-950/30"
	>
		<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
			임시 안내
		</p>
		<h2 class="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 sm:text-3xl">
			새로운 블로그(여기!)를 개발 중입니다.
		</h2>
		<p class="max-w-2xl leading-8 text-stone-600 dark:text-stone-300">
			기존 글을 옮기는 동안에는 과거에 작성한 글을 Medium에서 먼저 확인하실
			수 있습니다. 새 사이트는 현재 순차적으로 정리하고 있습니다.
		</p>
		<a
			href={legacyBlogUrl}
			class="inline-flex w-fit items-center justify-center rounded-full bg-sky-600 px-7 py-4 text-lg font-semibold text-white shadow-lg shadow-sky-600/25 transition-colors hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus-visible:ring-sky-300 dark:focus-visible:ring-offset-stone-950"
		>
			현재 블로그로 이동
		</a>
	</section>

	<section data-home-hero class="mt-14 space-y-6">
		<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
			Backend architecture, MPC systems, and infrastructure routing
		</p>
		<h1 class="text-4xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 sm:text-5xl">
			오래 유지할 수 있는 시스템의 구조를 씁니다.
		</h1>
		<p class="max-w-2xl text-lg leading-8 text-stone-600 dark:text-stone-300">
			서비스 경계, TSS MPC 개발, 인프라 라우팅처럼 시스템의 복잡도를
			결정하는 지점을 주로 다룹니다. 글은 가능한 한 차분하고 읽기 쉬운
			형태로 정리합니다.
		</p>
		<p class="max-w-2xl leading-8 text-stone-600 dark:text-stone-300">
			화려한 장식보다 구조, 운영 감각, 구현상의 판단이 더 오래 남는다고
			생각하기 때문에, 화면 역시 그에 맞게 조용하게 유지합니다.
		</p>
	</section>

	<HomeCategories lang="ko" categories={browseCategories} />

	<section
		id="posts"
		class="mt-16 space-y-4 border-t border-stone-200 pt-10 dark:border-stone-800"
	>
		<div class="flex items-end justify-between gap-4">
			<div class="space-y-2">
				<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
					최근 글
				</p>
				<h2 class="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
					포스트
				</h2>
			</div>
			<a
				href={getRelativeLocaleUrl("ko", "posts")}
				class="text-sm text-stone-600 transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:text-stone-300 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
			>
				모든 글
			</a>
		</div>

		<ul class="mt-6 divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800">
			{
				recentPosts.map((post) => (
					<li class="py-8">
						<article class="space-y-3">
							<p class="text-sm text-stone-500 dark:text-stone-500">
								{formatDate(post.data.pubDate)}
							</p>
							<h3 class="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
								<a
									href={getRelativeLocaleUrl(
										"ko",
										`posts/${stripLocaleFromId(post.id)}`,
									)}
									class="transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:hover:text-stone-300 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
								>
									{getDisplayTitle(post)}
								</a>
							</h3>
							<p class="max-w-2xl leading-8 text-stone-600 dark:text-stone-300">
								{post.data.description}
							</p>
						</article>
					</li>
				))
			}
		</ul>
	</section>
</Layout>
```

- [ ] **Step 4: Update `src/pages/en/index.astro`**

Replace the entire contents of `src/pages/en/index.astro` with:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n";
import { getCollection } from "astro:content";
import HomeCategories from "../../components/HomeCategories.astro";
import Layout from "../../layouts/Layout.astro";
import {
	getDisplayTitle,
	matchesLocale,
	sortPostsByDate,
	stripLocaleFromId,
	uniqueCategories,
} from "../../utils/blog";

const posts = await getCollection("blog", ({ id }) => matchesLocale(id, "en"));
const recentPosts = sortPostsByDate(posts).slice(0, 5);
const categoryCounts = posts.reduce((counts, post) => {
	const category = post.data.category;
	if (!category) return counts;

	counts.set(category, (counts.get(category) ?? 0) + 1);
	return counts;
}, new Map<string, number>());
const browseCategories = uniqueCategories(posts).map((name) => ({
	name,
	count: categoryCounts.get(name) ?? 0,
}));

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const legacyBlogUrl = "https://medium.com/@rlaace423";
---

<Layout
	title="Home | sings.dev"
	description="Notes on backend architecture, MPC systems, and infrastructure routing."
	lang="en"
>
	<section
		data-legacy-notice
		class="space-y-5 rounded-2xl border border-sky-200 bg-sky-50/80 px-6 py-6 dark:border-sky-900/80 dark:bg-sky-950/30"
	>
		<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
			Temporary notice
		</p>
		<h2 class="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 sm:text-3xl">
			A new blog(HERE!) is currently under development.
		</h2>
		<p class="max-w-2xl leading-8 text-stone-600 dark:text-stone-300">
			While older writing is being migrated, past posts are still available on
			Medium. The new site is being rebuilt step by step.
		</p>
		<a
			href={legacyBlogUrl}
			class="inline-flex w-fit items-center justify-center rounded-full bg-sky-600 px-7 py-4 text-lg font-semibold text-white shadow-lg shadow-sky-600/25 transition-colors hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus-visible:ring-sky-300 dark:focus-visible:ring-offset-stone-950"
		>
			Go to blog
		</a>
	</section>

	<section data-home-hero class="mt-14 space-y-6">
		<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
			Backend architecture, MPC systems, and infrastructure routing
		</p>
		<h1 class="text-4xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 sm:text-5xl">
			I write about the systems behind reliable products.
		</h1>
		<p class="max-w-2xl text-lg leading-8 text-stone-600 dark:text-stone-300">
			This is a small home for notes on service boundaries, TSS MPC
			development, and infrastructure routing that stays readable even when the
			systems underneath it are not.
		</p>
		<p class="max-w-2xl leading-8 text-stone-600 dark:text-stone-300">
			The presentation stays intentionally quiet so architecture decisions,
			operational trade-offs, and implementation detail can stay at the center.
		</p>
	</section>

	<HomeCategories lang="en" categories={browseCategories} />

	<section
		id="posts"
		class="mt-16 space-y-4 border-t border-stone-200 pt-10 dark:border-stone-800"
	>
		<div class="flex items-end justify-between gap-4">
			<div class="space-y-2">
				<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
					Latest writing
				</p>
				<h2 class="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
					Recent Posts
				</h2>
			</div>
			<a
				href={getRelativeLocaleUrl("en", "posts")}
				class="text-sm text-stone-600 transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:text-stone-300 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
			>
				All posts
			</a>
		</div>

		<ul class="mt-6 divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800">
			{
				recentPosts.map((post) => (
					<li class="py-8">
						<article class="space-y-3">
							<p class="text-sm text-stone-500 dark:text-stone-500">
								{formatDate(post.data.pubDate)}
							</p>
							<h3 class="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
								<a
									href={getRelativeLocaleUrl(
										"en",
										`posts/${stripLocaleFromId(post.id)}`,
									)}
									class="transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:hover:text-stone-300 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
								>
									{getDisplayTitle(post)}
								</a>
							</h3>
							<p class="max-w-2xl leading-8 text-stone-600 dark:text-stone-300">
								{post.data.description}
							</p>
						</article>
					</li>
				))
			}
		</ul>
	</section>
</Layout>
```

- [ ] **Step 5: Check for stray `#about` references**

Run: `grep -rn "#about" src/ docs/ 2>/dev/null || true`

If the grep returns nothing related to the removed anchor, no follow-up is needed. If it does surface any internal link pointing at the removed home anchor, rewrite that link to use `getRelativeLocaleUrl(lang, "about")` or a hard-coded `/about` / `/en/about` URL as appropriate before committing.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the home-categories component tests, the new page-level tests, and the unchanged `tests/home-notice.test.mjs` (the temporary Medium notice is preserved verbatim, so its test should continue to pass).

- [ ] **Step 7: Commit**

```bash
git add tests/home-categories.test.mjs src/pages/index.astro src/pages/en/index.astro
git commit -m "$(cat <<'EOF'
feat: replace 관심사/Focus with HomeCategories on both home pages

Removes the redundant 관심사/Focus prose section and the id=about anchor
from the Korean and English home pages, and renders HomeCategories in
the vacated slot so the home has a quiet, name+count browse entry into
the category pages. The Korean and English versions are updated in the
same change to keep locale parity.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Documentation updates

**Files:**
- Create: `docs/spec-home-categories.md`
- Modify: `docs/spec-home-theme.md`
- Modify: `docs/spec-roadmap.md`

- [ ] **Step 1: Create `docs/spec-home-categories.md`**

Write exactly:

```markdown
# Spec: Home Categories Block

- **Goal**: Give home page readers a quiet, text-first entry point into category browsing so they can jump to a category page without going through `/posts` first.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. Home is the "quiet front door"; categories are the primary exploratory browse destination; tags stay secondary. The home Categories block must read as lighter than the `/posts` ArchiveBrowse so the hierarchy `home → /posts` remains visible.
- **Routes**:
  - Korean: `src/pages/index.astro` mounts `<HomeCategories lang="ko" ... />` between the hero and the Recent Posts section.
  - English: `src/pages/en/index.astro` mounts `<HomeCategories lang="en" ... />` in the same slot.
- **Component**: `src/components/HomeCategories.astro`
  - Props: `{ lang, categories: { name, count }[] }`.
  - Renders nothing when `categories` is empty.
  - Eyebrow heading `카테고리` / `Categories` styled with the shared uppercase tracked label pattern.
  - Divided list of rows, each a full-width link with the category name on the left and `getCountLabel(count, lang)` on the right.
- **Data Contract**:
  - Categories are derived by the page: filter the `blog` collection by locale, reduce post counts per category into a `Map<string, number>`, and map `uniqueCategories(posts)` into `{ name, count }` pairs.
  - Category order matches the `uniqueCategories` helper so the home block and the `/posts` ArchiveBrowse always list categories in the same order.
  - Categories with zero posts are implicitly excluded because `uniqueCategories` only returns categories present in the provided posts.
- **Shared Helper**: `getCountLabel(count, lang)` lives in `src/utils/blog.ts`. `ArchiveBrowse.astro` uses the same helper, so both surfaces render identical post-count wording.
- **Editorial Guardrails**:
  - No category descriptions on the home page. Descriptions live only on `/posts` ArchiveBrowse.
  - No tag UI on the home page. Tag entry points stay on `/posts` and on taxonomy pages.
  - No secondary "all categories" link from this block; the Recent Posts section below already surfaces `모든 글 → / All posts →` to `/posts`.
  - No pills, chips, cards, badges, or decorative icons. Rows are pure text with a hairline divider.
- **What To Avoid**:
  - Portal-style category grids with thumbnails or post previews.
  - Popularity ranking, trending indicators, or reorder based on recency.
  - Merging categories with tags or search.
  - Restoring the `관심사` / `Focus` prose section anywhere on the home page; identity copy stays on `/about`.
```

- [ ] **Step 2: Commit Task 5 Step 1**

```bash
git add docs/spec-home-categories.md
git commit -m "$(cat <<'EOF'
docs: add home categories spec

Documents the home Categories block: data contract, shared getCountLabel
helper, lighter-than-ArchiveBrowse guardrails, and the editorial
constraints that keep the home page quieter than the /posts hub.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Update `docs/spec-home-theme.md` — home page section structure**

Find the `**Home Page Structure**:` block in `docs/spec-home-theme.md`. Replace the bullet list labelled "Each home page contains" with the expanded version below so the Categories block is part of the documented structure.

Old:

```markdown
  - Each home page contains:
    - A short hero/introduction section.
    - A recent posts section showing the latest 3 to 5 posts.
```

New:

```markdown
  - Each home page contains, in order:
    - A short hero/introduction section.
    - A Categories block (`src/components/HomeCategories.astro`) acting as a quiet browse entry point into category pages. See `docs/spec-home-categories.md`.
    - A recent posts section showing the latest 3 to 5 posts.
```

- [ ] **Step 4: Commit Task 5 Step 3**

```bash
git add docs/spec-home-theme.md
git commit -m "$(cat <<'EOF'
docs: note HomeCategories in home-theme spec

Updates the home page structure bullet list so it reflects the new
Categories block sitting between the hero and the Recent Posts section.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Update `docs/spec-roadmap.md` — Discovery status**

Find the `### 1. Discovery` section in `docs/spec-roadmap.md`. Replace the `**Current Status**` and `**Next Likely Work**` blocks with versions that mark the home browse entry point as landed.

Old:

```markdown
- **Current Status**:
  - Archive hub work is in place.
  - Category pages now act as shallow landing pages.
  - Tags remain secondary browse links.
  - Post-to-post reading flow is in place.
- **Next Likely Work**:
  - Add lighter browse entry points from the home page.
  - Continue refining category/tag browse structure without merging it with search.
  - Polish discovery wording and signposting only when it makes the site feel clearer without making it louder.
```

New:

```markdown
- **Current Status**:
  - Archive hub work is in place.
  - Category pages now act as shallow landing pages.
  - Tags remain secondary browse links.
  - Post-to-post reading flow is in place.
  - The home page now carries a quiet Categories block as a browse entry point (see `docs/spec-home-categories.md`).
- **Next Likely Work**:
  - Continue refining category/tag browse structure without merging it with search.
  - Polish discovery wording and signposting only when it makes the site feel clearer without making it louder.
```

Also update the `## Current State` bullet list by appending this bullet at the end of the list:

```markdown
- The home page now has a quiet Categories browse entry point; `관심사` / `Focus` prose is removed in favor of `/about` carrying identity copy.
```

- [ ] **Step 6: Commit Task 5 Step 5**

```bash
git add docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: mark home browse entry point landed in roadmap

Records that the home page Categories block is in place, drops the
matching Discovery "next likely" bullet, and notes that identity copy is
now concentrated on /about rather than duplicated on the home page.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Final test-suite pass**

Run: `npm test`
Expected: everything still green.

---

## Self-Review Checklist (for the executor)

Before declaring the plan complete:

1. Run `npm test` and confirm all tests pass.
2. Spot-check `/` and `/en/` in `npm run dev` to confirm the Categories block sits between the hero and the Recent Posts section, renders the correct category names + post counts, and links to `/category/[slug]` for the active locale.
3. Confirm the `/posts` archive still renders unchanged post-count wording (the refactor to the shared helper preserves byte-for-byte output).
4. Grep for stray `관심사` / `Focus` prose on the home pages — nothing related to the removed section should remain.
5. Re-read `docs/spec-home-categories.md`, `docs/spec-home-theme.md`, and `docs/spec-roadmap.md` and confirm they describe what actually shipped.
