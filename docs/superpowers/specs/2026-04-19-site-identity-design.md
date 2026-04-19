# Site Identity Design

**Date:** 2026-04-19

## Goal

Strengthen the site's author identity at the site-shell level by (a) introducing a microphone mark that ties the site to the authors "노래하는 개발자 / Singing Developer" nickname, (b) upgrading the home page hero eyebrow from a topic list to an identity-plus-topics line, (c) adding a small author signature to the footer, and (d) fixing a mobile Korean header wrap bug that would otherwise be made worse by the wider logo. The outcome keeps the site quietly text-first while making the author noticeably present outside of `/about`.

## Decision

- Create a single new SSOT, `docs/spec-site-identity.md`, capturing the nickname origin, logo direction, and which site surfaces carry author identity.
- Introduce a new `src/components/SiteLogo.astro` component that renders a **simple SM58-style handheld vocal microphone** as inline SVG, using `currentColor` so the light and dark themes work without theme-specific assets.
- Update `src/components/Header.astro` so the left logo becomes `<SiteLogo /> sings.dev` instead of just `sings.dev`. Keep both the mark and the text.
- Update both home pages (`src/pages/index.astro`, `src/pages/en/index.astro`) so the hero eyebrow becomes `Singing Developer — Backend · MPC · Infrastructure`.
- Update `src/components/Footer.astro` so the copyright line reads `© <year> sings.dev — Singing Developer`.
- Fix the mobile Korean header wrap bug by:
  - Adding a character-break guard on the nav links so `포스트` cannot split mid-word.
  - Tightening the header control cluster's gaps at small viewport sizes.
  - Sizing the `SiteLogo` slightly smaller on mobile than on larger viewports.
- Do **not** touch the hero headline or body copy; the eyebrow swap is the only hero change in this iteration. The author will refine hero prose in a later pass.
- Do **not** add any extra navigation, search, or language affordances; do **not** introduce a mobile hamburger menu; do **not** add a tagline row in the header.

## Why

- The author is actively job-searching and the blog's identity is a real asset. `/about` already carries structured identity; the site shell (header + home hero + footer) should now echo that identity quietly so the site reads as "a person's blog" without needing the visitor to click into `/about`.
- The SM58-style handheld microphone is the right visual metaphor for "Singing Developer" — it is the microphone singers actually hold. The condenser stand microphone icon is overused in tech/podcast contexts and would look generic.
- Inline SVG matches every other icon on the header (search, theme toggle, SocialIcon) and keeps the project free of any image-asset pipeline or icon-library dependency.
- A light footer signature is the cheapest way to surface the nickname across every page without making any individual page feel like a portfolio.
- The hero eyebrow already exists and is cheap to repurpose. Turning it into an identity-plus-topics line preserves the current hero structure while giving the nickname a persistent place on the home page.
- The mobile Korean wrap bug is not a new issue this iteration introduces — CJK default word-breaking is already splitting `포스트` when the right cluster + logo get tight. Adding a mic icon will make it worse, so the fix must land together with the icon.

## Scope

### In scope

- `docs/spec-site-identity.md` (new SSOT).
- `src/components/SiteLogo.astro` (new component).
- `src/components/Header.astro` (swap text-only logo for `SiteLogo` + text, tighten mobile gaps, Korean-safe nav).
- `src/pages/index.astro` and `src/pages/en/index.astro` (hero eyebrow swap only).
- `src/components/Footer.astro` (copyright signature swap).
- Tests:
  - New `tests/site-logo.test.mjs` covering the SVG output, the `class` prop passthrough, and `aria-hidden` behavior.
  - Updated `tests/header-layout.test.mjs` to assert the new logo shape (logo mark + text sitting in the same inner container) and the Korean-safe nav attribute.
  - A new `tests/footer-signature.test.mjs` (or additions to an existing footer test if one appears) covering the signature string.
  - Update `tests/home-notice.test.mjs` if any of its existing assertions reference the old eyebrow verbatim; otherwise leave it.
- Documentation updates:
  - `docs/spec-layout.md` — Header description now says "text logo + microphone SVG mark", and Footer description now says "copyright signature".
  - `docs/spec-home-theme.md` — describe the hero eyebrow's new role (identity + topic areas) without pinning exact wording.
  - `docs/spec-roadmap.md` — move the Identity roadmap status forward: header + home hero eyebrow + footer signature landed; remaining Identity work is hero prose refinement (to be picked up later).

