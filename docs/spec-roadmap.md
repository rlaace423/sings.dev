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

## Priority Areas

### 1. Discovery

- **Intent**: Help readers find where to start and what to read next without turning the site into a portal.
- **Current Status**:
  - Archive hub work is in place.
  - Category pages now act as shallow landing pages.
  - Tags remain secondary browse links.
  - Post-to-post reading flow is in place.
  - The home page now carries a quiet Categories block as a browse entry point (see `docs/spec-home-categories.md`).
- **Next Likely Work**:
  - Continue refining category/tag browse structure without merging it with search.
  - Polish discovery wording and signposting only when it makes the site feel clearer without making it louder.
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
  - The home hero eyebrow has been repurposed as an identity + primary topic areas line; hero headline and body prose refinement is still outstanding.
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
- **Remaining Surfaces**:
  - Article structure cues
  - Optional summary aids for suitable posts
  - Additional reading guidance inside long technical posts where the current flow is still too thin
- **Direction**:
  - Prefer lightweight editorial aids over rigid templates.
  - Keep summaries optional rather than mandatory for every post.
  - Improve scanning without flattening tone or narrative flow.
- **Avoid**:
  - Mandatory TL;DR blocks on every post
  - Over-structured article chrome
  - UI patterns that make posts feel templated or mechanical

## Recommended Order

1. Continue the remaining discovery work from the archive-hub foundation.
2. Strengthen identity once browse and navigation feel steady.
3. Refine in-post reading experience after the outer navigation and site voice are more settled.

## Success Criteria

- The blog remains unmistakably calm, text-first, and personal.
- Readers can find relevant writing more easily without the site feeling heavier.
- The site's identity becomes clearer without drifting into marketing or portfolio patterns.
- Long posts become easier to read and scan without forcing every post into the same template.
