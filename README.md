# sings.dev

Personal technical blog of [Singing Developer](https://sings.dev) — a quiet, text-first, bilingual (Korean / English) site about backend architecture, MPC systems, and infrastructure operations.

The repository is the full source of the site, including content, layout, build pipeline, and the editorial guardrails that shape every UI decision. The site itself is published at [https://sings.dev](https://sings.dev).

## Stack

- [Astro](https://astro.build) (content collections, static output)
- [Tailwind CSS](https://tailwindcss.com) v4 with [Tailwind Typography](https://github.com/tailwindlabs/tailwindcss-typography)
- Self-hosted [Pretendard Std Variable](https://github.com/orioncactus/pretendard) for the sans stack
- [Shiki](https://shiki.style) for syntax highlighting (`github-light` / `tokyo-night`)
- [Pagefind](https://pagefind.app) for client-side full-text search
- [Cloudflare](https://www.cloudflare.com) static-asset deploy via [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## Editorial philosophy

The site is closer to reading one person's notes than browsing a media portal. Discovery, navigation, and metadata exist to support reading — not to compete with it. The full guardrails (and what to avoid) live in [`docs/spec-editorial-philosophy.md`](docs/spec-editorial-philosophy.md). Every code change should respect that spec.

## Local development

Requires Node `>=22.12.0`.

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the dev server at `http://localhost:4321` |
| `npm test` | Run the Node test runner over `tests/` |
| `npm run build` | Build static output to `dist/` and generate the Pagefind index |
| `npm run preview` | Preview the production build locally |

Posts marked `draft: true` render under `npm run dev` and disappear from any `npm run build` output. See [`docs/spec-drafts.md`](docs/spec-drafts.md).

## Authoring posts

Posts live under `src/content/blog/{ko,en}/<slug>/index.md`. Each post is a folder so images can co-locate with the post body and be referenced through relative paths. Frontmatter, the optional summary block, the figure / `#wide` authoring rules, and the series-title convention are all documented in [`docs/spec-posts.md`](docs/spec-posts.md) and [`docs/spec-post-detail.md`](docs/spec-post-detail.md).

Static `/about` content lives under `src/content/pages/{ko,en}/about.md`.

## Deploy

The site is a pure static deploy to Cloudflare via Wrangler. Build pipeline, deploy command, and rollback procedure are documented in [`docs/spec-deploy.md`](docs/spec-deploy.md).

## Documentation map

- `docs/spec-*.md` — high-level specs that document the site's shape, content schema, theme tokens, and editorial decisions. Read these before changing UI or adding features.
- `docs/spec-roadmap.md` — current major improvement areas and recommended order. Treat as a steering document, not an implementation spec.
- `docs/superpowers/specs/<date>-<topic>-design.md` — focused design docs for specific changes.
- `docs/superpowers/plans/<date>-<topic>.md` — implementation plans paired with the design docs.
- `tests/` — Node test runner specs covering taxonomy helpers, page structure invariants, and reading-flow logic. CI does not run yet, so always invoke `npm test` locally before merging.
