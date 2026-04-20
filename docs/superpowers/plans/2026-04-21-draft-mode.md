# Draft Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `draft: boolean` frontmatter field to blog posts so draft entries render normally under `astro dev` and disappear from every public surface under `astro build`, with a single shared helper applied at each blog-reading page's `getCollection` predicate.

**Architecture:** Extend the `blog` collection schema in `src/content/config.ts` with an optional `draft` boolean (default `false`). Introduce `isVisiblePost(post, isDev?)` in `src/utils/blog.ts` that returns `true` whenever a post is not a draft or whenever the build is running in dev mode. Apply the helper inside every `getCollection("blog", ...)` predicate in the ten blog-reading pages so the filtered list propagates to all downstream helpers (sorting, taxonomy aggregation, related reading, series navigation) automatically. Pagefind and `@astrojs/sitemap` inherit the behavior because draft detail routes are not emitted by `getStaticPaths` in production.

**Tech Stack:** Astro 6 content collections with Zod schemas, TypeScript, `node --test` with `--experimental-strip-types` for pure `.ts` unit and integration tests, `import.meta.env.DEV` for the dev-vs-build switch.

**Reference Spec:** `docs/superpowers/specs/2026-04-21-draft-mode-design.md`.

---

## File Structure

### Create

- `tests/visible-post.test.ts` — four unit tests exercising every `{ draft, isDev }` combination of the helper.
- `tests/draft-filtering.test.ts` — integration test confirming the filter + downstream helper chain (`sortPostsByDate`, `uniqueCategories`, `uniqueTags`) drops draft metadata in prod mode and keeps it in dev mode.
- `docs/spec-drafts.md` — SSOT for the draft field, the dev-vs-build contract, and the editorial guardrail that drafts are silent in production.

### Modify

- `src/content/config.ts` — append `draft: z.boolean().optional().default(false)` to the `blog` schema.
- `src/utils/blog.ts` — append the `isVisiblePost` export alongside the other post-level helpers.
- Ten blog-reading pages gain one extra clause in their `getCollection` predicate and one new import from `../utils/blog` / `../../utils/blog`:
  - `src/pages/index.astro`
  - `src/pages/en/index.astro`
  - `src/pages/posts/index.astro`
  - `src/pages/en/posts/index.astro`
  - `src/pages/posts/[...slug].astro`
  - `src/pages/en/posts/[...slug].astro`
  - `src/pages/category/[category].astro`
  - `src/pages/en/category/[category].astro`
  - `src/pages/tags/[tag].astro`
  - `src/pages/en/tags/[tag].astro`
- `docs/spec-posts.md` — append a single bullet pointing at `docs/spec-drafts.md` and noting `draft` defaults to `false`.

---

## Tasks

### Task 1: Extend the `blog` collection schema with the `draft` field

**Files:**
- Modify: `src/content/config.ts`

- [ ] **Step 1: Update the `blog` schema**

In `src/content/config.ts`, extend the `blog` collection schema by inserting a single new line after the existing `tags` field and before the `series` field so the frontmatter fields read in metadata → optional flags → series order:

```ts
const blog = defineCollection({
	loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		category: z.string(),
		tags: z.array(z.string()).optional(),
		draft: z.boolean().optional().default(false),
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

- [ ] **Step 2: Verify content still type-checks**

Run: `npm run astro -- check`
Expected: the new `draft` field is accepted. Existing posts (which do not set `draft`) continue to validate because the field is `optional().default(false)`. No new content-schema errors introduced; any pre-existing warnings about other files are unrelated.

- [ ] **Step 3: Commit**

```bash
git add src/content/config.ts
git commit -m "$(cat <<'EOF'
feat: add optional draft field to blog schema

Extends the blog content collection schema with an optional draft
boolean that defaults to false so existing posts continue to render
unchanged, and the new field is available for the upcoming
isVisiblePost helper and per-page filters.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Introduce the `isVisiblePost` helper with TDD

**Files:**
- Create: `tests/visible-post.test.ts`
- Modify: `src/utils/blog.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/visible-post.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { isVisiblePost } from "../src/utils/blog.ts";

type TestPost = { data: { draft?: boolean } };

const published: TestPost = { data: { draft: false } };
const draft: TestPost = { data: { draft: true } };

test("isVisiblePost returns true for a published post in a production build", () => {
	assert.equal(isVisiblePost(published as never, false), true);
});

test("isVisiblePost returns true for a published post in a dev build", () => {
	assert.equal(isVisiblePost(published as never, true), true);
});

test("isVisiblePost returns false for a draft post in a production build", () => {
	assert.equal(isVisiblePost(draft as never, false), false);
});

test("isVisiblePost returns true for a draft post in a dev build", () => {
	assert.equal(isVisiblePost(draft as never, true), true);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- tests/visible-post.test.ts`
