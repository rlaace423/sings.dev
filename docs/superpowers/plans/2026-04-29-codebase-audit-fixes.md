# Codebase Audit Fixes Implementation Plan

**Goal:** Land six targeted fixes from the 2026-04-29 codebase audit without regressing any landed feature. Two are real defects (Layout theme toggle leak, `/posts` filter script drift), one is a behavior bug exposed by an earlier fix (TOC scroll-spy ignores `scroll-padding-top`), one is a UX edge case (ReadingProgress short-post jump), and two are duplications worth extracting now (`prose-*` utility chain, locale-aware taxonomy URL helpers).

**Non-goals:**
- Reverting `scroll-padding-top: 6rem` on `html`. That value was added on purpose (commit `2b1e90e`) so anchor jumps and the sticky TOC rail clear the 85px header. The scroll-spy fix is in the trigger-line calculation, not in the scroll padding.
- Re-platforming, refactoring philosophy debates, or touching anything outside the six fixes below.
- Auditing test files themselves; they are treated as the contract that landed-features still pass.

**Architecture:** Each task is a small, self-contained change with concrete verification. The order is chosen so the lowest-risk single-line fixes land first and the broader refactors (utility chain extraction, helper signature change) land after, with tests gating every step.

**Reference:** Full audit findings are summarized in conversation history (2026-04-29). Each task below cites the specific file:line that motivated the change.

---

## File Structure

### Create

- (None.)

### Modify

- `src/layouts/Layout.astro` — wrap the body theme-toggle script in an idempotency guard.
- `src/pages/posts/index.astro`, `src/pages/en/posts/index.astro` — extract the inline filter script into a single shared module; the two pages keep only locale-specific label strings.
- `src/components/TOC.astro` — adjust the scroll-spy trigger line to subtract the header offset.
- `src/components/ReadingProgress.astro` — add a graceful-fill fallback for prose shorter than the viewport.
- `src/styles/global.css` — extract a `prose-site` component class so post detail and `/about` pages stop carrying a 600+ char duplicated utility chain.
- `src/pages/posts/[...slug].astro`, `src/pages/en/posts/[...slug].astro`, `src/pages/about.astro`, `src/pages/en/about.astro` — replace the duplicated prose utility chain with the new `prose-site` class.
- `src/utils/blog.ts` — make `categoryHref` and `tagHref` accept an optional `lang` parameter that returns a locale-aware URL.
- All consumers of `categoryHref` / `tagHref` (`ArchiveBrowse.astro`, `HomeCategories.astro`, `PostHeader.astro`, `PostList.astro`, `category/[category].astro` and the `en/` mirror, `tags/[tag].astro` and the `en/` mirror) — drop the `lang === defaultLocale ? helper(x) : getRelativeLocaleUrl(...)` ternary in favor of `helper(x, lang)`.

### Possibly modify (only if touched indirectly)

- Tests under `tests/` — only adjust if a structural assertion in `archive-hub-structure`, `post-detail-structure`, or `post-reading-flow-structure` references the exact duplicated string we are extracting. The current assertions match by regex on individual classes, so the extraction is expected to keep them passing without edits, but verify after each task.

---

## Tasks

### Task 1: Guard the Layout body theme-toggle against double-init

