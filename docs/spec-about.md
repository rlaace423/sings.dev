# Spec: /about Page

- **Goal**: Serve as both the blog's identity page ("who writes here") and a concrete job-search surface for the author, without giving the rest of the site a portfolio or marketing feel.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. The philosophy's `Avoid: Resume-site energy on the home page` guidance applies to the home page; `/about` is the designated surface for structured biographical content, so light resume-flavored structure is allowed here but must stay typographically calm.
- **Page Role**:
  - `/about` is the only site surface that carries structured biographical data (photo, socials, experience).
  - It should feel like a quiet editorial about-page, not like a portfolio template or a LinkedIn export.
  - The home page, archive, and post detail remain the primary "quiet, text-first" surfaces.
- **Routes**:
  - Korean: `src/pages/about.astro` rendering `src/content/pages/ko/about.md`.
  - English: `src/pages/en/about.astro` rendering `src/content/pages/en/about.md`.
- **Content Schema (`src/content/config.ts`, `pages` collection)**:
  - `identity` is an optional object on the `pages` schema.
  - `identity.summary` (string, required): short first-person intro, about two to three sentences.
  - `identity.photo` (object, required): `{ src, alt }` for the avatar. Uses `/avatar-placeholder.png` until a real portrait replaces it.
  - `identity.socials` (array, default `[]`): each item has `type` (`"github" | "email" | "linkedin" | "instagram"`), `href`, and optional `label`. Order is preserved.
  - `identity.experience` (array, default `[]`): each item has `company`, `role`, `start`, `end`, and `description`. Order is preserved and reflects reverse-chronological listing by convention.
- **Rendering Order**:
  1. Photo + summary row.
  2. Social links row.
  3. Experience list.
  4. Markdown body from the `.md` file (short essays about what the author writes and why).
- **Editorial Guardrails**:
  - No company logos, badges, skill tags, or achievement callouts.
  - No card/box decoration around experience entries.
  - Social links use the shared `SocialIcon.astro` inline SVGs paired with a short text label; icon-only is not used.
  - Experience entries use typographic structure only (a date column + company/role/description stack).
  - The body keeps an essay tone and stays short so the page does not read as a pure CV.
- **Author Presence Elsewhere**:
  - Do not re-introduce a per-post author block on post detail pages. Author identity for readers lives in the header, the home intro, and this page.
  - Social links and contact methods live on this page only; the footer remains a copyright line.
- **What To Avoid**:
  - Portfolio-style hero panels or large call-to-action buttons.
  - Animated or decorative treatments around the photo.
  - Popularity or metric widgets ("X years experience", "Y shipped projects").
  - Tag clouds or skill matrices.
