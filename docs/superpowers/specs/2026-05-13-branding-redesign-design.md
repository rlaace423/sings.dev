# Spec: Branding Redesign — Terminal Prompt Wordmark (2026-05-13)

## Goal

Retire the microphone-icon-plus-text logo and the `노래하는 개발자` / `Singing Developer` nickname as user-visible brand assets, and replace them with a single terminal-prompt wordmark — `$ sings.dev` followed by a blinking block cursor — rendered in monospace with a warm amber accent on `$`, `.dev`, and the cursor. The domain `sings.dev` carries the entire brand; no separate nickname or descriptor appears in the site shell.

## Reference Philosophy

Follow `docs/spec-editorial-philosophy.md`. The brand stays quiet and editorial: a single line of "command-line" type as masthead, no slogan, no microphone, no nickname.

This spec **supersedes** the Logo Direction and Footer copyright sections of `docs/spec-site-identity.md`. The "Author Nickname" entry in that spec keeps a historical note (the domain `sings.dev` derives from `노래하는 개발자`) but the nickname stops being a user-visible asset on any surface. All references to the SM58-style microphone are removed.

## Why bare wordmark over inline-code wrap

Two strong variants were rendered during brainstorming:

- **Bare** — `$ sings.dev▌` in monospace, accent on `$`, `.dev`, and cursor, no surrounding box.
- **Inline-code wrap** — the same content inside a tinted rounded rectangle, like Markdown inline code.

The bare variant is chosen because it keeps the header chrome quiet (the blog leads with writing) while the prompt + cursor still carry the terminal register. The wrap variant adds visible weight that competes with article titles on post-detail pages, and tilts the brand from "the author types here" toward "the brand is a label." The bare variant pairs more directly with the existing `$ whoami?` mono link on the home page, so the two prompts read as the same voice across the header and the hero.

## Surfaces

- `src/components/Header.astro` — replaces the `SiteLogo` + `sings.dev` text combination with the new `SiteBrand` component.
- `src/components/SiteBrand.astro` — **new**, the wordmark + cursor.
- `src/components/SiteLogo.astro` — **deleted**.
- `src/components/Footer.astro` — copyright line copy change.
- `docs/spec-site-identity.md`, `docs/spec-layout.md` — updated to describe the new brand and footer line (see "Spec Documents to Update").

## Brand Markup

`SiteBrand.astro` renders one inline element. It takes no props.

Structure (semantic, not exact class list):

```astro
<span class="brand inline-flex items-baseline whitespace-nowrap font-mono">
  <span class="brand-prompt mr-2 text-amber-700 dark:text-amber-300">$</span>
  <span class="brand-name">sings</span>
  <span class="brand-tld text-amber-700 dark:text-amber-300">.dev</span>
  <span class="brand-cursor ml-1 text-amber-700 dark:text-amber-300" aria-hidden="true"></span>
</span>
```

