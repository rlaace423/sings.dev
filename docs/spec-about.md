# Spec: /about Page

- **Goal**: Serve as both the blog's identity page ("who writes here") and a concrete job-search surface for the author, without giving the rest of the site a portfolio or marketing feel.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. The philosophy's `Avoid: Resume-site energy on the home page` guidance applies to the home page; `/about` is the designated surface for structured biographical content, so light resume-flavored structure is allowed here but must stay typographically calm.
- **Page Role**:
  - `/about` is the canonical home of the full biographical record (name, photo, summary, socials, education, experience). The home page reuses the same `pages` collection record but projects only the motto, name, short `homeSummary`, and socials through `HomeIdentity.astro`; education, experience, the photo, and the longer `summary` stay on `/about` only.
  - The home and `/about` cannot drift because both read the same `pages` record.
  - It should feel like a quiet editorial about-page, not like a portfolio template or a LinkedIn export.
  - The home page, archive, and post detail remain the primary "quiet, text-first" surfaces.
- **Routes**:
  - Korean: `src/pages/about.astro` rendering `src/content/pages/ko/about.md`.
  - English: `src/pages/en/about.astro` rendering `src/content/pages/en/about.md`.
- **Content Schema (`src/content/config.ts`, `pages` collection)**:
  - `identity` is an optional object on the `pages` schema. When present, the page errors out at build time if any required field is missing — the schema is the single source of truth for the page's structure.
  - `identity.name` (string, required): the page's `<h1>`. Use the public-facing name format (KO: `김상호 (Sam Kim)`, EN: `Sam Kim (Sangho Kim)`). The home and `/about` render the same value, so it changes once in the `pages` collection.
  - `identity.tagline` (string, required): the author's motto, rendered as the home page `h1`. Editorial copy in the author's voice, not a brand slogan. Does not appear on `/about`.
  - `identity.homeSummary` (string, required): the short two-sentence intro shown on the home page below the name. Distinct from `summary`, which stays the longer reflective paragraph on `/about`.
  - `identity.summary` (string, required): the longer reflective paragraph on `/about`, two to three sentences, rendered inline next to the photo.
  - `identity.photo` (object, required): `{ src, alt }` for the avatar.
  - `identity.socials` (array, default `[]`): each item has `type` (`"github" | "email" | "linkedin" | "instagram"`), `href`, and optional `label`. Order is preserved.
  - `identity.education` (array, default `[]`): each item has `school` and `degree` (both required), with optional `start`, `end`, and `description`. Dates and descriptions are optional because not every entry has them (e.g. visiting researcher stints, ongoing programs without a fixed start year). Order is preserved.
  - `identity.experience` (array, default `[]`): each item has `company`, `role`, `start`, `end`, and `description`. Order is preserved and reflects reverse-chronological listing by convention.
- **Rendering Order**:
  1. Name as the page `<h1>`.
  2. Photo + summary row (photo on the left at 96×96 round, summary inline on the right).
  3. Social links row.
  4. `학력` / `Education` section under a `<h2>`.
  5. `경력` / `Experience` section under a `<h2>` at the same level as Education.
  - There is no markdown body section — the photo-side summary covers what the page needs to say. The `.md` file exists only to carry frontmatter for the `pages` collection.
- **Section Heading Style**:
  - `학력` and `경력` use the same h2 treatment as the home archive heading (`text-2xl font-semibold tracking-tight ...`), not the small uppercase eyebrow style. This keeps the about page readable as a structured personal page rather than a list of micro-sections.
- **Editorial Guardrails**:
  - No company logos, badges, skill tags, or achievement callouts.
  - No card/box decoration around experience or education entries.
  - Social links use the shared `SocialIcon.astro` inline SVGs paired with a short text label; icon-only is not used.
  - Experience entries use typographic structure only (a date column + company/role/description stack). Education entries use a simpler stack (school + degree + optional description) because their dates are intentionally optional.
  - The page intentionally stays short. If the photo-side summary needs more space, lengthen the summary; do not reintroduce a markdown body section.
- **Author Presence Elsewhere**:
  - Do not re-introduce a per-post author block on post detail pages. Author identity for readers lives in the header, the home intro, and this page.
  - Social links and contact methods live on this page only; the footer remains a copyright line.
- **What To Avoid**:
  - Portfolio-style hero panels or large call-to-action buttons.
  - Animated or decorative treatments around the photo.
  - Popularity or metric widgets ("X years experience", "Y shipped projects").
  - Tag clouds or skill matrices.
