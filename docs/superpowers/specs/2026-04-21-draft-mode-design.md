# Draft Mode Design

**Date:** 2026-04-21

## Goal

Let the author stage blog posts in-repo without shipping them. A post with `draft: true` in its frontmatter is fully rendered in `astro dev` (so it can be previewed locally) and fully excluded from every public surface in `astro build` (archive lists, home recent posts, category and tag pages, post detail routes, related-reading suggestions, series navigation, Pagefind search index, and the sitemap).

## Decision

- Extend the `blog` collection schema in `src/content/config.ts` with an optional `draft: z.boolean().default(false)` field.
- Introduce a single shared helper `isVisiblePost(post, isDev?)` in `src/utils/blog.ts` that returns `true` when the post should be visible in the current build.
- Apply the helper in the `getCollection` predicate of every blog-reading page so that the filtered post list propagates to all downstream surfaces (related reading, series navigation, top-tag counts, etc.) automatically.
- Rely on Pagefind and `@astrojs/sitemap` inheriting behavior from the built route set — if a draft post's detail route is not generated in `astro build`, it cannot be indexed or listed anywhere downstream.
- Do not introduce a separate draft-preview route, env flag, or admin affordance. The dev-vs-build split is the entire contract.
- Author a new `docs/spec-drafts.md` SSOT and add a short pointer bullet in `docs/spec-posts.md`.

## Why

- Content migration from Medium is ongoing. Draft mode lets the author commit partially finished posts to the repo without publishing them, which is strictly better than branch-based staging for iteration over multiple sessions.
- Filtering at `getCollection` time means a single line per page change covers every downstream surface — related reading, series navigation, category pages, and so on — without needing a separate filter at each surface.
- Using `import.meta.env.DEV` as the dev/build switch is the Astro-native way to distinguish local preview from production, avoids adding any env-flag ceremony, and means `astro dev` automatically Just Works for authoring.
- Pagefind indexes built HTML only, and `@astrojs/sitemap` reads the generated route manifest. Because draft detail routes are not emitted by `getStaticPaths` in production, both integrations inherit the correct behavior with zero configuration.
- Astro's content collection schema already handles the required shape: `z.boolean().default(false)` guarantees the field is always defined after parsing, so consumers never need to guard for `undefined`.

## Scope

### In scope

- Schema change in `src/content/config.ts` (`draft` field on the `blog` collection).
- New helper `isVisiblePost(post, isDev?)` in `src/utils/blog.ts`.
- Per-page filter update in all blog-reading pages:
  - Home: `src/pages/index.astro`, `src/pages/en/index.astro`.
  - Archive: `src/pages/posts/index.astro`, `src/pages/en/posts/index.astro`.
  - Post detail `getStaticPaths`: `src/pages/posts/[...slug].astro`, `src/pages/en/posts/[...slug].astro`.
  - Category pages: `src/pages/category/[category].astro`, `src/pages/en/category/[category].astro`.
  - Tag pages: `src/pages/tags/[tag].astro`, `src/pages/en/tags/[tag].astro`.
- Unit tests for `isVisiblePost` covering the four combinations of `{ draft, isDev }`.
- Integration test confirming that when a draft post exists in the locale content, a production build (`isDev = false`) omits it from the archive page output, while a dev build (`isDev = true`) includes it.
- New SSOT `docs/spec-drafts.md`.
- Short pointer bullet in `docs/spec-posts.md` referencing the new spec.

### Out of scope

- Any UI affordance — badges, labels, or markers — that reveals which posts are drafts. Drafts are invisible in prod and plain posts in dev.
- A dedicated `/drafts` preview route in production.
- A `draftPreview` env flag. `import.meta.env.DEV` is the only switch.
- Any migration of existing dummy posts to add the field. The default is `false`, so existing posts stay published with no edits.
- Any change to Pagefind or sitemap configuration.
- Any change to frontmatter beyond adding the `draft` field.
- Any change to `/about` or static `pages` collection entries.

## Architecture

### Schema extension (`src/content/config.ts`)

Add `draft: z.boolean().optional().default(false)` to the `blog` schema. Field placement: after `tags`, before `series`, so the option order mirrors how it is likely to be authored (metadata → optional helpers → series).

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

### Helper (`src/utils/blog.ts`)

Append the following export near the other post-level helpers (after `sortPostsByDate`):

```ts
export const isVisiblePost = (
	post: BlogPost,
	isDev: boolean = Boolean(import.meta.env?.DEV),
): boolean => isDev || post.data.draft !== true;
```

Why the signature looks like this:

- Takes the full `BlogPost` (`CollectionEntry<"blog">`) so callers can read it directly from a `getCollection` predicate without destructuring.
- `isDev` is a second argument with a default derived from `import.meta.env.DEV`. The argument exists specifically so unit tests can exercise both branches without mocking the Vite env object.
- `import.meta.env?.DEV` is read defensively (optional chaining + `Boolean`) so the helper does not explode when run outside an Astro/Vite context (e.g., under `node --test` which does not populate `import.meta.env`).

### Page filter (`getCollection` predicates)