- **Wrapper**: `inline-flex` so the cursor block aligns to the wordmark's baseline. `whitespace-nowrap` prevents the cursor from wrapping to a second line on narrow viewports.
- **Font**: `font-mono` switches the wordmark from Pretendard to the existing project mono stack (the same `font-mono` used by the home page's `$ whoami?` link).
- **Size / weight**: inherited from the parent `<a>`'s existing `text-base font-semibold tracking-tight`. The wrapper does not redeclare them. The brand stays one size on every viewport; on sub-sm widths it fits comfortably once the nav text labels hide (verified against a 375px mock).
- **`sings`**: inherits text color from the parent `<a>` (the existing `text-dawn-800 dark:text-night-50`). No accent.
- **`$`, `.dev`, cursor**: `text-amber-700 dark:text-amber-300` — the only accent on the page.
- **Spacing**: `mr-2` after `$`, `ml-1` before the cursor. Both intentional — `$` and the command read as separate tokens; the cursor reads as glued to `.dev`.

## Cursor

The cursor is a styled `<span>`, not a unicode `▌` character — the styled element gives consistent dimensions across font fallbacks.

CSS (lives next to `SiteBrand.astro` in a `<style>` block):

```css
.brand-cursor {
  display: inline-block;
  width: 0.55em;
  height: 1.05em;
  background: currentColor;
  vertical-align: -0.1em;
  animation: brand-cursor-blink 1s step-end infinite;
}

@keyframes brand-cursor-blink {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .brand-cursor { animation: none; }
}
```

- `step-end` gives a hard on/off blink (no fade) — the terminal feel.
- `1s` cycle = 0.5s on, 0.5s off.
- `currentColor` so the cursor inherits the amber accent set on the parent span (and falls back correctly if the accent token ever changes).
- `prefers-reduced-motion: reduce` pins the cursor visible. The design still reads as a terminal because the cursor character is there; only the blink stops.

The cursor is `aria-hidden="true"` because the visible blink doesn't carry semantic content — assistive tech reads `$ sings dot dev` already.

## Accent Color

The accent token pair is **`text-amber-700`** in light mode and **`text-amber-300`** in dark mode (Tailwind defaults: `#a16207` / `#fcd34d`). Reasoning:

- The site's `dawn-*` palette is warm-cream. Amber is in the same hue family — the accent reads as "part of the same palette, brighter" rather than as a foreign hue.
- Earlier brainstorming used violet placeholders; violet is cool and clashes with the warm dawn surface. Discard.
- Emerald terminal-green was considered. It would tilt the brand toward "90s CRT" nostalgia and would be the only cool hue in the warm palette. Discard.
- A subtle no-hue accent (`#cbd5e1`-ish) was considered. It loses the prompt's punctuation effect — `$` and `.dev` no longer read as the *highlighted* tokens. Discard.

Amber is not introduced as a sitewide accent. It appears only on the brand. No other surface (links, decorations, buttons) gains amber.

## Mobile Adaptation

Two changes shape the small-viewport header:

1. **Brand**: stays the same `text-base` size at every viewport, on a single line via `whitespace-nowrap`. No mobile shrink step — the brand fits once the nav text hides.
2. **Nav text labels**: the primary nav links (`포스트` / `소개`, `Posts` / `About`) hide on sub-sm viewports via `hidden sm:inline-block` (or the equivalent on the `<li>`). The right-side control cluster (search, locale switcher, theme toggle) stays as-is at all sizes.

Posts and About remain reachable on mobile through the home page: the `$ whoami?` link goes to `/about`, and the `모든 글` / `All posts` link in the Recent Posts row goes to `/posts`. Direct URLs continue to work everywhere. No hamburger menu, no icon-only fallback for the nav.

This is intentionally lossy on intermediate pages (e.g. on `/posts` a mobile reader has to return to home to reach `/about`). The trade is clean header chrome on small screens; mobile readers of a text-first blog tend to be reading a post end-to-end and then leaving, not hopping between nav surfaces.

## Footer

`Footer.astro` becomes:

```astro
<footer class="border-t border-dawn-300 py-6 text-sm text-dawn-600 dark:border-night-600 dark:text-night-300">
  <p>&copy; {year} sings.dev</p>
</footer>
```

The `— Singing Developer` suffix is removed. The footer keeps the `sings.dev` mark per the user's instruction; that single token plus the copyright year is the entire footer.

No new footer rows, icons, or links.

## Components

### `src/components/SiteBrand.astro` (new)

Renders the brand markup and the cursor CSS described above. No props. Inline `<style>` for the cursor animation and `prefers-reduced-motion` fallback; the rest of the styling uses Tailwind utility classes.

The component is `inline`-level so the parent `<a>` (in `Header.astro`) controls its own focus ring, hover color, and link semantics. The brand's own color tokens inherit through `currentColor` for `sings` and explicit `text-amber-*` for the accented tokens.

### `src/components/Header.astro` (modified)

- Drop the `import SiteLogo from "./SiteLogo.astro"` line.
- Replace the `<SiteLogo />` + `<span>sings.dev</span>` content of the home-link anchor with a single `<SiteBrand />`.
- The home-link anchor itself stays: same `href`, same focus / hover utility classes, same `aria-label` semantics (the visible brand acts as the accessible name).
- Add `hidden sm:inline-block` to each primary nav `<li>` (or equivalent wrapper) so `포스트` / `소개` hide on sub-sm.

### `src/components/SiteLogo.astro` (delete)

The microphone-SVG file is removed. Any remaining `data-site-logo` selectors anywhere in the codebase are checked and cleaned (search before delete to make sure nothing else references it).

### `src/components/Footer.astro` (modified)

Inline copy edit: drop `— Singing Developer`.

## Removals — Cleanup Checklist

Before merge, verify nothing else still references the dropped pieces:

- `grep -r "SiteLogo" src/` → only the import line in `Header.astro`, which is also being removed.
- `grep -r "data-site-logo" src/` → empty after the change.
- `grep -r "Singing Developer" src/` → empty after the footer edit.
- `grep -r "노래하는 개발자" src/` → empty (the phrase was never in the source aside from the now-historical specs).

## Editorial Guardrails

- The brand is one line. No subtitle, no eyebrow, no slogan.
- The amber accent is brand-only. Do not extend it to links, buttons, code blocks, or any other surface.
- The cursor blinks at 1Hz and respects `prefers-reduced-motion`. Do not speed up, color-cycle, or animate the cursor in any way beyond on/off.
- The brand never replaces the `$ whoami?` link on the home — the two are different surfaces sharing the same prompt voice.
- The nickname (`노래하는 개발자` / `Singing Developer`) does not return as visible copy. The domain `sings.dev` carries the meaning.
- The microphone SVG does not return. If a graphical mark is needed later (favicon, OG image), it derives from this wordmark, not from the discarded mic.

## Accessibility

- The accessible name of the home-link anchor is the visible brand text. The cursor span carries `aria-hidden="true"` so screen readers do not announce an extra unknown character.
- The amber tokens (`amber-700` on `#f5f5f4`-ish cream; `amber-300` on `#0f172a`-ish navy) clear WCAG AA contrast for normal text (4.5:1). Verify with a contrast checker against the actual dawn / night background tokens at implementation time; if a token misses, shift one step (e.g. `amber-800` / `amber-200`) rather than introduce a new hue.
- Keyboard focus on the home-link anchor reuses the existing `focus-visible:ring-dawn-300 dark:focus-visible:ring-night-500` pattern. No new focus ring on `SiteBrand` itself — the anchor owns the focus affordance.
- `prefers-reduced-motion` pins the cursor in the on state. The brand stays recognizable; only the blink stops.

## Favicon and OG Image (deferred)

A favicon and OG image will be designed in a follow-up task. Direction:

- The favicon is a tight crop of the brand mark — `$▌` or `$_` inside a rounded square, amber on a dark or warm-cream background.
- The OG image carries the full wordmark `$ sings.dev▌` in monospace on the site's dark navy or warm cream surface, with no other copy.
- Neither asset introduces a new graphical mark distinct from the wordmark.

This spec does not produce those assets. The implementation plan only handles the inline-SVG / DOM changes above.

## Tests

- `tests/header-layout.test.mjs` — replace the existing "header uses the SiteLogo mark next to the sings.dev text…" test:
  - drop the assertions matching `import SiteLogo` and `<SiteLogo />`.
  - drop the `<span>sings.dev</span>` ordering assertion (the brand is now one component, no inner ordering to enforce).
  - add: header imports `SiteBrand` from `./SiteBrand.astro` and renders `<SiteBrand />` inside the home-link anchor.
  - add: each primary nav `<li>` carries `hidden sm:inline-block` (or the equivalent wrapper class) so `포스트` / `소개` hide on sub-sm.
  - keep the existing Korean-safe `whitespace-nowrap` assertion on nav links — that rule still holds for sm-and-up.
- `tests/footer-signature.test.mjs` — replace the existing `Singing Developer` regex:
  - assertion becomes `assert.match(footer, /&copy; \{year\} sings\.dev/);` with a negative assertion `assert.doesNotMatch(footer, /Singing Developer/)`.
  - test name updates to reflect the new shape (e.g. `"footer renders the sings.dev signature next to the copyright year"`).
- `tests/site-logo.test.mjs` — **delete**, together with `SiteLogo.astro`.
- `tests/site-brand.test.mjs` — **new**, component-level:
  - renders `$`, `sings`, `.dev`, and a cursor span in document order.
  - cursor span carries `aria-hidden="true"` and the `brand-cursor` class.
  - the accent class pair `text-amber-700 dark:text-amber-300` is present on the `$`, `.dev`, and cursor spans.
  - `$` and `.dev` are inside the same wrapper as `sings`, and the wrapper carries `font-mono` plus `whitespace-nowrap`.

## Spec Documents to Update at Implementation Time

- `docs/spec-site-identity.md`
  - Rewrite **Logo Direction** to describe the `SiteBrand` wordmark + cursor (no more SM58 microphone).
  - Rewrite **Author Nickname** to keep the nickname as historical context (it explains the domain) but drop the claim that it appears in any user-visible surface.
  - Rewrite **Surfaces Carrying Author Identity** — drop entries 1 (header `SiteLogo`) and 4 (footer `— Singing Developer`); the header carries the brand wordmark only; the footer carries `© <year> sings.dev` only.
  - Update **Guardrails** — the nickname is no longer mentioned in header / footer; replace the "keeps both the mark and the `sings.dev` text together" line with the new mobile rule (brand stays single-line via `whitespace-nowrap`, nav text hides sub-sm).
  - Update **What To Avoid** — keep "no condenser stand microphone / musical-note motif" (still true), add "no nickname as visible copy", add "amber stays brand-only".

- `docs/spec-layout.md`
  - Header section: rewrite the **Left** bullet to describe `SiteBrand` (drop the `SiteLogo microphone SVG mark` reference).
  - Header section: add a bullet describing the sub-sm nav-text hiding rule.
  - Footer section: rewrite the signature line to `© <year> sings.dev` and drop the `— Singing Developer` suffix from the spec text.

Both spec edits are part of the implementation, not a separate doc-only pass; the design spec captures the decision and the rendered specs document the resulting state, per the project's existing convention (see `2026-05-10-home-identity-refresh-design.md`).

## What to Avoid

- Bringing back the microphone SVG as a "subtle" detail (smaller, side-eye, etc.). It's discarded.
- Adding the nickname back under any treatment — eyebrow, footer suffix, alt text, OG description. The brand is the wordmark.
- Extending the amber accent beyond the brand wordmark. Other surfaces stay in the existing dawn / night palette.
- Replacing the cursor `<span>` with a unicode `▌` character. The styled span gives consistent rendering; the unicode glyph varies with font fallback.
- Adding a hamburger menu or icon-only mobile nav. Mobile drops the text labels and relies on the home page's existing entries to `/posts` and `/about`.
- Introducing new typography tokens. `font-mono`, `text-sm`, `text-base`, and `font-semibold` are all existing tokens.
- Wrapping the brand in inline-code styling. The wrap variant was rejected during brainstorming; do not reintroduce it without reopening the design.
