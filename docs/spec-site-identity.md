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
  2. Home page hero eyebrow — identity-plus-topics line (`Singing Developer — Backend · MPC · Infrastructure`); exact wording may be revised in later hero-prose passes.
  3. `/about` page — structured summary, photo, socials, experience. See `docs/spec-about.md`.
  4. Footer copyright line — `© <year> sings.dev — Singing Developer`.
- **Guardrails**:
  - The nickname shows up as context, not as hero copy. No page should lead with the nickname alone.
  - Do not introduce an extra header row, tagline, or subtitle for the nickname.
  - Do not restore any per-post author block; author identity on post detail pages stays implicit through the site shell.
  - The header keeps both the mark and the `sings.dev` text together on every viewport. If mobile space ever gets too tight, tighten spacing before dropping the text.
- **What To Avoid**:
  - A condenser stand microphone, a musical-note motif, or any icon that competes with the blog's editorial tone.
  - Any non-text decoration alongside the footer signature.
  - Any branding-style treatment ("™", slogan, tagline bar).
