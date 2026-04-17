# Home Categories Design

**Date:** 2026-04-18

## Goal

Give the home page a quiet, text-first entry point into category browsing so readers landing on `/` have a one-glance view of what the blog covers and can move straight into a category without going through `/posts`. This lands the first remaining Discovery step from `docs/spec-roadmap.md` ("Add lighter browse entry points from the home page") while keeping the home page explicitly quieter than the `/posts` archive hub.

## Decision

- Replace the existing `관심사` / `Focus` prose section on the home page with a new **Categories** block that lists each active category alongside a post count.
- Introduce a dedicated `src/components/HomeCategories.astro` component. Both localized home pages (`src/pages/index.astro`, `src/pages/en/index.astro`) consume it.
- Keep the block deliberately lighter than `src/components/ArchiveBrowse.astro`: no category descriptions and no tag row. The home block is a "what exists and how much" summary. Full browse, descriptions, and tag entry points remain on `/posts`.
- Extract the post-count label builder already inlined in `ArchiveBrowse.astro` (`getCountLabel`) into a shared helper in `src/utils/blog.ts` so both surfaces share wording and i18n behaviour.

## Why

- The home page's `관심사` / `Focus` paragraph overlapped significantly with the new structured `/about` page. Removing it cleans up identity duplication and opens a slot for a functional browse entry point.
- Categories are the **primary exploratory browse destination** per `docs/spec-editorial-philosophy.md`. Tags stay secondary; the home page is the wrong place to promote them.
- Home should feel like a "quiet front door". A miniature categories list with `name` + `count` gives readers immediate awareness of the site's shape without becoming a portal or dashboard.
- Keeping `/posts` as the full browse hub means the home block must be noticeably simpler than `ArchiveBrowse`. Descriptions belong on the hub page, not the front door.

## Scope

### In scope

- New component `src/components/HomeCategories.astro`.
- New helper in `src/utils/blog.ts` (`getCountLabel(count, lang)`), plus replacing the inline copy inside `src/components/ArchiveBrowse.astro` with the helper.
- Updates to `src/pages/index.astro` (KO) and `src/pages/en/index.astro` (EN):
  - Remove the `관심사` / `Focus` `<section>` including its `id="about"` anchor.
  - Compute `categoryCounts` + `categories` the same way `/posts` does, then render `<HomeCategories lang={...} categories={...} />` in the slot the removed section vacated.
- Tests in a new `tests/home-categories.test.mjs`:
  - Component-level: name + count + href rendering, preserved order, locale-aware count wording, empty-array guard (section is not rendered).
  - Page-level: both home pages render `HomeCategories` with the correct props, and the old `관심사` / `Focus` section is gone.
- Documentation: new SSOT `docs/spec-home-categories.md`; update `docs/spec-home-theme.md` to replace the `관심사` language with the Categories block; mark the roadmap Discovery step as landed.

### Out of scope

- Any tag-focused UI on the home page (tags stay only on `/posts` ArchiveBrowse and taxonomy pages).
- Home hero copy or tone changes — tracked under Identity roadmap priority #2.
- Header or Footer identity work.
- Retiring or downgrading the temporary `Medium` legacy-blog notice on the home page — a separate independent task.
- Any `/posts` redirect, pinning, or reordering.
- Any category description surface on the home page — descriptions stay on `/posts` ArchiveBrowse.

## Architecture

### Component: `src/components/HomeCategories.astro`

Props:

```ts
interface Category {
    name: string;
    count: number;
}

interface Props {
    lang: Locale;
    categories: Category[];
}
```

Behaviour:

- If `categories` is empty, the component renders nothing (the whole `<section>` is skipped). The home page still works when no posts exist yet in a locale.
- Otherwise it renders a `<section>` matching the home page's section rhythm (`border-t border-stone-200 pt-10 mt-16 dark:border-stone-800`).
- The heading is a small uppercase eyebrow — `카테고리` / `Categories` — styled as `text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500`.
- The list is a `<ul>` with `divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800`.
- Each `<li>` wraps a single `<a>` that is a `flex items-baseline justify-between gap-6 py-4` row. The link covers the whole row so the entire strip is clickable.
- Category name on the left: `text-base text-stone-950 transition-colors group-hover:text-stone-700 dark:text-stone-50 dark:group-hover:text-stone-200`.
- Count on the right: `text-sm tabular-nums text-stone-500 dark:text-stone-400`.
- Focus-visible ring uses the project-wide pattern (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950`).
- Hrefs use `categoryHref(name)` for the default locale and `getRelativeLocaleUrl(lang, \`category/\${slugifyTaxonomy(name)}\`)` for non-default locales, mirroring `ArchiveBrowse.astro`.
- Count wording comes from `getCountLabel(count, lang)` — see the helper below.

### Helper: `getCountLabel(count, lang)` in `src/utils/blog.ts`

Signature:

```ts
export const getCountLabel = (count: number, lang: Locale): string;
```

Returns:
- `ko`: `${count}개의 글`
- `en`: `${count} post` when `count === 1`, otherwise `${count} posts`

This preserves the exact wording `ArchiveBrowse.astro` uses today. `ArchiveBrowse.astro` is updated to import and call this helper instead of defining the local arrow function.

### Page integration (`src/pages/index.astro` and `src/pages/en/index.astro`)

- Import `HomeCategories`, `uniqueCategories`, and the shared count helper.
- Compute `categories` from the same locale-filtered post list the page already uses for `recentPosts`, and compute `categoryCounts` with the same reduction used in `/posts/index.astro`.
- Map to `{ name, count }` using `uniqueCategories(posts)` as the authoritative order (so the home block and `/posts` ArchiveBrowse show categories in the same order).
- Remove the `<section id="about">관심사 / Focus</section>` block from the page body.
- Render `<HomeCategories lang={...} categories={browseCategories} />` in the slot the removed section vacated, keeping the `mt-16 border-t pt-10` rhythm.
- Before committing, grep the repo for internal `#about` links that might have pointed at the removed anchor. If none exist, the removal is safe. If any exist, rewrite them to point at the `/about` page (using locale-aware `getRelativeLocaleUrl(lang, "about")` where appropriate) instead of an in-home hash.

### Data flow

`getCollection("blog", locale filter)` → `uniqueCategories` → `{ name, count }[]` → `HomeCategories`. No new content collection, no new frontmatter field, no schema change.

## Visual Treatment

```
EYEBROW   CATEGORIES
─────────────────────────────────────────── (border-t)
백엔드                             4개의 글
─────────────────────────────────────────── (divide-y)
MPC                                2개의 글
───────────────────────────────────────────
인프라                             3개의 글
```

- Eyebrow alignment and type scale exactly match the "최근 글 / Latest writing" eyebrow already used above the Recent Posts section, so the two home sections feel like siblings.
- Row separators use the same stone hairline treatment as `ArchiveBrowse` and the post list.
- No pills, chips, cards, icons, or decorative dividers. Pure text rows.

## Constraints

- No new npm packages (rules.md).
- No client-side JavaScript for this component. Purely static SSR.
- Do not restore `관심사` / `Focus` copy anywhere else on the home page — if any of that phrasing is still wanted site-wide it belongs on `/about`.
- Do not introduce category descriptions on the home page. Descriptions are `/posts`-only.
- Do not introduce tag UI on the home page (tags stay secondary per editorial philosophy).
- Keep KO/EN parity: every rendering change must land for both locales in the same commit-adjacent set.

## Verification Target

- Both `/` and `/en/` render a Categories block between the home hero and the Recent Posts section.
- Each row shows the correct category name and post count, and links to the corresponding `/category/[slug]` (or `/en/category/[slug]`) page.
- The order of categories on the home page matches the order on the `/posts` ArchiveBrowse.
- Home pages no longer contain a `관심사` / `Focus` prose section or an `id="about"` anchor.
- `ArchiveBrowse.astro` still renders the identical count wording, now via the shared helper.
- `npm test` passes: full baseline plus new `tests/home-categories.test.mjs` coverage for both the component and the two home pages.

## Test Plan

- `tests/home-categories.test.mjs` (new): component-level tests for render order, name + count + href output, locale-aware count wording, empty-array guard; page-level tests asserting both home pages mount `HomeCategories` with locale-correct props, and that the old `관심사` / `Focus` marker is absent. Reuse the Astro-compiler + experimental container scaffolding already used in `tests/about-identity.test.mjs`.
- Update `ArchiveBrowse.astro` consumers: no assertion changes expected since the helper preserves wording. Run the full suite to confirm no regressions.
- Spot-check `/` and `/en/` in `npm run dev` to confirm the placement and typography read as intended.

## Documentation

- New: `docs/spec-home-categories.md` — SSOT explaining the block's purpose, the lighter-than-`ArchiveBrowse` guardrail, the data contract, and what explicitly stays off the home page.
- Update: `docs/spec-home-theme.md` — replace the language describing the `관심사` section with the Categories block and clarify the home-page section order.
- Update: `docs/spec-roadmap.md` — under Discovery, mark "Add lighter browse entry points from the home page" as landed and note the remaining Discovery polish items.

## Alternatives Considered

- **Keep `관심사` and add Categories as an additional section.** Rejected: home grows a new section without retiring duplicated identity prose; fights the "quiet front door" principle.
- **Inline one-line categories strip (`백엔드 · MPC · 인프라`) instead of a vertical list.** Rejected: too compressed to read as an intentional browse entry point. Readers could miss it.
- **Vertical list with name + description but no count (miniature ArchiveBrowse).** Rejected: descriptions already live on `/posts`; the home block needs to feel different from the hub. Showing counts gives new information that readers can't get from `/posts` without scrolling.
- **Add a "모든 카테고리 보기" / "All categories" link under the list.** Rejected: the Recent Posts section below already surfaces a `모든 글 → / All posts →` link to `/posts`, which is the same destination. A second link would be redundant chrome.