Expected: failing tests because `isVisiblePost` is not yet exported from `src/utils/blog.ts`.

- [ ] **Step 3: Add the helper to `src/utils/blog.ts`**

Append the following export to `src/utils/blog.ts`, placed directly below `sortPostsByDate` so the two post-level utilities sit together:

```ts
export const isVisiblePost = (
	post: BlogPost,
	isDev: boolean = Boolean(import.meta.env?.DEV),
): boolean => isDev || post.data.draft !== true;
```

The `BlogPost` alias already exists at the top of the file (`type BlogPost = CollectionEntry<"blog">`); no new imports are needed. The optional chaining on `import.meta.env?.DEV` keeps the helper safe when the module is imported from a context (like `node --test`) that does not populate the Vite env object.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- tests/visible-post.test.ts`
Expected: all four tests pass.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: the suite pass count grows by exactly 4; no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/utils/blog.ts tests/visible-post.test.ts
git commit -m "$(cat <<'EOF'
feat: add isVisiblePost helper for draft mode filtering

Introduces a shared isVisiblePost(post, isDev?) helper that returns
true when the post is not a draft or when the build is running in
dev mode. The isDev argument defaults to import.meta.env.DEV so page
callers can use it without wiring while unit tests still drive both
branches explicitly.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Integration test for the filter + downstream helpers

**Files:**
- Create: `tests/draft-filtering.test.ts`

- [ ] **Step 1: Write the integration tests**

Create `tests/draft-filtering.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
	isVisiblePost,
	sortPostsByDate,
	uniqueCategories,
	uniqueTags,
} from "../src/utils/blog.ts";

type Fixture = {
	id: string;
	slug: string;
	body: string;
	collection: "blog";
	data: {
		title: string;
		pubDate: Date;
		description: string;
		category: string;
		tags?: string[];
		draft?: boolean;
	};
};

const makePost = (id: string, overrides: Partial<Fixture["data"]> = {}): Fixture => ({
	id,
	slug: id.split("/").at(-1) ?? id,
	body: "",
	collection: "blog",
	data: {
		title: `Title for ${id}`,
		pubDate: new Date("2026-04-10T00:00:00.000Z"),
		description: "",
		category: "backend",
		tags: ["astro"],
		draft: false,
		...overrides,
	},
});

const fixtures: Fixture[] = [
	makePost("ko/first"),
	makePost("ko/second", {
		category: "mpc",
		tags: ["mpc", "cryptography"],
		pubDate: new Date("2026-04-12T00:00:00.000Z"),
	}),
	makePost("ko/draft-only", {
		category: "draft-secret",
		tags: ["private-wip"],
		pubDate: new Date("2026-04-15T00:00:00.000Z"),
		draft: true,
	}),
];

test("production filtering drops the draft post from the visible list", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, false));
	const ids = visible.map((post) => post.id);
	assert.deepEqual(ids.sort(), ["ko/first", "ko/second"]);
});

test("dev filtering keeps the draft post in the visible list", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, true));
	const ids = visible.map((post) => post.id);
	assert.deepEqual(ids.sort(), ["ko/draft-only", "ko/first", "ko/second"]);
});

test("sortPostsByDate on the prod-filtered list never surfaces the draft post", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, false));
	const sorted = sortPostsByDate(visible as never);
	assert.ok(sorted.every((post) => post.id !== "ko/draft-only"));
});

test("uniqueCategories on the prod-filtered list never surfaces the draft's category", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, false));
	const categories = uniqueCategories(visible as never);
	assert.ok(!categories.includes("draft-secret"));
});

test("uniqueTags on the prod-filtered list never surfaces the draft's tags", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, false));
	const tags = uniqueTags(visible as never);
	assert.ok(!tags.includes("private-wip"));
});

