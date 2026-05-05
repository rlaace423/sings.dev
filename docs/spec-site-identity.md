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
  2. Home page hero — eyebrow introduces the author by real name (`Sam (김상호) — 백엔드 · MPC · 인프라` on the Korean home, `Sam (Sangho Kim) — Backend · MPC · Infrastructure` on the English home), followed by the `h1` (`시스템의 구조를 씁니다.` / `Notes on how systems hold together.`). The hero carries no body prose; the rest of the home page (Categories block, Recent Posts) does the work of showing what the blog covers. The nickname intentionally does not appear in the eyebrow — the domain wordmark in the header and the footer signature already carry it. See `docs/spec-home-theme.md`.
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