**Audit ref:** `src/layouts/Layout.astro:86-159` (audit finding #2 — HIGH).

**Why:** The body inline script binds a fresh `media.addEventListener('change', …)` on every page navigation. Each navigation stacks another listener on the OS color-scheme MediaQuery; an OS-level theme flip after N navigations triggers `applyTheme` N times and the `theme-transition` class flicks N times. The head script runs once before paint and is fine; the body script needs the same `__themeToggleInit` pattern that `TOC.astro`, `ReadingProgress.astro`, and `Header.astro` already use.

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1.1:** Wrap the body `<script is:inline>` in `if (window.__themeToggleInit) return; window.__themeToggleInit = true;` at the top of its IIFE. The head script stays untouched (it intentionally runs early and only sets the initial class).

- [ ] **Step 1.2 — Verification:**
  - `npm test` passes (118+ tests, none should fail; `theme-typography.test.mjs` covers the Layout class wiring but not the script idempotency).
  - `npm run build` succeeds.
  - In the dev preview, navigate Home → /posts → /posts/quiet-builds → /about. After each step, run `(matchMedia('(prefers-color-scheme: dark)').onchange ? 1 : 0)` in the console; the listener should be a single function reference, not stacking. If we cannot reach the listener directly because it is wrapped by a closure, verify by triggering an OS-level color-scheme change five times after five navigations and checking the `theme-transition` class adds / removes only once per change (use `MutationObserver` on `document.documentElement` `class` attribute).

**Risk + mitigation:** Lowest-risk task. The guard only no-ops the second invocation; if it never runs twice in normal flow, the change is invisible.

---

### Task 2: Extract the `/posts` filter script and remove drift

**Audit ref:** `src/pages/posts/index.astro:86-201` vs `src/pages/en/posts/index.astro:86-196` (audit finding #9 — HIGH).

**Why:** Two ~110-line `<script is:inline>` blocks are 95% identical. Only four label strings differ (`countAll`/`countUnit`/`filteredSuffix` for KO; the singular/plural noun + "match the current filters" / "in the archive" for EN). The class lists, button toggling, DOM lookups, and applyFilters body are character-for-character the same. A future bugfix in one will silently drift from the other.

**Approach:** Use Astro's `<script>` (NOT `is:inline`) with `define:vars` to inject the locale-specific strings. Astro will bundle the script once and dedupe across both pages.

**Files:**
- Modify: `src/pages/posts/index.astro`
- Modify: `src/pages/en/posts/index.astro`

- [ ] **Step 2.1:** In each archive page, replace the `<script is:inline>` block with `<script>` (no `is:inline`) that has `define:vars={{ countAllLabel, countUnitLabel, filteredSuffixLabel, singularPostLabel, pluralPostLabel, archiveSuffixLabel, matchSuffixLabel }}`. The KO page passes `{ countAllLabel: "총", countUnitLabel: "개의 글", filteredSuffixLabel: "조건에 맞음", singularPostLabel: null, pluralPostLabel: null, archiveSuffixLabel: null, matchSuffixLabel: null }`; the EN page passes `{ countAllLabel: null, countUnitLabel: null, filteredSuffixLabel: null, singularPostLabel: "post", pluralPostLabel: "posts", archiveSuffixLabel: "in the archive", matchSuffixLabel: "match the current filters" }`. Inside the script, branch on whichever language's strings are non-null when assembling the count text. (Alternative: pass a single `lang` and a labels record per locale; pick whichever reads cleaner.)

- [ ] **Step 2.2:** Verify the script body is now identical between the two pages by running `diff <(sed -n '/<script>/,/<\/script>/p' src/pages/posts/index.astro) <(sed -n '/<script>/,/<\/script>/p' src/pages/en/posts/index.astro)`. The diff must be limited to the `define:vars` line.

- [ ] **Step 2.3 — Verification:**
  - `npm test` passes.
  - `npm run build` succeeds; the resulting `dist/posts/index.html` and `dist/en/posts/index.html` should both contain the same compiled script `<script src="/_astro/...">` with the locale-specific JSON in `<script>window.__... = {...}</script>` (Astro's `define:vars` mechanism).
  - In dev preview, on `/posts/`: pick a category from the dropdown, then click two tag pills, confirm the count text reads `총 N개의 글 조건에 맞음` and items hide/show as before.
  - On `/en/posts/`: same flow, expect `N posts match the current filters` (or `N post …` for one match).
  - Clear filters; expect `총 X개의 글` / `X posts in the archive`.

**Risk + mitigation:** Medium. The KO and EN flow currently work; we must not regress either. The diff check in step 2.2 is the structural guarantee, and the dev-preview filter exercise covers behavior. If define:vars proves awkward, fall back to a small `src/utils/archiveFilter.ts` exporting a single `mountArchiveFilter(labels)` and call it from each page's `<script>`.

---

### Task 3: Header-aware trigger line in TOC scroll-spy

**Audit ref:** `src/components/TOC.astro:100-108` (audit finding #5 — MEDIUM).

**Why:** `triggerY = scrollY + innerHeight * 0.25`. After a TOC click, the browser scrolls so the heading lands at `y = scroll-padding-top` (96px), not `y = 0`. The scroll-spy treats the trigger as 25% from the very top, which sits well below the just-clicked heading. On dense H2/H3 layouts (closely-spaced headings), the next heading is also above the trigger by the time the click-scroll settles, so the active class jumps one row down immediately after click.

**Note (per user):** `scroll-padding-top: 6rem` on `html` stays. The fix is in the JS, not the CSS.

**Approach:** Subtract the header offset from the trigger calculation. Read `scroll-padding-top` once at init time (works because `<html>` is the singleton). Fall back to 0 if the property is `auto`.

**Files:**
- Modify: `src/components/TOC.astro`

- [ ] **Step 3.1:** At the top of the `init` function (after the `tocLinks` early return), compute `const headerOffset = parsePxOrZero(getComputedStyle(document.documentElement).scrollPaddingTop)` where `parsePxOrZero` is an inline helper that returns `0` for `"auto"` or unparseable values. Adjust the trigger line to `triggerY = window.scrollY + headerOffset + (window.innerHeight - headerOffset) * 0.25`. This places the trigger at 25% of the *visible* reading area below the header, instead of 25% of the full viewport.

- [ ] **Step 3.2 — Verification:**
  - `npm test` passes (existing scroll-spy structural assertions in `post-detail-structure.test.mjs` are about rendered HTML, not the trigger math).
  - In dev preview on `/posts/quiet-builds` (which has dense H2 + H3), click the TOC link for `성공 로그의 소음을 줄이기` (an H3). Immediately after the click-scroll settles, the active class should remain on `성공 로그의 소음을 줄이기` and not jump to `경로를 짧게 유지하기`. Then scroll manually downward; the active state should advance to `경로를 짧게 유지하기` only when that heading enters the trigger band.
  - Verify on a longer post (`routing-with-clarity` or `routing-story-start`) that scroll-spy still works through the full body.

**Risk + mitigation:** Low. The change is a single line of math. Even if `scroll-padding-top` is unset on a future surface that mounts TOC, the fallback yields `headerOffset = 0`, restoring the previous trigger.

---

### Task 4: Smooth ReadingProgress fill for short posts

**Audit ref:** `src/components/ReadingProgress.astro:45-58` (audit finding #4 — MEDIUM).

**Why:** When prose fits in the viewport (`scrollable <= 0`), the bar stays at 0% until `scrollY >= proseTop`, then snaps to 100%. For posts where the header + summary + tags push prose top below the fold, the user can scroll halfway down before hitting `proseTop`, the entire time the bar reads 0, then it snaps. The intent of the bar is to fill smoothly as the reader works through the post, regardless of whether the prose fits.

**Approach:** Interpolate progress over `[proseTop - innerHeight, proseTop]` when prose fits in the viewport. That maps "prose just enters the viewport bottom" to 0% and "prose top reaches viewport top" to 100%.

**Files:**
- Modify: `src/components/ReadingProgress.astro`

- [ ] **Step 4.1:** Replace the short-post branch:
  ```js
  } else if (window.scrollY >= proseTop) {
    progress = 1;
  }
  ```
  with:
  ```js
  } else {
    const enterStart = proseTop - window.innerHeight;
    const enterRange = window.innerHeight;
    progress = enterRange > 0
      ? (window.scrollY - enterStart) / enterRange
      : 1;
  }
  ```
  Keep the `if (progress < 0) progress = 0; if (progress > 1) progress = 1;` clamp; it now serves both branches.

- [ ] **Step 4.2 — Verification:**
  - `npm test` passes.
  - In dev preview, navigate to a short post — `first-post` and `quiet-builds` both qualify (prose ~800px, viewport 800-900px). Scroll smoothly from top to bottom and confirm the bar's fill grows continuously rather than snapping at one point.
  - Verify on a long post (`routing-with-clarity`) that behavior is unchanged: the original `scrollable > 0` branch handles it.

**Risk + mitigation:** Low. The fix only changes the short-post branch; the long-post branch (which is the common case) is untouched. The clamp guarantees the value stays in `[0, 1]` regardless of input.

---

### Task 5: Extract the `prose-site` component class

**Audit ref:** `src/pages/about.astro:31`, `src/pages/en/about.astro:31`, `src/pages/posts/[...slug].astro:93`, `src/pages/en/posts/[...slug].astro:93` (audit finding #10 — HIGH).

**Why:** A 600+ char string of `prose-*` utilities is duplicated four times. The post-detail variants add `mt-10` and `prose-headings:tracking-tight` but otherwise the strings are identical. Any palette tweak — and the dawn palette migration just had four files to edit — risks one of the four silently drifting.

**Approach:** Tailwind v4 lets us declare a component class in `@layer components`. Move the shared utility chain into one rule and apply `class="prose prose-site"` (or just `class="prose-site"` if the chain already includes `prose`) wherever the chain appeared.

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/pages/en/posts/[...slug].astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/en/about.astro`

- [ ] **Step 5.1:** In `src/styles/global.css`, add an `@layer components { .prose-site { @apply ...; } }` block that contains every utility from the shared chain except `mt-10` (post-detail-only) and `max-w-none` (varies by page). Keep `prose-headings:tracking-tight` in the shared block — it appears on both surfaces; the about pages just don't have headings tight enough to notice.

  Detailed list (light + dark) — to be confirmed during the diff sweep:
  ```
  prose
  prose-stone
  max-w-none (keep on both, varies; safer to include)
  prose-p:text-dawn-800 prose-headings:text-dawn-800 prose-headings:tracking-tight
  prose-a:text-terracotta-600 prose-a:decoration-terracotta-600/40 prose-a:underline-offset-4
  prose-blockquote:border-dawn-300 prose-blockquote:text-dawn-700
  prose-code:rounded prose-code:bg-dawn-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:text-dawn-800
  prose-code:before:content-none prose-code:after:content-none
  prose-pre:border prose-pre:border-dawn-300 prose-pre:bg-dawn-200
  dark:prose-invert dark:prose-p:text-night-50 dark:prose-headings:text-night-50
  dark:prose-a:text-night-100 dark:prose-a:decoration-night-400
  dark:prose-blockquote:border-night-500 dark:prose-blockquote:text-night-200
  dark:prose-code:bg-night-600 dark:prose-code:text-night-100
  dark:prose-pre:border-night-500 dark:prose-pre:bg-night-900
  ```

- [ ] **Step 5.2:** In each of the four pages, replace the long utility string with `class="prose-site mt-10"` (post detail) or `class="prose-site"` (about). Keep any non-prose utilities (e.g., a wrapping `data-pagefind-body` is on a parent and unaffected).

- [ ] **Step 5.3 — Verification:**
  - `npm test` passes. The structural assertions in `tests/post-detail-structure.test.mjs` and `tests/about-identity.test.mjs` test for the rendered output; they may match against specific Tailwind classes. Read each test before the change and confirm whether the assertions are class-string-based (which would fail) or DOM-structure-based (which would pass). If class-string assertions exist, update them to match the new `prose-site` class instead.
  - `npm run build` succeeds. Inspect the generated HTML for `/posts/quiet-builds` and `/about` and confirm the prose body styles are visually identical to before. Compare side-by-side: the Pretendard typeface, dawn link color, blockquote border, code-chip background must all render the same.
  - Run `diff` between pre-change and post-change `dist/posts/quiet-builds/index.html` (specifically the `<div class="...">` wrapping `<Content />`) — only the class attribute should differ; child markup must be byte-identical.

**Risk + mitigation:** The biggest risk is class-string-based test assertions failing. Pre-flight: grep tests for `prose-stone`, `prose-p:text-dawn-800`, `prose-blockquote:border-dawn-300`, etc. If any test asserts on the exact class string, decide whether to update the assertion (preferred — it's documentation drift) or to `@apply` the chain in a way that preserves the class names in HTML (Tailwind v4 `@apply` still puts the original utilities into the compiled CSS but the class attribute on the element is replaced by `prose-site`, so tests checking the attribute will need updates).

---

### Task 6: Add `lang` to `categoryHref` / `tagHref` and remove the locale ternary

**Audit ref:** `src/components/ArchiveBrowse.astro:36-44`, `HomeCategories.astro:20-23`, `PostHeader.astro:33-36,68-72`, `PostList.astro:48-56,87-95`, `category/[category].astro:71-75` and `en/category/[category].astro:69-74` (audit finding #11 — MEDIUM, also resolves audit finding #14).

**Why:** Five callers repeat `lang === defaultLocale ? categoryHref(name) : getRelativeLocaleUrl(lang, …)`. The category-page consumers (#14) skip the ternary and unconditionally use `getRelativeLocaleUrl` — functionally fine because `prefixDefaultLocale: false` makes the two paths agree, but it's a quiet inconsistency that masks the real fix. Threading `lang` into the helper kills the ternary and the inconsistency in one move.

**Approach:** Extend `categoryHref` and `tagHref` to accept an optional `lang` parameter. When `lang` is `undefined` or equal to `defaultLocale`, return the existing `/category/...` / `/tags/...` form (no prefix). When `lang` is a non-default locale, return the prefixed form (`/${lang}/category/...`). Update all callers.

**Files:**
- Modify: `src/utils/blog.ts`
- Modify: `src/components/ArchiveBrowse.astro`
- Modify: `src/components/HomeCategories.astro`
- Modify: `src/components/PostHeader.astro`
- Modify: `src/components/PostList.astro`
- Modify: `src/pages/category/[category].astro`
- Modify: `src/pages/en/category/[category].astro`
- Modify: `src/pages/tags/[tag].astro` (if it builds outbound links)
- Modify: `src/pages/en/tags/[tag].astro` (same)

- [ ] **Step 6.1:** In `src/utils/blog.ts`, change the signatures to:
  ```ts
  export const categoryHref = (
    category: string | null | undefined,
    lang?: Locale,
  ) => {
    const slug = slugifyTaxonomy(category);
    const prefix = lang && lang !== defaultLocale ? `/${lang}` : "";
    return `${prefix}/category/${slug}/`;
  };

  export const tagHref = (
    tag: string | null | undefined,
    lang?: Locale,
  ) => {
    const slug = slugifyTaxonomy(tag);
    const prefix = lang && lang !== defaultLocale ? `/${lang}` : "";
    return `${prefix}/tags/${slug}/`;
  };
  ```
  Import `defaultLocale` from `../i18n/ui`. The functions still work with no `lang` arg (returning the default-locale path), preserving any existing call site that passes only the taxonomy string.

- [ ] **Step 6.2:** In each consumer, replace the ternary with a single helper call:
  - `ArchiveBrowse.astro` lines 36-44 → `categoryHref(name, lang)` and `tagHref(tag, lang)`.
  - `HomeCategories.astro` lines 20-23 → `categoryHref(name, lang)`.
  - `PostHeader.astro` lines 33-36 (category link) and 68-72 (tag links) → `categoryHref(category, lang)` and `tagHref(tag, lang)`.
  - `PostList.astro` lines 48-56 (category) and 87-95 (tag) → same pattern.
  - `category/[category].astro` lines 71-75 (related-tag links) → `tagHref(tag, "ko")`.
  - `en/category/[category].astro` lines 69-74 (related-tag links) → `tagHref(tag, "en")`.
  - Tag pages, if they emit outbound category/tag links — verify and update or skip.

- [ ] **Step 6.3:** Drop the `getRelativeLocaleUrl` import from each updated file if it is no longer used. Do not remove it from files that still need it for non-taxonomy URLs (e.g., `posts` archive link).

- [ ] **Step 6.4 — Verification:**
  - `npm test` passes. The `archive-browse.test.ts` test currently asserts `href="/en/category/development"` and `href="/category/development/"` — both still hold after the helper change. `archive-hub-structure.test.mjs` also asserts on these href patterns. Pre-flight: grep tests for `categoryHref(` / `tagHref(` to find any direct assertion; update if needed.
  - `npm run build` succeeds. In the rendered HTML for `/posts/`, confirm the category links point to `/category/development/` (KO default-locale) without a `/ko/` prefix.
  - In the rendered HTML for `/en/posts/`, confirm the same links point to `/en/category/development/`.
  - Same exercise for tag links on a post detail page (`/posts/quiet-builds` and `/en/posts/quiet-builds`).

**Risk + mitigation:** Medium. The helper signature change is backward-compatible (existing zero-arg calls keep working), but the ternary deletions touch six files. Each ternary deletion is local and verifiable by reading the rendered HTML. Land all consumer edits in the same commit as the helper change so no intermediate state has callers that pass `lang` to a helper that ignores it.

---

## Order of Operations

1. **Task 1** (Layout theme toggle guard) — single-line, lowest risk. Land first as a baseline trust signal.
2. **Task 4** (ReadingProgress short-post fallback) — single-branch JS change, scoped and verifiable.
3. **Task 3** (TOC scroll-spy header offset) — single-formula JS change, scoped and verifiable.
4. **Task 2** (Filter script extraction) — broader edit, but fully verifiable via diff + behavioral test.
5. **Task 6** (Helper signature change + ternary removal) — touches multiple files; do after the smaller fixes have stabilized so any unrelated test failure surfaces are easy to attribute.
6. **Task 5** (`prose-site` extraction) — last because it has the highest test-update risk and the smallest behavioral payoff. Defer if any earlier task surfaces unexpected complexity.

After each task: `npm test`, `npm run build`, dev-preview spot check on the affected surface. Commit per task. Merge to `main` only after all six are landed and the full suite passes against the merged commit.

---

## Out of Scope (Audit Items Deferred)

These items from the audit are deliberately left for a later pass, either because they're "theoretical but functional today" or because they're better folded into the next reactive fix that touches the area:

- **#1** `stripLocaleFromId` defensive guard — no real entry point in current content layout; defer.
- **#3** Theme transition timeout vs CSS duration mismatch — no behavioral effect, defer.
- **#6** `remarkAdmonition` empty-body callout edge case — no realistic author flow exercises it, defer.
- **#7** SearchModal Pagefind `@ts-ignore` polish — defer.
- **#8** About-page missing-translation throw — already correct behavior; defer.
- **#12** `categoryCounts` reduce duplication — fold into the next file that touches archive-page reduce logic.
- **#13** Two `content/config.ts` files — Astro 6 convention check; defer to a separate Astro-upgrade pass.
- **#15** Header `pathWithoutLocale` regex edge cases — currently correct, defer.
- **#16** PostSeriesNav `currentIndex` clamp — defensive but harmless, defer.
- **#17** `remarkPostFigure` in-place mutation — only mattes if the same tree is re-processed, which it isn't, defer.
- **#18** TOC `offsetTop` vs `getBoundingClientRect` — works today; defer to whenever a wrapper acquires `position: relative`.

---

## Success Criteria

- All 131+ existing tests continue to pass after every task.
- `npm run build` succeeds after every task.
- Manual dev-preview spot checks confirm landed features (filters, theme toggle, scroll-spy, progress bar, sticky TOC, callout rendering, prose styling) all behave as before.
- Two real defects (Tasks 1, 2) are demonstrably fixed by their verification steps.
- Two duplications (Tasks 5, 6) are demonstrably consolidated; line count drops in the consumer files.
- Two UX edge cases (Tasks 3, 4) are demonstrably smoother in dev preview.