test("uniqueCategories on the dev-filtered list does include the draft's category", () => {
	const visible = fixtures.filter((post) => isVisiblePost(post as never, true));
	const categories = uniqueCategories(visible as never);
	assert.ok(categories.includes("draft-secret"));
});
```

- [ ] **Step 2: Run the integration tests**

Run: `npm test -- tests/draft-filtering.test.ts`
Expected: all six tests pass (they only depend on the helpers shipped in Tasks 1 and 2 plus the pre-existing `sortPostsByDate`, `uniqueCategories`, and `uniqueTags`).

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: suite pass count grows by 6; no regressions.

- [ ] **Step 4: Commit**

```bash
git add tests/draft-filtering.test.ts
git commit -m "$(cat <<'EOF'
test: cover the draft-filter + downstream helper chain

Adds integration tests that exercise the shared isVisiblePost filter
against sortPostsByDate, uniqueCategories, and uniqueTags so the
contract "filter at the top of each page propagates to every
downstream helper" has concrete regression coverage before pages
switch to the new predicate.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Apply the `isVisiblePost` filter to every blog-reading page

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/en/index.astro`
- Modify: `src/pages/posts/index.astro`
- Modify: `src/pages/en/posts/index.astro`
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/pages/en/posts/[...slug].astro`
- Modify: `src/pages/category/[category].astro`
- Modify: `src/pages/en/category/[category].astro`
- Modify: `src/pages/tags/[tag].astro`
- Modify: `src/pages/en/tags/[tag].astro`

All ten pages apply the same mechanical edit: import `isVisiblePost` alongside the other helpers already imported from `../utils/blog` (or `../../utils/blog`), and extend the `getCollection("blog", ...)` predicate so it destructures the full entry instead of just `id` and combines `matchesLocale(post.id, <lang>)` with `isVisiblePost(post)`.

- [ ] **Step 1: Update `src/pages/index.astro`**

Find the `import` block that pulls helpers from `"../utils/blog"` and add `isVisiblePost` to it. Then find the `getCollection("blog", ...)` call and replace the predicate.

Predicate change (old → new):

```ts
// before
await getCollection("blog", ({ id }) => matchesLocale(id, "ko"));
// after
await getCollection("blog", (post) => matchesLocale(post.id, "ko") && isVisiblePost(post));
```

- [ ] **Step 2: Update `src/pages/en/index.astro`**

Same edit as Step 1, except the import path is `"../../utils/blog"` and the locale literal is `"en"`:

```ts
// before
await getCollection("blog", ({ id }) => matchesLocale(id, "en"));
// after
await getCollection("blog", (post) => matchesLocale(post.id, "en") && isVisiblePost(post));
```

- [ ] **Step 3: Update `src/pages/posts/index.astro`**

Same edit as Step 1 (Korean locale, `"../utils/blog"` import path). Locate the `sortPostsByDate(await getCollection(...))` call and change the predicate in place:

```ts
// before
await getCollection("blog", ({ id }) => matchesLocale(id, "ko"));
// after
await getCollection("blog", (post) => matchesLocale(post.id, "ko") && isVisiblePost(post));
```

Add `isVisiblePost` to the existing `import { … } from "../../utils/blog";` statement.

- [ ] **Step 4: Update `src/pages/en/posts/index.astro`**

Same edit as Step 2 (English locale, `"../../../utils/blog"` import path):

```ts
// before
await getCollection("blog", ({ id }) => matchesLocale(id, "en"));
// after
await getCollection("blog", (post) => matchesLocale(post.id, "en") && isVisiblePost(post));
```

Add `isVisiblePost` to the existing `import { … } from "../../../utils/blog";` statement.

- [ ] **Step 5: Update `src/pages/posts/[...slug].astro`**

This page has two `getCollection` calls — one inside `getStaticPaths` (the route generator) and one inside the page body (used for related reading and series navigation). Both must receive the same predicate change:

```ts
// before (both call sites)
await getCollection("blog", ({ id }) => matchesLocale(id, "ko"));
// after (both call sites)
await getCollection("blog", (post) => matchesLocale(post.id, "ko") && isVisiblePost(post));
```

Add `isVisiblePost` to the existing `import { … } from "../../utils/blog";` statement.

The `getStaticPaths` change is the reason draft detail routes disappear from production output: their static paths are never generated, which in turn keeps them out of Pagefind and `@astrojs/sitemap`.

- [ ] **Step 6: Update `src/pages/en/posts/[...slug].astro`**

Same edit as Step 5 (English locale, `"../../../utils/blog"` import path), applied to both `getCollection` call sites:

```ts
// before (both call sites)
await getCollection("blog", ({ id }) => matchesLocale(id, "en"));
// after (both call sites)
await getCollection("blog", (post) => matchesLocale(post.id, "en") && isVisiblePost(post));
```

