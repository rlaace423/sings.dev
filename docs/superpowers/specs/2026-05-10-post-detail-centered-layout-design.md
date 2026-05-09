# Post Detail Centered Layout Design

**Date:** 2026-05-10

## Goal

Restructure the post detail page so the article body sits dead-centered on the viewport, and the table of contents overhangs the body's right edge as an absolutely-positioned satellite — the same reading-page pattern wormwlrm.github.io uses. This addresses two related complaints surfaced after the prose comfort bump (`docs/superpowers/specs/2026-05-10-prose-comfort-bump-design.md`): the article body reads narrow at ~600px effective width, and it sits visibly off-center (about 240px left of viewport center) because the TOC sidebar takes up the right 1/4 of a centered article container that itself caps at ~864px inside the site shell.

## Decision

- **Body wrapper**: `<div class="relative mx-auto max-w-3xl">` (768px max). Dead-centered via `mx-auto` within the unchanged Layout shell, which is itself centered on the viewport — so the body is dead-centered on the viewport at all viewport widths.
- **Desktop TOC overhang**: `<aside class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60">`. Anchored to the body wrapper's right edge via `left: 100%`. `inset-y-0` (top:0; bottom:0) stretches the aside to the full height of its relative-positioned ancestor (the article), so the sticky inner element has a scroll range matching the entire article body — equivalent to the current flex `align-items: stretch` behavior. Inside the aside, the existing sticky element keeps its current treatment: `<div class="sticky top-24 border-l border-dawn-300 pl-6 dark:border-night-600">`. Total reach beyond body's right edge: 240px (16px aside left padding + visible content area to the aside's right edge).
- **Mobile/tablet pattern**: existing `<details>` block at the top of the article stays exactly as it is, with one change — its trigger breakpoint moves from `md:hidden` to `xl:hidden`. Below xl viewport (1280px), readers see the same single-column body + collapsible TOC at top that mobile already shows.
- **Breakpoint**: `xl:` (1280px), Tailwind native. At exactly 1280px viewport, body 768 + gap 16 + TOC 240 = 1024px reach from the body's left edge, which puts the TOC's right edge at the viewport's right edge. Below xl, the overhang would clip outside the viewport, so the layout falls back to the mobile pattern.
- **Layout shell unchanged**: `src/layouts/Layout.astro` keeps its `max-w-4xl` (896px) wrapper. The shell has default `overflow: visible`, so the TOC overhang freely extends beyond the shell's right edge into the page's right margin at xl+ viewports. Other pages (home, archive, /about, taxonomy) are not touched and not affected — they have their own `contentClass` (default `max-w-3xl`) which constrains their content independently.
- **Article element**: `<article class="relative mx-auto max-w-3xl" data-pagefind-body>` replaces the prior `<article class="mx-auto max-w-5xl">` that wrapped a flex two-column layout. The `data-pagefind-body` attribute stays on the article so search indexing is unaffected.

## Why

- **The user's two complaints localize to the same root cause.** Body width at ~600px effective and body off-center by ~240px both come from the same flex-two-column-inside-a-shell construction: `<article max-w-5xl>` capped by parent `max-w-4xl` ≈ 864px effective, then split 3/4 (body) + 1/4 (TOC) with a 64px gap. Body becomes 600px and body's center sits 232px left of the article container's center, which is itself the viewport's center. Restructuring to body-centered + TOC-overhang-absolute fixes both at once: body is dead-centered on viewport; body's width grows from 600 to 768 (+168px or +28%) without taking from the TOC's space.
- **Why `max-w-3xl` (768px) for the body.** At 1.125rem prose, this gives ~43 Korean characters per line and ~85 English characters per line. Korean (35-50 char target) sits comfortably; English (50-75 char target) is on the wide side of comfortable but still readable, and matches the proportions on a hybrid Korean/English content blog. wormwlrm.github.io ships at ~700px wide (slightly more conservative for English-leaning content); 768px reads as the natural Tailwind step that keeps both languages comfortable. `max-w-2xl` (672px) and an arbitrary `max-w-[800px]` were both rejected — the first cramps Korean too narrow, the second crams English near 90 chars per line and isn't a Tailwind step.
- **Why `xl:` (1280px) for the desktop breakpoint.** With body dead-centered, the TOC outer box (`pl-4 w-60` → 240px wide, padding inside the box for visual gap) spans `[viewport_center + 384, viewport_center + 624]`. For the TOC's right edge to fit inside the viewport, viewport ≥ body_width + 2 × TOC_outer_width = 768 + 2 × 240 = **1248px** at minimum. Activating the desktop TOC at the next clean Tailwind step (`xl:` = 1280px) gives a comfortable 16px margin between the TOC's right edge and the viewport's right edge — better visual breathing than activating exactly at 1248 where the TOC would sit flush against the viewport edge. Custom breakpoints between 1248 and 1280 were considered: rejected because xl: is the cleanest Tailwind step and 32px of total slack at the breakpoint is small enough that the layout doesn't feel under-utilized. The cost is that tablets in landscape (typical iPad Pro at 1024-1366px) and small laptops (~1366px) lose the sidebar TOC and see the top-collapsed pattern instead. This affects readers in the 1024-1279px viewport band, which is a real but small segment, and the fallback is functional.
- **Why `position: absolute` + `left: 100%` for the TOC.** The TOC needs to (a) sit adjacent to the body's right edge with a visible-but-small gap, and (b) not affect the body's centering. A flex two-column layout would do (a) but not (b) — the body would re-center based on the body+TOC combo. An absolutely-positioned aside with `left: 100%` (anchored to body's right edge) decouples the TOC from the body's flow entirely: body centers based purely on its own `mx-auto`, TOC just rides along on the right. The same pattern is what wormwlrm uses (their `.css-lqnzgu` is `position: absolute; right: 0; transform: translateX(300px)`).
- **Why keep Layout.astro's shell unchanged.** The shell's `mx-auto max-w-4xl` doesn't actively constrain the new layout — the body wrapper inside is its own narrower max-w-3xl mx-auto, so the body is centered within the shell which is centered on viewport, and the math composes to body-on-viewport-center. The TOC's absolute overhang escapes the shell horizontally because `overflow: visible` is the default on the shell wrapper. Widening the shell would force every other page (home, archive, /about, taxonomy) to be re-evaluated — Footer would suddenly have more empty space to its right, etc. Leaving the shell alone keeps the change tightly scoped to the two post detail pages.
- **Why the breakpoint move from `md:` to `xl:` is acceptable for the tablet/small-laptop range.** Currently those viewports get the desktop sidebar TOC. After the change they get the mobile pattern. The mobile pattern already has feature parity with the sidebar (TOC content, scroll-spy active state if the user opens it, locale-aware labels) — it's just less prominent because it's collapsed by default. The visual hierarchy benefit of dead-centered body at xl+ outweighs losing the sidebar at the smaller viewport range.
- **Wide figure handling.** `figure[data-width="wide"]` currently bleeds `-4rem` (−64px) on each side of the prose column at `md:` and above. In the new layout, on xl+ viewports the wide-figure right bleed (body_right + 64) would visually collide with the TOC's leftmost gap (body_right + 16 to body_right + 256). However, **zero current posts use `#wide`** (`grep -rn '#wide' src/content/blog/` returns nothing). The feature stays defined; the corner case is documented in the spec doc update for future authors. Possible mitigations if usage starts: hide the right bleed at xl+, hide TOC when a wide figure is on screen, or reduce the bleed amount. None of these need to ship in this iteration since no content depends on the behavior.

## Scope

### In scope

- `src/pages/posts/[...slug].astro` — restructure the article element and its children:
  - Outer wrapper changes from `<article class="mx-auto max-w-5xl" data-pagefind-body>` to `<article class="relative mx-auto max-w-3xl" data-pagefind-body>`.
  - The `<div class="md:flex md:gap-16">` flex wrapper (line 73) is removed. Its inner two-column children dissolve back into the article: the `<div class="min-w-0 md:w-3/4">` body wrapper (line 74) is removed (its children now live directly inside `<article>`), and the `<aside class="hidden md:block md:w-1/4">` TOC wrapper (line 107) is repositioned and re-classed.
  - The mobile-style `<details>` TOC at the top of the article (line 75) keeps its content exactly the same; only its breakpoint trigger changes from `md:hidden` to `xl:hidden`.
  - The desktop TOC `<aside>` (line 107) becomes `<aside class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60">`, with the same inner `<div class="sticky top-24 border-l border-dawn-300 pl-6 dark:border-night-600">` and the same `<TOC>` component call.
- `src/pages/en/posts/[...slug].astro` — identical restructure.
- `tests/post-detail-structure.test.mjs` — add a small source-grep test asserting the new structure (article carries `relative mx-auto max-w-3xl`; aside carries `hidden xl:block absolute inset-y-0 left-full pl-4 w-60`; mobile details carries `xl:hidden`). Existing tests in this file render the page and assert on data attributes; those data attributes are unchanged so existing tests stay green.
- `docs/spec-post-detail.md` — rewrite the "Layout Change for Post Detail" section to reflect the new structure. Add a single sentence flagging the wide-figure / TOC-overhang corner case for future authors.
- `docs/spec-roadmap.md` — append one Current State bullet recording the centered-layout iteration.

### Out of scope

- `src/layouts/Layout.astro` — unchanged. Shell stays at `max-w-4xl`.
- All other pages (`src/pages/index.astro`, `src/pages/en/index.astro`, `src/pages/about.astro`, `src/pages/posts/index.astro`, `src/pages/category/*`, `src/pages/tags/*`, etc.) — unchanged. Their `contentClass` defaults stay as-is.
- `src/components/TOC.astro` — unchanged. The scroll-spy script binds to `nav[data-toc]` regardless of position; absolute positioning of the parent `<aside>` doesn't affect the script.
- `src/components/ReadingProgress.astro`, `src/components/PostImageLightbox.astro`, `src/components/CodeCopyButton.astro` — unchanged. Each binds to `article .prose-site` or to elements inside the article body. Restructuring the article wrapper around the body doesn't change those selectors.
- `src/components/PostHeader.astro`, `src/components/PostSummary.astro`, `src/components/PostReadingFlow.astro`, `src/components/Comments.astro` — unchanged. They render inside the body wrapper exactly as before.
- Wide figure CSS (`.prose-site figure[data-width="wide"]` in `src/styles/global.css`) — unchanged. Documented as a corner case that has no current content using it.
- Body prose typography — unchanged. The 1.125rem `prose-lg` body and the four reading-prose `text-lg` echoes from the prior iteration stay exactly as shipped.
- Footer, Header, SearchModal, theme toggle, palette tokens — all unchanged.
- Mobile pattern itself — unchanged. The `<details>` block at the top of the article keeps its existing markup, content, eyebrow label, and styling.

## Architecture

### Viewport math

At a 1280px viewport (the lower edge of `xl:`), the layout composes as follows:

| Element | Left edge | Right edge | Width |
|---|---|---|---|
| Viewport | 0 | 1280 | 1280 |
| Layout shell (`max-w-4xl mx-auto`, padding `px-6` on `sm:` and up = 24px each side) | 192 | 1088 | 896 |
| Shell content area (after padding) | 216 | 1064 | 848 |
| Body wrapper (`max-w-3xl mx-auto`) | 256 | 1024 | 768 |
| Body wrapper alignment | dead-centered on viewport (640) | | |
| TOC aside (`absolute left: 100%; pl-4; w-60`) | 1024 | 1264 | 240 |
| TOC's inner sticky div (`border-l pl-6` inside `pl-4` padding) | 1040 (after 16px aside pl-4) | 1264 | 224 |

At wider viewports (e.g., 1440px), the shell stays at 896px centered, body stays at 768px centered on viewport (now at 432-1200), TOC stays at body_right + 16 = 1216-1456, well within the 1440px viewport. The TOC's right edge is then at 1456, which is to the left of the viewport's right edge, so there's empty space to the TOC's right. That asymmetry is intentional — body is the focus, TOC is the satellite.

At narrower viewports (below xl, ≥768px = `md:`-`xl:` band), the desktop TOC is hidden (`hidden xl:block` resolves to display:none below xl), and the mobile-style `<details>` at the top of the article is visible (its `xl:hidden` resolves to display:block below xl). Body continues to be `max-w-3xl mx-auto` inside the shell, and the body is single-column at full body width.

### Class composition for the new structure

```astro
<Layout
  title={...}
  description={post.data.description}
  lang="ko"
  contentClass="max-w-none"
  ogType="article"
>
  <ReadingProgress />
  <CodeCopyButton />
  <article
    class="relative mx-auto max-w-3xl"
    data-pagefind-body
  >
    <details class="mb-10 rounded-lg border border-dawn-300 px-4 py-3 dark:border-night-600 xl:hidden">
      <summary class="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.18em] text-dawn-700 dark:text-night-200">
        목차
      </summary>
      <div class="mt-4 border-t border-dawn-300 pt-4 dark:border-night-600">
        <TOC headings={headings} title="이 글의 흐름" ariaLabel="목차" />
      </div>
    </details>

    <PostHeader ... />
    <PostSummary ... />

    <div class="prose-site mt-10 prose-headings:tracking-tight">
      <Content />
    </div>

    <PostReadingFlow ... />

    <div class="mt-16 border-t border-dawn-300 pt-10 dark:border-night-600">
      <Comments ... />
    </div>

    <aside class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60">
      <div class="sticky top-24 border-l border-dawn-300 pl-6 dark:border-night-600">
        <TOC headings={headings} title="이 글의 흐름" ariaLabel="목차" />
      </div>
    </aside>
  </article>

  <PostImageLightbox lang="ko" />
</Layout>
```

The EN counterpart uses the English TOC labels (`On this page`, `Table of contents`) and English `summary` text, identical structure otherwise. The `lang="ko"` / `"en"` props on `<Layout>`, `<PostHeader>`, etc. stay locale-correct.

### Why `position: absolute; left: 100%` works inside `mx-auto`

The body wrapper has `position: relative`. Its absolute child positions itself relative to that wrapper's box. `left: 100%` puts the child's left edge at the wrapper's right edge. The wrapper's box (768px wide) is centered by `mx-auto` on its parent (the Layout shell content area). The shell content area is itself centered on the viewport by the shell's `mx-auto`. So the wrapper's right edge is consistently at `viewport_center + 384` regardless of viewport width (subject to the wrapper actually being at its `max-w-3xl` ceiling — at viewports narrower than 768 + shell padding, it shrinks).

The TOC aside's `pl-4 w-60` then puts its content area starting at `wrapper_right + 16` and ending at `wrapper_right + 240`. These coordinates are independent of the shell's max-w-4xl ceiling — the absolute positioning escapes the shell's box even when it would otherwise be clipped. Combined with the shell's default `overflow: visible`, the TOC visually sits outside the shell's nominal right edge at xl+ viewports (where shell is 896px and TOC reach is 1024px from body's left edge).

### Test pattern

A new source-grep test in `tests/post-detail-structure.test.mjs` asserts:

```js
test("post detail pages restructure article to centered body + overhanging TOC", async () => {
    for (const path of ["pages/posts/[...slug].astro", "pages/en/posts/[...slug].astro"]) {
        const file = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
        // Article element wraps a centered, max-w-3xl, position: relative box for TOC absolute anchor.
        assert.match(
            file,
            /<article[^>]*class="relative mx-auto max-w-3xl"[^>]*data-pagefind-body/,
            `${path}: article should carry "relative mx-auto max-w-3xl" with data-pagefind-body`,
        );
        // Mobile details TOC is hidden at xl+.
        assert.match(
            file,
            /<details[^>]*class="[^"]*\bxl:hidden\b/,
            `${path}: mobile details TOC should be xl:hidden`,
        );
        // Desktop TOC aside overhangs at xl+ via absolute positioning.
        assert.match(
            file,
            /<aside[^>]*class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60"/,
            `${path}: desktop TOC aside should be the absolute overhang shape`,
        );
        // Old md: structure must not regress.
        assert.doesNotMatch(file, /md:flex md:gap-16/, `${path}: old md:flex layout should be removed`);
        assert.doesNotMatch(file, /md:w-3\/4/, `${path}: old md:w-3/4 body column should be removed`);
        assert.doesNotMatch(file, /hidden md:block md:w-1\/4/, `${path}: old md:w-1/4 TOC column should be removed`);
        assert.doesNotMatch(file, /max-w-5xl/, `${path}: old article max-w-5xl should be removed`);
    }
});
```

This test follows the same source-grep regression-guard pattern that `tests/theme-typography.test.mjs` already uses. Existing rendered-output tests in the same file (which assert on `data-pagefind-body`, `data-content`, `data-reading-flow`, etc.) keep passing because those data attributes are unchanged.

## Verification Target

- `npm test` passes.
- `npm run dev` renders post detail correctly at three viewport bands:
  - **≥1280px (xl+)**: body dead-centered on viewport (visually verifiable by eyeballing against the viewport center), TOC overhanging right adjacent to body's right edge, sticky TOC scrolls with the page until the article ends.
  - **768-1279px (md to xl-1)**: body single column centered in the shell (which is centered on viewport), no desktop sidebar TOC, mobile-style `<details>` at the top of the article is visible and works.
  - **<768px**: same single-column + top `<details>` pattern as the mid band.
- TOC scroll-spy active state still tracks the H2/H3 above the 25% viewport line. Both the desktop overhang TOC (xl+) and the mobile `<details>` TOC (below xl) get the active class on their links — the script's `linksByHash` map already iterates over both `nav[data-toc]` instances.
- Reading progress bar (3px hairline at top of viewport) still tracks article body scroll progress — the bar binds to `article .prose-site` which is unchanged.
- Image lightbox still opens for in-prose images — its activation script binds to `article .prose-site img`, unchanged.
- Code copy button still appears on `:hover` over `pre.astro-code` blocks — wrapper structure (the `.code-block` div around each `<pre>`) is unchanged.
- Post detail pages on both `/posts/<slug>/` (KO) and `/en/posts/<slug>/` (EN) verify equivalently.
- All other pages (`/`, `/en/`, `/posts/`, `/en/posts/`, `/about`, `/en/about`, `/category/<x>`, `/en/category/<x>`, `/tags/<x>`, `/en/tags/<x>`, `/404`) render identically to the prior state.

## Documentation

- **Update**: `docs/spec-post-detail.md` "Layout Change for Post Detail" section. The section currently documents the prior 2-column flex layout at `md:` and the mobile single-column + `<details>` pattern. Rewrite to describe the new desktop-only overhang at `xl:`, with the mobile pattern now extending up through the tablet/small-laptop band (768-1279px). Add a sentence flagging the wide-figure / TOC-overhang corner case for future authors who might use `#wide`.
- **Update**: `docs/spec-roadmap.md` — append one Current State bullet:
  > Post detail layout now centers the article body on the viewport with the TOC overhanging the body's right edge as an absolutely-positioned satellite at `xl:` (1280px) and above. Below `xl:`, the mobile pattern (single-column body + collapsible `<details>` TOC at top of article) extends up through the tablet/small-laptop band. Body width is `max-w-3xl` (768px) at all viewport widths the body fits in. See `docs/spec-post-detail.md` and `docs/superpowers/specs/2026-05-10-post-detail-centered-layout-design.md`.

## Alternatives Considered

- **Bump Layout.astro's shell from `max-w-4xl` to a wider value (e.g., `max-w-7xl`).** Rejected. The shell doesn't constrain the new layout — the body wrapper inside has its own narrower `max-w-3xl mx-auto`, so the body's centering composes correctly through the shell. Widening the shell would force re-evaluating Footer, every other page's contentClass, and the existing visual rhythm at narrower viewports. The change is unnecessary, and the cleanest scope keeps the shell untouched.
- **Body+TOC combo centered as a single unit (current structure but with a wider container).** Rejected. The user's first complaint was specifically that the body itself sits off-center. Keeping the body+TOC combo centered would only address the "body too narrow" complaint and leaves the body ~135px left of viewport center even after widening. The wormwlrm pattern (body dead-centered, TOC overhangs) addresses both complaints with the same change.
- **TOC at viewport's right edge (with empty space between body and TOC).** Rejected by the user during brainstorming. On a 1440px viewport with body 768px centered and TOC at the right edge, there'd be ~250-300px of empty space between body and TOC. This reads as "two disconnected columns" rather than "body with a satellite", and feels especially awkward on ultra-wide viewports.
- **Keep the desktop sidebar at `lg:` (1024px) and use a narrower TOC width (~180px) at `lg:` to fit overhang at narrower viewports.** Rejected. Narrower TOC = TOC links wrap or truncate, weakening the navigation value. Adding a "TOC width depends on viewport" rule introduces complexity that the simpler `xl:` fallback avoids. The mobile pattern at the 1024-1279 viewport band is functional.
- **`max-w-2xl` (672px) body width.** Rejected during brainstorming after side-by-side comparison with real post content (code blocks, tables, image, prose). 672px reads as more "essay-like" but cramps Korean closer to the lower edge of comfort and makes long code lines wrap more aggressively. 768px sits at the natural Tailwind step that works for both languages.
- **`max-w-[800px]` body width.** Rejected. 89 chars per line of English exceeds the typographic comfortable maximum (~75-80). 768px keeps the column noticeably narrower than the comfortable max for English while still being wide enough for Korean.
- **Asymmetric wide-figure bleed at `xl:` (right margin = 0, left margin = -4rem).** Rejected as out-of-scope for this iteration. No current post uses `#wide`. The wide-figure rule stays as documented; the corner case gets a single-sentence callout in `spec-post-detail.md` for future authors.
- **Drop the desktop sidebar TOC entirely and use only the mobile `<details>` pattern at all viewports.** Considered. Simplest and most uniform across all viewport bands. Rejected because the persistent sidebar is a meaningful navigation aid for long posts at desktop reading distances, and there's enough viewport real estate at xl+ to keep it. The mobile pattern is the right fallback for narrower viewports, not the right desktop default.
