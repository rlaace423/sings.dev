# Spec: Home Identity Refresh (2026-05-10)

## Goal

Replace the home page's reused `/about` identity card (name `h1` + photo + summary + labeled socials) with a slimmer, motto-led identity block authored specifically for the home page. The home should lead with the author's personal motto, follow with the author name and a short two-sentence intro, and end with a quiet icon-only socials row — no photo, no education, no experience. The full biographical record stays on `/about`.

The previous iteration reused `AboutIdentity.astro` on the home so the home and `/about` could not drift, but the result tilted toward "personal landing page" energy because the home's `h1` was the author name and the photo was repeated on both surfaces. This iteration steps back to a quieter, editorial home — closer to the patterns used by Maggie Appleton, Robin Rendle, and similar text-first technical blogs — while keeping `/about` as the deeper biographical surface.

## Reference Philosophy

Follow `docs/spec-editorial-philosophy.md`. Home is the "quiet front door"; `/about` carries structured biographical content. The motto is editorial copy (the author's voice), not a brand slogan. Per `docs/spec-site-identity.md`, the nickname `노래하는 개발자` / `Singing Developer` stays as context (header wordmark + footer signature) and does not lead the home.

## Surfaces

- KO home: `src/pages/index.astro`
- EN home: `src/pages/en/index.astro`
- KO about: `src/pages/about.astro` (unchanged structure; copy and name format updated)
- EN about: `src/pages/en/about.astro` (unchanged structure; copy and name format updated)
- Identity content: `src/content/pages/ko/about.md`, `src/content/pages/en/about.md`

## Page Structure

### Home (both locales)

In order:

1. `h1` — tagline (the author's motto). Sized as the page's primary heading.
2. `<p>` — author name. One step smaller than `h1`, larger than body.
3. `<p>` — short intro (two sentences). Body reading size.
4. `<ul>` — socials, **icon-only** (no visible labels). Small inline row.
5. Hairline divider (existing pattern: `border-t border-dawn-300 ... mt-16 pt-10`).
6. `<h2>` — `최근 글` / `Recent Posts` with the inline `모든 글` / `All posts` link aligned right.
7. Post list (latest 5 posts, existing list style unchanged).

The home does **not** carry: photo, education, experience, or a Categories block. Category browsing lives on `/posts` and on category pages.

### /about (both locales)

No structural changes. Continues to render `AboutIdentity.astro` with name (`h1`), photo + summary row, labeled socials, education `h2` + list, experience `h2` + list. See `docs/spec-about.md`.

The about page does **not** carry: the tagline / motto. The motto is scoped to the home.

## Components

### `src/components/HomeIdentity.astro` (new)

Props: `{ lang, tagline, name, summary, socials }`

- `lang`: `Locale`. Drives `aria-label` translations on social links.
- `tagline`: `string`, required. Rendered as `<h1>`.
- `name`: `string`, required. Rendered as `<p data-home-author-name>` styled at the `text-2xl font-semibold tracking-tight` step (the existing `h2` token).
- `summary`: `string`, required. Rendered as `<p data-home-author-summary>` at `text-lg leading-8` (the existing prose-comfort body step).
- `socials`: `SocialLink[]`, optional. When the array is empty, the `<ul>` is omitted entirely. Each link renders as an `<a>` with the existing `SocialIcon.astro` SVG inside, `aria-label` on the `<a>` carrying the locale-aware label, and no visible text.

The component renders nothing else — no education, no experience, no photo. It does not duplicate the `socials` rendering inside `AboutIdentity.astro`; the two components keep their own variants because the visual register is different (icon-only inline row on home; icon + text label list on `/about`).

### `src/components/AboutIdentity.astro` (no functional change)

Continues to render the full identity card on `/about` with photo, summary, labeled socials, education, experience. The home no longer imports it.

The home and `/about` keep a shared identity source by reading from the same `pages` collection record (`ko/about`, `en/about`) — they just project different fields.

## Data Schema

Extend `src/content.config.ts` `pages.identity` to add two required fields and to keep `summary` as the canonical `/about` copy:

```ts
identity: z.object({
  name: z.string(),
  tagline: z.string(),       // NEW — home h1 (motto)
  homeSummary: z.string(),   // NEW — home intro (two sentences)
  summary: z.string(),       // EXISTING — /about long summary, unchanged role
  photo: z.object({ src: z.string(), alt: z.string() }),
  socials: z.array(...).default([]),
  education: z.array(...).default([]),
  experience: z.array(...).default([]),
}).optional()
```

Both new fields are required when `identity` is present. A missing `tagline` or `homeSummary` fails the build at content-collection schema validation, matching how missing required identity fields already fail today.

`summary` keeps its current role — the longer reflective paragraph on `/about`. The home does not read `summary`; `/about` does not read `tagline` or `homeSummary`. Each surface reads only what it needs.

## Content Changes

### `src/content/pages/ko/about.md` — `identity`

| Field | Before | After |
|---|---|---|
| `name` | `Sam (김상호)` | `김상호 (Sam Kim)` |
| `tagline` | — | `도전과 성취를 즐깁니다.` |
| `homeSummary` | — | `소프트웨어는 흔들리지 않는 목적 위에 설 때 오래 버틴다고 생각합니다. 현재 핀테크 스타트업에서 Backend Lead로 일하고 있으며, 암호학·블록체인·TypeScript, 홈 랩(Home Lab) 인프라 구축, 최근에는 AI까지 두루 관심을 두고 있습니다.` |
| `summary` | (current placeholder copy) | `백엔드 아키텍처와 분산 시스템을 설계해 온 엔지니어입니다. 핀테크 스타트업에서 8년 동안 멀티체인 지갑 API와 TSS 기반 MPC 서명 시스템을 만들어 오면서, 흔들리지 않는 목적 위에 서 있어야 오래 유지할 수 있는 소프트웨어를 만들 수 있다고 생각합니다. 지금까지 제가 느끼고 배운 것을 이 블로그에 정리합니다.` |
| `photo`, `socials`, `education`, `experience` | (unchanged) | (unchanged) |

The KO name flips order so that the Korean reading public sees `김상호` first, with `Sam Kim` as the romanization in parentheses.

### `src/content/pages/en/about.md` — `identity`

| Field | Before | After |
|---|---|---|
| `name` | `Sam (Sangho Kim)` | `Sam Kim (Sangho Kim)` |
| `tagline` | — | `I enjoy the climb and the summit.` |
| `homeSummary` | — | `I think software lasts longest when it stands on a purpose that doesn't waver. I'm currently a Backend Lead at a fintech startup, with broad interests across cryptography, blockchain, TypeScript, home lab infrastructure, and more recently AI.` |
| `summary` | (current placeholder copy) | `I'm a backend engineer who designs distributed systems. Over eight years at a fintech startup — building a multi-chain wallet API and a TSS-based MPC signing system — I've come to believe that software lasts only when it stands on a purpose that doesn't waver. This blog is where I keep what I've felt and learned along the way.` |
| `photo`, `socials`, `education`, `experience` | (unchanged) | (unchanged) |

The EN name uses `Sam Kim` first as the public-facing form, with the full romanization `Sangho Kim` in parentheses for completeness.

## Typography

All sizes reuse existing tokens. No new tokens introduced.

| Element | Token / classes | Notes |
|---|---|---|
| Tagline `h1` | `text-4xl font-semibold tracking-tight ... sm:text-5xl` | Same step as the current `AboutIdentity` name `h1`. |
| Name `<p>` | `text-2xl font-semibold tracking-tight` | Existing `h2`-step token, used here as a styled paragraph since the page already has an `h1`. |
| Summary `<p>` | `text-lg leading-8` | The prose-comfort body step that already covers `AboutIdentity` summary, post-card descriptions, and inline post-list descriptions (see `docs/spec-theme-typography.md`). |
| Socials icons | `h-4 w-4` SVG inside `text-sm` flex row | Same icon size as the labeled variant in `AboutIdentity`; only the surrounding `<span>` label is dropped. |

Color tokens use the existing `dawn-*` / `night-*` palette (no new colors). The hairline divider above Recent Posts uses the existing `border-dawn-300 dark:border-night-600` token.

## Accessibility

Icon-only socials require accessible names because the visible text label is dropped:

- Each social `<a>` carries `aria-label` with the locale-aware label (`"GitHub"`, `"Email"`, `"LinkedIn"`, `"Instagram"`).
- The inline `<svg>` keeps `aria-hidden="true"` (already true via `SocialIcon.astro`).
- The wrapping `<ul>` carries `aria-label` matching the locale-aware contact-row label (`연락처와 프로필` / `Contact and profiles`), mirroring the labeled variant's pattern in `AboutIdentity`.

Focus rings on `<a>` reuse the existing `focus-visible:ring-dawn-300` / `dark:focus-visible:ring-night-500` pattern so keyboard users see the same affordance as elsewhere on the site.

## Editorial Guardrails

- The motto is the author's personal phrasing, not a marketing slogan. If the motto ever changes, it changes here in `identity.tagline`, not in a separate brand surface.
- The home identity card stops at socials. Education and experience do not migrate to the home.
- The home does not show the photo. The photo is the `/about` page's signature; duplicating it on the home pulls the home toward "personal landing page" energy and away from the editorial register.
- The Recent Posts heading stays as a single `h2` (no eyebrow), as established in the previous iteration.
- Do not reintroduce a Categories block on the home. Category browsing remains on `/posts` and on category pages.
- Do not add a tagline / motto on `/about`. The motto is the home's lead and would compete with the `/about` `h1` (the name).

## Editorial Pairing Across Surfaces

The home and `/about` summaries carry the same belief about software at different volumes:

- Home (`homeSummary`): a single-sentence assertion — `소프트웨어는 흔들리지 않는 목적 위에 설 때 오래 버틴다고 생각합니다.` (and the EN equivalent).
- `/about` (`summary`): the same belief shown as something earned over eight years of practice — `핀테크 스타트업에서 8년 동안 ... 오래 유지할 수 있는 소프트웨어를 만들 수 있다고 생각합니다.`

This is intentional: the home states the principle; `/about` shows where the principle came from. Both surfaces stay independently readable.

## Tests

- `tests/home-page.test.mjs` — update assertions to match the new structure:
  - Home renders `HomeIdentity` (stub) with `tagline`, `name`, `summary`, `socials` props from the `pages` collection record.
  - The stub records that `tagline` and `summary` (mapped to `homeSummary` from frontmatter) are non-empty and locale-correct.
  - The home does not render any `AboutIdentity`, photo, education, or experience markup.
  - Recent Posts heading is a single `h2` with locale-correct text and the `모든 글` / `All posts` link.
- `tests/home-identity.test.mjs` — new component-level tests for `HomeIdentity`:
  - Renders the tagline as `h1` with the configured copy.
  - Renders the name and summary in the documented hooks (`data-home-author-name`, `data-home-author-summary`).
  - Renders one social `<a>` per entry, each with an `aria-label` carrying the locale-aware label, and no visible label text.
  - Omits the socials `<ul>` entirely when `socials` is empty.
- `tests/about-identity.test.mjs` — verify it still passes with the new long names (`김상호 (Sam Kim)` / `Sam Kim (Sangho Kim)`); no assertion changes expected, since the tests use synthetic names.

## Migration Notes

This iteration supersedes the previous home introduction refresh (recorded in `docs/spec-roadmap.md` as "the home page now leads with the same identity card as `/about`"). The Phase 1 change of the prior iteration — dropping the dedicated Categories block, collapsing the Recent Posts heading to a single `h2`, and reading from the `pages` collection — stays. What this iteration changes is the identity card itself: from a reused `AboutIdentity` (name `h1` + photo + summary) to a new `HomeIdentity` (tagline `h1` + name + short intro + icon socials, no photo).

`docs/spec-home-theme.md`, `docs/spec-site-identity.md`, and `docs/spec-roadmap.md` will be updated to describe the new home structure as part of the implementation; this design spec captures the decision, the rendered specs document the resulting state.

## Spec Documents to Update at Implementation Time

- `docs/spec-site-identity.md` — Home identity surface description: replace the "reused `AboutIdentity`" wording with the `HomeIdentity` description; keep the guardrail that the nickname stays in header / footer only; add the guardrail that the motto lives at `identity.tagline` and renders only on the home.
- `docs/spec-home-theme.md` — Home Page Structure: replace the identity-card description with the tagline → name → summary → icon socials sequence; keep the Recent Posts and "no Categories block" rules.
- `docs/spec-about.md` — clarify that the motto does not appear on `/about`; note the schema change (`tagline`, `homeSummary` are required when `identity` is present); confirm `/about` continues to show the photo, the longer summary, education, and experience.
- `docs/spec-roadmap.md` — update the "Identity" Current Status entry to describe the new motto-led home and the home/`about` content split.

## What to Avoid

- Introducing the photo on the home page. The photo's role is the `/about` signature.
- Adding a tagline / subtitle to `/about`. The motto stays scoped to the home.
- Renaming the existing `summary` field. Keeping it stable means existing references continue to work and the schema change is purely additive.
- Hard-coding the tagline or `homeSummary` strings in the page templates. Both live in the `pages` collection so they can be edited as content rather than as code.
- Building two parallel social-link components. `HomeIdentity` and `AboutIdentity` each render their own variant; the shared piece is `SocialIcon.astro` (the inline SVG icons), which both components reuse.
- Restoring the Categories block on the home. The previous iteration removed it; this iteration does not bring it back.