- [ ] **Step 7: Update `src/pages/category/[category].astro`**

Locate the `getCollection("blog", ...)` call inside `getStaticPaths` (which groups posts by category) and make the same predicate change:

```ts
// before
await getCollection("blog", ({ id }) => matchesLocale(id, "ko"));
// after
await getCollection("blog", (post) => matchesLocale(post.id, "ko") && isVisiblePost(post));
```

Add `isVisiblePost` to the existing `import { … } from "../../utils/blog";` statement.

- [ ] **Step 8: Update `src/pages/en/category/[category].astro`**

Same edit as Step 7, English locale with `"../../../utils/blog"` import path:

```ts
// before
await getCollection("blog", ({ id }) => matchesLocale(id, "en"));
// after
await getCollection("blog", (post) => matchesLocale(post.id, "en") && isVisiblePost(post));
```

- [ ] **Step 9: Update `src/pages/tags/[tag].astro`**

Locate the `getCollection("blog", ...)` call inside `getStaticPaths` (which groups posts by tag) and make the same predicate change:

```ts
// before
await getCollection("blog", ({ id }) => matchesLocale(id, "ko"));
// after
await getCollection("blog", (post) => matchesLocale(post.id, "ko") && isVisiblePost(post));
```

Add `isVisiblePost` to the existing `import { … } from "../../utils/blog";` statement.

- [ ] **Step 10: Update `src/pages/en/tags/[tag].astro`**

Same edit as Step 9, English locale with `"../../../utils/blog"` import path:

```ts
// before
await getCollection("blog", ({ id }) => matchesLocale(id, "en"));
// after
await getCollection("blog", (post) => matchesLocale(post.id, "en") && isVisiblePost(post));
```

- [ ] **Step 11: Verify no other `getCollection("blog", ...)` call was missed**

Run:

```bash
grep -n "getCollection(\"blog\"" src/pages src/components src/utils -r
```

Expected output: exactly the ten lines you updated across the ten page files. No call site in `src/components` or `src/utils` should hit `getCollection("blog", ...)` — if one appears, stop and report as `DONE_WITH_CONCERNS` because this plan did not account for it.

- [ ] **Step 12: Build check**

Run: `npm run astro -- check`
Expected: no new type errors. The new predicate passes `(post) => boolean` which is the expected signature.

- [ ] **Step 13: Run the full test suite**

Run: `npm test`
Expected: all tests pass. Existing page-level structural tests (archive, post-detail, home-categories, about-identity, etc.) do not feed draft fixtures, so they remain green.

- [ ] **Step 14: Commit**

```bash
git add src/pages/index.astro src/pages/en/index.astro src/pages/posts/index.astro src/pages/en/posts/index.astro "src/pages/posts/[...slug].astro" "src/pages/en/posts/[...slug].astro" "src/pages/category/[category].astro" "src/pages/en/category/[category].astro" "src/pages/tags/[tag].astro" "src/pages/en/tags/[tag].astro"
git commit -m "$(cat <<'EOF'
feat: hide draft posts from every public surface in production

Applies the shared isVisiblePost helper inside every getCollection
predicate across the ten blog-reading pages (home, archive, detail,
category, and tag for both locales). Drafts keep rendering under
astro dev, and their detail routes are excluded from getStaticPaths
in astro build so Pagefind and the sitemap inherit the correct
behavior without additional configuration.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Documentation

**Files:**
- Create: `docs/spec-drafts.md`
- Modify: `docs/spec-posts.md`
- Modify: `docs/spec-roadmap.md`

Three separate commits, one per file.

---

#### Sub-task 5a: Create `docs/spec-drafts.md`

- [ ] **Step 1: Write the file**

Create `docs/spec-drafts.md` with exactly this content:

```markdown
# Spec: Draft Mode

- **Goal**: Let the author stage blog posts in-repo without publishing them. A post with `draft: true` renders under `astro dev` and is fully hidden under `astro build`.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. Drafts must stay silent in production; the site exposes no "draft" badge, no preview route, and no affordance that hints at their existence to readers.
- **Schema**:
  - `draft` is an optional boolean field on the `blog` collection schema (`src/content/config.ts`).
  - Default is `false`, so existing posts that do not set the field continue to ship as published.
