# Spec: Blog Evolution Roadmap

- **Goal**: Keep the blog's next major improvement areas visible so future work stays aligned with the site's editorial philosophy.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md` as the top-level guardrail for all roadmap decisions.
- **Document Role**:
  - This is a high-level roadmap, not an implementation spec.
  - It tracks what the next major improvement areas are, why they matter, and what order they should be approached in.
  - Any concrete work from this roadmap should still get its own focused spec and plan before implementation.

## Current State

- The core editorial identity, base layout, archive structure, post detail structure, search, and i18n foundation are already in place.
- Discovery work has started and its first major step is complete: `/posts` now acts as a calmer archive hub with category-first browsing.
- The post-to-post reading flow is now in place: series-aware navigation and related reading appear below articles without making the site feel heavier.
- Shared assembled-title rules for series posts are now in place across detail pages, lists, related reading, and search-visible surfaces.
- The remaining work should continue to deepen the blog's usability without making it feel heavier, louder, or more product-like.
- `/about` now carries structured identity metadata (photo, summary, social links, experience) while the rest of the site stays text-first.
- The home page now has a quiet Categories browse entry point; `관심사` / `Focus` prose is removed in favor of `/about` carrying identity copy.
- Site-shell identity pass is in place: `SiteLogo` mark in the header, identity-forward hero eyebrow on the home pages, and a `Singing Developer` signature in the footer.
- Post bodies now support captioned figures: standalone markdown images are promoted to `<figure>` with the alt text reused as the caption, a `#wide` url fragment bleeds the figure outside the prose column on desktop, and every post now lives as a folder so images can co-locate with their post. See `docs/spec-post-detail.md` for the full figure rules.
- Draft mode is in place: posts with `draft: true` render under `astro dev` and disappear from every public surface under `astro build` (see `docs/spec-drafts.md`).
- Reading-comfort polish is in place: the light body bg is now `stone-100`, the dark body bg is a Tokyo Night Storm-inspired custom `night-800`, and the primary sans typeface is self-hosted Pretendard Std Variable (see `docs/spec-theme-typography.md`).
- Light-mode custom `dawn` palette + `terracotta-600` link accent + smooth theme-toggle transition landed. Body ink now bridges with dark mode via the shared hex `#24283b` (`dawn-800` / `night-800`); `.theme-transition` class produces a 250ms color fade only during toggle. See `docs/spec-theme-typography.md`.
- Discovery polish pass landed: `/posts` header is now eyebrow + `h1` only (descriptive lede dropped), category pages omit the description paragraph entirely when no description is configured, tag pages drop their filler lede line, the `/posts` filter section carries its own `추리기` / `Filter` eyebrow so it reads as in-page narrowing rather than navigation, and the `둘러보기` block's representative tags are now derived at build time as the top N by frequency instead of being hand-curated. See `docs/spec-posts.md` and `docs/spec-tags-categories.md`.
- Home hero refinement landed: the hero is now eyebrow + `h1` only (`시스템의 구조를 씁니다.` / `Notes on how systems hold together.`). Both body paragraphs were removed; the home page leans on the Categories block and Recent Posts beneath the hero to convey what the blog covers, instead of having the hero re-list topics or comment on its own quietness. See `docs/spec-home-theme.md` and `docs/spec-site-identity.md`.
- Optional summary aids landed: posts may declare an opt-in `summary` frontmatter field that renders as a quiet left-bordered block between the post header and the prose body, with a locale-aware `요약` / `Summary` eyebrow. Summaries stay editorial — not every post needs one, and posts without a summary render exactly as before. See `docs/spec-post-detail.md`.
- Callouts landed: GitHub-style admonitions (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`) are parsed at build time by `src/utils/remarkAdmonition.ts` and rendered as restrained four-sided boxes (2px type-color left accent + 1px hairline frame on the other three sides + 4px radius), with locale-aware uppercase labels. The visual register stays in the site's existing left-rail vocabulary. See `docs/spec-post-detail.md`.
- TOC scroll-spy landed: the desktop sticky TOC and the mobile `<details>` TOC mark the currently-visible H2 / H3 through a color shift, a 500-weight bump, and a 2px `::before` bar in the gap between the aside's left rail and the link text. The sticky offset was raised to clear the 85px header (`top-24` rail + matching `scroll-padding-top: 6rem` on `html`), so anchor jumps from TOC clicks land below the header rather than under it.
- Reading progress bar landed: a 2px hairline at the top of post detail pages tracks reader progress through the article's prose body (not full window scroll), so the bar reaches 100% the moment the prose ends rather than the moment the page ends. Mounted only on `[...slug].astro` pages; other surfaces stay free of this chrome. See `docs/spec-post-detail.md`.

## Priority Areas

### 1. Discovery

- **Intent**: Help readers find where to start and what to read next without turning the site into a portal.
- **Current Status**:
  - Archive hub work is in place.
  - Category pages now act as shallow landing pages.
  - Tags remain secondary browse links.
  - Post-to-post reading flow is in place.
  - The home page now carries a quiet Categories block as a browse entry point (see `docs/spec-home-categories.md`).
  - Discovery polish pass landed: filler lede paragraphs on `/posts`, category pages, and tag pages have been removed; the `/posts` filter section now reads as a distinct in-page narrowing tool via its own `추리기` / `Filter` eyebrow; representative tags on the `둘러보기` block are derived from actual post frequency at build time instead of being hand-curated.
- **Next Likely Work**:
  - Discovery is now in a steady state. Future tweaks should be reactive — only when a specific surface starts feeling unclear or noisy in real reading.
- **Avoid**:
  - Popularity widgets
  - Tag clouds
  - Thumbnail-first grids
  - Discovery UI that feels louder than the writing

### 2. Identity

- **Intent**: Make it clearer who is writing, what kinds of work or thinking the blog contains, and why the site feels the way it does.
- **Likely Surfaces**:
  - Home page introduction
  - About page
  - Author presence around posts
- **Current Status**:
  - `/about` has landed as a structured identity + job-search surface with photo, summary, socials, and experience (see `docs/spec-about.md`).
  - The header now carries the `SiteLogo` microphone mark next to the `sings.dev` text, and the footer carries a `Singing Developer` signature (see `docs/spec-site-identity.md`).
  - Home hero is finalized at eyebrow + single `h1` (`시스템의 구조를 씁니다.` / `Notes on how systems hold together.`); body prose has been removed entirely so the page leans on the Categories block and Recent Posts to convey what the blog covers.
- **Direction**:
  - Strengthen personality and authorship without drifting into branding or self-promotion.
  - Keep identity editorial and human, not corporate or portfolio-like.
  - Home remains the "quiet front door"; resume-flavored content stays scoped to `/about`.
- **Avoid**:
  - Marketing-style hero sections
  - Resume-site energy on the home page
  - Decorative identity elements that overshadow the writing

### 3. In-Post Reading Experience

- **Intent**: Make long posts easier to scan, understand, and stay with while preserving the writing's rhythm.
- **Current Status**:
  - Image captions and figure handling landed: see `docs/spec-post-detail.md` for the authoring convention and visual treatment, and `src/content/blog/{ko,en}/iam-policy-checklist/` for a coverage-fixture example post.
  - Optional summary aids landed: posts opt in via a `summary` frontmatter field, which renders as a quiet left-bordered block between the post header and the prose body. See `docs/spec-post-detail.md`.
  - Callouts landed: GitHub-style admonitions (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`) become four-sided boxes with a 2px type-color left accent and a 1px hairline frame on the other three sides, plus a small 4px radius. Locale-aware labels. See `docs/spec-post-detail.md`.
  - TOC scroll-spy landed: the active section is marked through a color shift, a 500-weight bump, and a 2px `::before` bar; sticky TOC was raised to `top-24` and `html` got `scroll-padding-top: 6rem` so the rail and anchor jumps clear the 85px header. See `docs/spec-post-detail.md`.
  - Reading progress bar landed: 2px hairline at viewport top, fills against the article's prose body so 100% lines up with "post finished," not "page finished." Mounted only on `[...slug].astro`. See `docs/spec-post-detail.md`.
