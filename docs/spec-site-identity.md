# Spec: Site Identity

- **Goal**: Keep the site's author identity documented so future work on the header, home, footer, and any future logo iterations all align with the same story.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. Identity should stay quiet; the nickname is context, not branding. `/about` carries the structured author surface (see `docs/spec-about.md`); this spec covers the identity signals that live in the site shell itself.
- **Author Nickname**:
  - Korean: `노래하는 개발자`.
  - English: `Singing Developer`.
  - The domain `sings.dev` derives from this nickname.
- **Logo Direction**:
  - The mark is a simplified SM58-style handheld vocal microphone drawn as inline SVG.
  - Implementation lives in `src/components/SiteLogo.astro` and uses `currentColor` so both light and dark themes work without theme-specific assets.
  - The mark stays monochrome and thin-stroke to match the existing header icons (search, theme toggle, `SocialIcon`).
- **Surfaces Carrying Author Identity**:
  1. Header logo link — `SiteLogo` mark immediately to the left of the `sings.dev` text.
  2. Home page introduction — the home page leads with a motto-led identity block rendered by `src/components/HomeIdentity.astro`: `tagline` as the `h1` (the author motto, e.g. `도전과 성취를 즐깁니다.` / `I enjoy the climb and the summit.`), the name as a smaller `<p>`, the short `homeSummary` paragraph, and an icon-only socials row. The identity data is read from the same `pages` collection record (`ko/about`, `en/about`) that powers `/about` so the home and `/about` cannot drift. The home does not show the photo, education, or experience — those stay on `/about`. The nickname intentionally does not appear in the motto — the domain wordmark in the header and the footer signature already carry it. See `docs/spec-home-theme.md`.
  3. `/about` page — full identity record: name, photo, summary, socials, education, experience. See `docs/spec-about.md`.
  4. Footer copyright line — `© <year> sings.dev — Singing Developer`.
- **Guardrails**:
  - The nickname shows up as context, not as hero copy. No page should lead with the nickname alone.
  - Do not introduce an extra header row, tagline, or subtitle for the nickname.
  - Do not restore any per-post author block; author identity on post detail pages stays implicit through the site shell.
  - The header keeps both the mark and the `sings.dev` text together on every viewport. If mobile space ever gets too tight, tighten spacing before dropping the text.
  - The home and `/about` read identity data from the same `pages` collection record (`ko/about`, `en/about`); do not duplicate the identity strings in another collection or hard-code them on the home page.
  - The motto lives at `identity.tagline` and renders only on the home. Do not introduce a separate slogan / byline surface, and do not show the motto on `/about`.
  - The home identity stops at socials. Photo, education, and experience stay on `/about` only — that hierarchy is what keeps the home from drifting into resume-site / personal-landing-page energy.
  - Socials on the home render as icon-only links with `aria-label`; socials on `/about` render with visible text labels. `SocialIcon.astro` is the shared SVG source for both variants.
- **What To Avoid**:
  - A condenser stand microphone, a musical-note motif, or any icon that competes with the blog's editorial tone.
  - Any non-text decoration alongside the footer signature.
  - Any branding-style treatment ("™", slogan, tagline bar).
