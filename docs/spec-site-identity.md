# Spec: Site Identity

- **Goal**: Keep the site's author identity documented so future work on the header, home, footer, and any future logo iterations all align with the same story.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. Identity stays quiet; the domain carries the brand. `/about` carries the structured author surface (see `docs/spec-about.md`); this spec covers the identity signals that live in the site shell itself.
- **Author Nickname (historical context only)**:
  - Korean: `노래하는 개발자`. English: `Singing Developer`.
  - The domain `sings.dev` derives from this nickname.
  - The nickname is **not** a user-visible asset on any page. The header, home, footer, and `/about` page never display it.
- **Brand Mark**:
  - The brand is a terminal-prompt wordmark — `$ sings.dev` followed by a blinking block cursor — rendered in `font-mono` with a Tailwind amber accent (`text-amber-700` light, `text-amber-300` dark) on `$`, `.dev`, and the cursor.
  - Implementation lives in `src/components/SiteBrand.astro`. The component is self-contained and includes the cursor-blink CSS plus a `prefers-reduced-motion: reduce` fallback that pins the cursor visible.
  - The amber accent is brand-only. No other surface (links, buttons, decorations) uses amber.
- **Surfaces Carrying Author Identity**:
  1. Header — `SiteBrand` rendered inside the home-link anchor. No other text in that anchor; the wordmark *is* the brand.
  2. Home page introduction — the motto-led identity block rendered by `src/components/HomeIdentity.astro`: `tagline` as the `h1` (the author motto, e.g. `도전과 성취를 즐깁니다.` / `I enjoy the climb and the summit.`), the name as a smaller `<p>`, the short `homeSummary` paragraph, and an icon-only socials row. The identity data is read from the same `pages` collection record (`ko/about`, `en/about`) that powers `/about` so the home and `/about` cannot drift. The home does not show the photo, education, or experience — those stay on `/about`. The nickname does not appear in the motto. See `docs/spec-home-theme.md`.
  3. `/about` page — full identity record: name, photo, summary, socials, education, experience. See `docs/spec-about.md`.
  4. Footer copyright line — `© <year> sings.dev`. Single token plus the year, no trailing descriptor.
- **Guardrails**:
  - The brand is one line. No subtitle, no eyebrow, no slogan, no nickname re-introduction.
  - The home and `/about` read identity data from the same `pages` collection record (`ko/about`, `en/about`); do not duplicate the identity strings in another collection or hard-code them on the home page.
  - The motto lives at `identity.tagline` and renders only on the home. Do not introduce a separate slogan / byline surface, and do not show the motto on `/about`.
  - The home identity stops at socials. Photo, education, and experience stay on `/about` only — that hierarchy is what keeps the home from drifting into resume-site / personal-landing-page energy.
  - Socials on the home render as icon-only links with `aria-label`; socials on `/about` render with visible text labels. `SocialIcon.astro` is the shared SVG source for both variants.
  - The header brand stays a single line at every viewport via `whitespace-nowrap`. On sub-sm, the primary nav links (`포스트` / `소개`) hide via `hidden sm:inline-block` so the brand keeps its room; `/posts` and `/about` remain reachable through the home page's existing entries (`$ whoami?` and `모든 글`).
  - The amber accent is brand-only. Do not extend `text-amber-*` to links, buttons, headings, or any non-brand surface.
  - The cursor blinks at 1Hz with `step-end` timing and respects `prefers-reduced-motion: reduce`. Do not speed it up, fade it, or color-cycle it.
- **What To Avoid**:
  - Reintroducing the SM58-style microphone, a condenser stand microphone, a musical-note motif, or any iconography that competes with the editorial wordmark.
  - Reintroducing the `Singing Developer` / `노래하는 개발자` nickname as visible copy — header, home, footer, `/about`, alt text, OG description, anywhere.
  - Wrapping the brand wordmark in inline-code styling (background tint + rounded rectangle). The bare wordmark was chosen during brainstorming; do not bring back the wrap without reopening the design.
  - Replacing the cursor `<span>` with a unicode `▌` character. The styled span renders consistently across mono font fallbacks.
  - Any per-post author block on post detail pages. Author identity stays implicit through the site shell.
  - Any non-text decoration alongside the footer signature.
  - Any branding-style treatment ("™", slogan, tagline bar).