### Out of scope

- Any rewrite of the hero headline or the two paragraphs beneath it.
- Any rewrite of `/about` copy, structured frontmatter, or photo.
- Any change to the temporary Medium legacy notice (separate task).
- Any new navigation item, mobile menu, or language affordance.
- Any color change or theme-palette work.
- Any change to `/posts`, taxonomy pages, or post detail pages.

## Architecture

### Component: `src/components/SiteLogo.astro`

Props:

```ts
interface Props {
    class?: string;
}
```

Behavior:

- Renders a single `<svg viewBox="0 0 24 24">` with `aria-hidden="true"`, using `fill="none"` and `stroke="currentColor"`, matching the other header icons (`Header.astro`'s theme and search icons).
- Default class is `h-4 w-4 sm:h-5 sm:w-5` so the icon is a little smaller on mobile. Callers can override via the `class` prop.
- The shape is a simplified SM58 vocal microphone: a flattened circular grille ball near the top, a short neck, and a rounded-rectangle handle below. Two or three horizontal grille lines inside the ball give the "grille" reading without over-detailing.
- Uses `currentColor` throughout so the icon picks up the surrounding link color in both light and dark themes.

### Header: `src/components/Header.astro`

- The left-side `<a>` becomes `inline-flex items-center gap-2` and contains `<SiteLogo />` followed by a `<span>sings.dev</span>`. The overall link still points to the locale-aware home.
- The existing text styling (`text-base font-semibold tracking-tight text-stone-950 dark:text-stone-50 hover:...`) stays on the `<a>` so both the SVG (via `currentColor`) and the text react to hover in the same way.
- The right-side control cluster `<div>` gets `gap-2 sm:gap-3` (tightened on mobile, identical on small and larger viewports) instead of the current `gap-3`.
- The `<ul>` inside `<nav aria-label="Primary">` gets `gap-4 sm:gap-5` instead of the current `gap-5`.
- Each nav `<a>` gains `whitespace-nowrap` so `포스트` / `소개` / `Posts` / `About` cannot wrap mid-word. This is the Korean-safe guard; `whitespace-nowrap` handles both CJK and Latin text uniformly, which is why it is preferred over `break-keep` here.
- No other header changes. Search, language toggle, theme toggle, sticky behavior, backdrop-blur, full-bleed border — all untouched.

### Home page hero: `src/pages/index.astro` and `src/pages/en/index.astro`

- The hero eyebrow `<p>` text changes in both locales from its current topical copy to `Singing Developer — Backend · MPC · Infrastructure`.
- The eyebrow's container, typography, and surrounding sections (`data-home-hero` section, H1, body paragraphs, Categories block, Recent Posts) are unchanged.
- The KO locale keeps the English eyebrow text; this matches the existing convention where both home eyebrows currently share English copy.

### Footer: `src/components/Footer.astro`

- The copyright line becomes `© {year} sings.dev — Singing Developer`. Same typography, same container, same dark-mode classes.
- No new links, no new icons. The signature is text-only.

### Mobile Korean header wrap bug

- Root cause: the header's right cluster plus the logo is wide enough on iPhone-SE-class viewports that the flex container compresses the nav `<li>` items just enough for CJK default word-breaking to kick in, splitting `포스트` character-by-character. Combined with adding a new mic mark (about 24 additional horizontal pixels), the problem would become worse.
- Fix is three overlapping guards (all in `Header.astro`):
  1. `whitespace-nowrap` on each nav link so the text itself refuses to split.
  2. `gap-4 sm:gap-5` on the nav `<ul>` and `gap-2 sm:gap-3` on the right control cluster, freeing a few pixels at small widths.
  3. `SiteLogo` defaults to `h-4 w-4 sm:h-5 sm:w-5`, so the mark is slightly smaller on mobile.
- These guards are described in `docs/spec-layout.md` so future work understands why the mobile spacing is intentionally asymmetric.

## Visual Treatment

- Header (desktop): `🎤 sings.dev  ·························  Posts  About  🔍  EN  ☀` — mic + text on the left, nav + controls on the right with `justify-between`.
- Header (mobile, KO): `🎤 sings.dev · 포스트 소개 🔍 EN ☀` — tighter gaps keep everything on a single row, `포스트` never splits.
- Home hero eyebrow: `SINGING DEVELOPER — BACKEND · MPC · INFRASTRUCTURE` rendered with the existing `text-sm uppercase tracking-[0.18em] text-stone-500` treatment.
- Footer: `© 2026 sings.dev — Singing Developer` in the existing muted stone-400/500 palette. Still a single line.

## Constraints

- No new npm packages.
- No client-side JavaScript added by this iteration.
- No image asset is added for the logo. Logo lives as inline SVG in `SiteLogo.astro` only.
- Korean and English parity: every site-shell change must ship for both locales in the same iteration.
- The hero eyebrow must stay a single line on the narrow viewport. If the chosen copy ever overflows, revise the copy in a follow-up rather than loosening typography.
- No changes to identity copy inside `/about`, and no re-introduction of a per-post author block.

## Verification Target

- On both `/` and `/en/`, the hero eyebrow reads `Singing Developer — Backend · MPC · Infrastructure`.
- The header renders a microphone SVG immediately to the left of the `sings.dev` text, in both themes.
- On a 375-pixel-wide viewport, the Korean header nav renders `포스트` and `소개` on a single row with the logo, search, language toggle, and theme toggle.
- The footer reads `© <current year> sings.dev — Singing Developer` on every public page.
- `npm test` passes: existing suite plus the new `SiteLogo` tests, the updated header-layout tests, and the new footer-signature tests.
- `docs/spec-site-identity.md` exists and describes the nickname, logo direction, and surfaces that carry author identity.

## Test Plan

- **`tests/site-logo.test.mjs` (new)**: render the component with no props and with a class override, assert that the root `<svg>` appears with `aria-hidden="true"`, uses `viewBox="0 0 24 24"`, carries the default `h-4 w-4 sm:h-5 sm:w-5` classes when no `class` prop is provided, and that an explicit `class` prop overrides them.
- **`tests/header-layout.test.mjs` (update)**: existing assertions about the inner `max-w-4xl` container are preserved. New assertions verify that `SiteLogo` appears before the `sings.dev` text inside the logo link, that each nav link carries `whitespace-nowrap`, and that the right cluster uses `gap-2 sm:gap-3`.
- **`tests/footer-signature.test.mjs` (new, unless an existing footer test file already owns this)**: assert the rendered footer contains `© ` + the current year + ` sings.dev — Singing Developer` in that order.
- **`tests/home-notice.test.mjs` (check for regressions)**: none of that file's assertions pin the old eyebrow copy verbatim (they pin the hero H1 and the Medium notice), so the eyebrow change should leave it green. If the implementer finds a stale assertion, update it to reference the new eyebrow.

## Documentation

- **New**: `docs/spec-site-identity.md` — author nickname origin (노래하는 개발자 / Singing Developer), domain rationale, logo direction (SM58-style inline SVG), and the ordered list of site surfaces that carry author identity (header text + mark, home hero eyebrow, `/about` page, footer signature). Explicitly notes the "identity stays quiet" guardrail.
- **Update**: `docs/spec-layout.md` — Header description now mentions the text + microphone SVG logo and the Korean-safe nav guard (`whitespace-nowrap` + mobile gap compaction). Footer description mentions the "© year sings.dev — Singing Developer" signature.
- **Update**: `docs/spec-home-theme.md` — describe the eyebrow's role as "identity + primary topic areas" without pinning exact copy, so future hero tweaks don't force a spec edit.
- **Update**: `docs/spec-roadmap.md` — under Identity, move the Header + home eyebrow + footer signature items into `Current Status`; keep the hero prose refinement bullet as remaining work.

## Alternatives Considered

- **Text-only logo augmented with a `—` tagline** (no mic) — rejected: doesn't visually tie to "Singing Developer" the way a microphone does, and the extra text would worsen the mobile wrap issue.
- **Condenser stand microphone (studio style)** — rejected: visually reads as "podcasting/recording" rather than "singing", and the silhouette doesn't survive at 16×16 px.
- **Mic SVG only, drop the "sings.dev" text on mobile** — rejected: sacrifices brand-text recognition on the most common viewport and adds responsive complexity for a minor space win.
- **Introduce a mobile hamburger menu to reclaim space** — rejected: adds interaction chrome, violates the "quiet front door" philosophy, and is unnecessary given the nowrap + gap fix already frees enough room.
- **Put the author nickname into an extra header row** — rejected: adds visual weight and pushes content down on every page.
- **Rewrite the home hero headline and paragraphs now** — rejected: the author plans to revise hero prose after the layout work settles. Changing only the eyebrow now preserves that optionality.