- **Dev vs Build Contract**:
  - Under `astro dev` (`import.meta.env.DEV === true`), drafts render everywhere — home recent list, archive, category and tag pages, post detail route, related reading suggestions, and series navigation.
  - Under `astro build` (production), drafts are excluded from every public surface. Their detail routes are not emitted by `getStaticPaths`, which in turn keeps them out of Pagefind and `@astrojs/sitemap` without any integration-level configuration.
  - There is no third mode, preview token, or auth-gated `/drafts` route.
- **Implementation Surface**:
  - Shared helper `isVisiblePost(post, isDev?)` in `src/utils/blog.ts`. Defaults `isDev` to `import.meta.env.DEV` and returns `true` when either the build is dev or the post is not a draft.
  - Every blog-reading page calls `getCollection("blog", (post) => matchesLocale(post.id, <lang>) && isVisiblePost(post))`. Downstream helpers (`sortPostsByDate`, `uniqueCategories`, `uniqueTags`, `getRelatedPosts`, `getSeriesNavigation`, category-count reducers) consume the already-filtered list.
- **Editorial Guardrails**:
  - Do not render a "DRAFT" badge, banner, or label anywhere, including under `astro dev`. The author reviews drafts in their real reading presentation.
  - Do not introduce a production preview route, link, or query parameter that reveals drafts.
  - Do not move drafts into a separate content directory. The frontmatter field is the only marker.
- **What To Avoid**:
  - A `DRAFT_PREVIEW=1` env flag that leaks drafts into production.
  - A separate preview build target or deploy pipeline for drafts.
  - Silently unpublishing existing posts by changing the default to `true`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/spec-drafts.md
git commit -m "$(cat <<'EOF'
docs: add draft mode spec

Adds the SSOT describing the draft frontmatter field, the
astro dev vs astro build contract, the shared isVisiblePost helper
and per-page predicate pattern, plus the guardrails that keep
drafts silent in production.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

#### Sub-task 5b: Update `docs/spec-posts.md`

- [ ] **Step 1: Add a draft bullet to the `blog` schema requirements**

Find the `blog` schema requirements list in `docs/spec-posts.md`. Look for the bullet describing `tags`:

```markdown
    - `tags` (array of strings, optional)
```

Immediately below it, insert:

```markdown
    - `draft` (boolean, optional, defaults to `false`) — see `docs/spec-drafts.md`
```

Do not modify any other bullet in that list.

- [ ] **Step 2: Commit**

```bash
git add docs/spec-posts.md
git commit -m "$(cat <<'EOF'
docs: note draft field on the blog schema in spec-posts

Cross-references docs/spec-drafts.md so readers of the main blog
content spec see the new optional field and know where the full
behavior lives.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

#### Sub-task 5c: Update `docs/spec-roadmap.md`

- [ ] **Step 1: Append a landed bullet to `## Current State`**

Find the `## Current State` bullet list at the top of `docs/spec-roadmap.md`. Append this new bullet at the end of that list, after the post-figures bullet:

```markdown
- Draft mode is in place: posts with `draft: true` render under `astro dev` and disappear from every public surface under `astro build` (see `docs/spec-drafts.md`).
```

Do not touch any other bullet or section in this file.

- [ ] **Step 2: Commit**

```bash
git add docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record draft mode landed in roadmap

Notes at the top of the roadmap that drafts now render under astro
dev and disappear under astro build, and points at the dedicated
spec for the full behavior contract.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Final test-suite pass**

Run: `npm test`
Expected: docs-only changes; the full suite stays green with the pass count equal to the baseline + 10 (4 unit tests from Task 2 + 6 integration tests from Task 3).

---

## Self-Review Checklist (for the executor)

Before declaring the plan complete:

1. Run `npm test` and confirm all tests pass.
2. Run `npm run astro -- check` and confirm no new type errors.
3. Add `draft: true` temporarily to one of the dummy posts under `src/content/blog/ko/` or `src/content/blog/en/`, then `npm run dev` and confirm the post still appears in home recent, archive, category, and tag surfaces. Remove the temporary change.
4. With `draft: true` still applied, run `npm run build` and confirm the draft's detail route is not emitted (no matching file under `dist/`), the archive HTML does not list it, and the sitemap XML does not reference it. Remove the temporary change.
5. Re-read `docs/spec-drafts.md`, `docs/spec-posts.md`, and `docs/spec-roadmap.md` and confirm they describe what actually shipped.
6. Confirm no `.md` file under `src/content/blog/` was accidentally left with `draft: true` from the dev-verification step.