Every blog-reading page currently calls `getCollection("blog", ({ id }) => matchesLocale(id, "ko"))` (or `"en"`). The filter is extended to include `isVisiblePost(post)`:

```ts
const posts = await getCollection("blog", (post) =>
	matchesLocale(post.id, "ko") && isVisiblePost(post),
);
```

This is the single mechanical edit that must land in all ten pages. Downstream consumers inside each page (`sortPostsByDate`, `uniqueCategories`, `getRelatedPosts`, `getSeriesNavigation`, the reducer that builds `categoryCounts`, etc.) continue to operate on the already-filtered list with no further changes.

#### Post detail `getStaticPaths`

For `src/pages/posts/[...slug].astro` and `src/pages/en/posts/[...slug].astro`, the filter is inside `getStaticPaths`. Because draft posts are excluded from `getStaticPaths` in a production build, their routes are not emitted, and the build artifact simply does not contain them. Pagefind and the sitemap therefore do not reference them.

### Sitemap and Pagefind

No configuration changes. Both integrations consume the production route manifest and the built HTML respectively. Because draft routes and HTML do not exist in prod, both integrations are correct by default.

### Dev vs build contract

- `npm run dev` → `import.meta.env.DEV` is `true` → `isVisiblePost` always returns `true` → drafts are rendered as normal posts across every surface. The author can preview them at their real URL, see them in the home recent list, confirm how they interact with related reading, and so on.
- `npm run build` → `import.meta.env.DEV` is `false` → `isVisiblePost` returns `false` for drafts → drafts disappear from every surface, including their own detail route.

There is no third mode. No preview token, no auth-gated route, no build flag. The dev-vs-prod split is the entire public API of draft mode.

## Verification Target

- `npm run astro -- check` passes; the new `draft` field is typed and optional.
- `npm test` passes with the new unit and integration tests for `isVisiblePost` and the archive-level draft filtering behavior.
- `npm run build` succeeds and produces no route, no HTML, no sitemap entry, and no Pagefind result for any post whose frontmatter has `draft: true`.
- `npm run dev` renders the same post at its expected URL and shows it in the home recent list, archive, category, and tag surfaces where it would have appeared if it were published.
- Adding `draft: true` to an existing post and rebuilding cleanly removes it from the archive, home, category, tag, and detail surfaces without any other change.

## Test Plan

- **`tests/visible-post.test.ts` (new)** — four unit tests on `isVisiblePost`:
  - published post + `isDev = false` → `true`.
  - published post + `isDev = true` → `true`.
  - draft post + `isDev = false` → `false`.
  - draft post + `isDev = true` → `true`.
- **`tests/draft-filtering.test.ts` (new)** — integration test that takes a mixed list of `BlogPost` fixtures (including one with `draft: true`) and confirms:
  - Passing the list through `filter((p) => isVisiblePost(p, false))` drops the draft.
  - Passing the same list through `filter((p) => isVisiblePost(p, true))` keeps the draft.
  - Calling `sortPostsByDate`, `uniqueCategories`, and `uniqueTags` on the filtered list in the `isDev = false` case does not surface any metadata belonging to the draft post (proving that filtering at the top of the pipeline covers every downstream helper used by the pages).
- **No new Astro-container render tests.** The existing archive and post-detail structural tests continue to cover rendering. Because they do not feed draft fixtures, they remain green without edits.

## Documentation

- **New**: `docs/spec-drafts.md` — SSOT describing the draft field, the dev/prod contract, which surfaces are filtered (with the reasoning that all of them are filtered implicitly via the `getCollection` predicate change), and the editorial guardrail that drafts are silent in prod (no "draft" badge on any visible page, ever).
- **Update**: `docs/spec-posts.md` — add a single bullet under the `blog` schema requirements section pointing at `docs/spec-drafts.md` and noting that `draft` defaults to `false`.

## Alternatives Considered

- **Filter at the content-collection loader level.** Rejected: Astro's `glob` loader does not have access to parsed frontmatter, so draft information is not yet available at load time. Filtering in the `getCollection` predicate is the idiomatic Astro pattern.
- **Introduce a `DRAFT_PREVIEW=1` env flag in addition to `import.meta.env.DEV`.** Rejected as premature: the dev/prod split already covers authoring preview, and adding an env flag invites production-preview URLs that leak drafts. If a need arises later, this can be added without disrupting the existing contract.
- **Render drafts in prod behind a `/drafts/<slug>` preview route.** Rejected: this is an auth-gated surface in disguise, and the blog has no auth layer. Previewing in `astro dev` is sufficient and safer.
- **Show a "DRAFT" badge on draft posts when rendered in dev.** Rejected: drafts should render exactly as they will when published, so the author sees the real reading experience. A badge risks distracting from reviewing the actual post.
- **Keep draft status in a separate `unpublished/` directory instead of a frontmatter field.** Rejected: frontmatter is cheaper to toggle and preserves the post's path from the moment it is drafted, which is useful for stable inbound links during preview.
- **Default `draft` to `true` (opt-in publishing).** Rejected: this would silently unpublish every existing dummy post after the schema change. Default of `false` preserves the current visible post set and matches author intuition.