- **Next Likely Work**:
  - Reactive only. The "Article structure cues" bucket is now closed; further reading-aid work happens only when an actual long post starts feeling unclear or noisy in practice.
- **Decided Not To Add** (handled by the writing itself, not by UI):
  - Section numbering on `H2` / `H3` — the H-level styling is the structure cue.
  - Per-section horizontal dividers — H2 spacing already separates sections.
  - Explicit "skip if you know X" or "prerequisites" UI blocks — express in prose; if a stronger visual is needed, a `> [!NOTE]` callout covers the case without a dedicated component.
  - Pull quotes / featured-sentence callouts — would feel decorative on a quiet, text-first site.
  - Footnotes / side-notes — same reasoning; parenthetical asides or callouts are enough.
  - Internal anchor jumps as a UI feature — Markdown heading anchors already exist; the author can link inside the same post during writing.
- **Direction**:
  - Prefer lightweight editorial aids over rigid templates.
  - Keep summaries optional rather than mandatory for every post.
  - Improve scanning without flattening tone or narrative flow.
  - When in doubt between a UI feature and an authorial habit, prefer the authorial habit.
- **Avoid**:
  - Mandatory TL;DR blocks on every post
  - Over-structured article chrome
  - UI patterns that make posts feel templated or mechanical

## Recommended Order

All three priority areas (Discovery, Identity, In-Post Reading Experience) are now in a steady state. The roadmap moves into reactive-only mode: future work begins when a specific surface starts feeling unclear or noisy in real reading or writing, not on a preemptive schedule.

When the next reactive item surfaces, route it back through the appropriate priority area above and treat the corresponding **Avoid** list as the first guardrail.

## Success Criteria

- The blog remains unmistakably calm, text-first, and personal.
- Readers can find relevant writing more easily without the site feeling heavier.
- The site's identity becomes clearer without drifting into marketing or portfolio patterns.
- Long posts become easier to read and scan without forcing every post into the same template.
