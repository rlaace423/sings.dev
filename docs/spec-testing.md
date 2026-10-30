# Spec: Testing

- **Goal**: Keep the site rendering the way it was last approved. This blog is judged by how the built pages look and behave in a browser, so the suite checks the production build itself, not only the source.
- **Reference Philosophy**: Every "looked wrong, fixed by eye" commit in the history is a check that should have existed. When a visual fix lands, the matching test lands with it; when a design change is intentional, its baselines are refreshed in the same change.

## Layers

| Layer | Command | Reads | Guards |
| --- | --- | --- | --- |
| Unit | `npm test` (`tests/*.test.ts`) | source modules | helpers (reading time, series titles, taxonomy), remark/rehype plugins, draft filtering |
| Component | `npm test` (`tests/*.test.mjs`) | `.astro` components compiled in isolation | markup of one component with synthetic props (identity blocks, post header, TOC, series rail, summary, icons) |
| Page structure | `npm test` (`tests/dist-pages.test.mjs`) | `dist/` HTML | cross-page invariants on real content: one `h1` per page, home identity mirrors `/about`, one assembled title across `<title>` / `h1` / OG / archive list, TOC links resolve, series rail lists every part, category related tags only for repeated tags |
| Rendered invariants | `npm run test:visual` (`tests/visual/invariants.spec.ts`) | `dist/` in Chromium | on every page, both colour schemes, desktop and 360px mobile: no horizontal overflow (the Chrome Android zoom-out trigger) and WCAG AA contrast for all rendered text and list markers |
| Interactions | `npm run test:visual` (`tests/visual/interactions.spec.ts`) | `dist/` in Chromium | theme toggle + mermaid `<picture>` flip + persistence, sticky-header clearance on TOC clicks, scroll-spy, reading progress, image lightbox (and mermaid exclusion), code copy button, search modal font + results, 404 locale switch, mobile header, responsive image candidates decode |
| Screenshots | `npm run test:visual` (`tests/visual/screenshots.spec.ts`) | `dist/` in Chromium | pixel baselines: home / about / 404 full pages, archive / category / tag first screens, and per-component crops of post pages (header, TOC, prose primitives, figure, code block idle + hover, callout, series rail, footer, mermaid light/dark, long-token wrapping) |
| OG cards | `npm run test:visual` (`tests/visual/og-images.spec.ts`) | `dist/og/*.png` | every card is a 1200×630 PNG; a representative subset is compared pixel-by-pixel |

`npm run check` runs `build`, `test`, and `test:visual` in that order.

## Running locally

- `npm run build` first. The page-structure tests and the whole visual suite read `dist/`; they fail with a pointer to this step when it is missing.
- `npm test` is fast (seconds) and has no browser dependency.
- `npm run test:visual` starts `tests/visual/serve.mjs` (a dependency-free static server for `dist/` with the same 404 semantics as Cloudflare) and runs Playwright's Chromium, which `npm install` already fetched for mermaid. A full run takes well under a minute.
- A failed screenshot leaves `expected`, `actual`, and `diff` PNGs under `test-results/`; `npx playwright show-report` opens the HTML report.
- Third-party embeds (giscus, analytics) are blocked during the visual suite so renders are deterministic.

## Screenshot baselines

- Location: `tests/visual/__screenshots__/<project>/<platform>/<name>.png` for browser shots (`desktop` / `mobile`, `darwin` / `linux`) and `tests/visual/__screenshots__/artifacts/` for OG cards, which are platform-independent because the renderer embeds its fonts.
- Baselines are per platform because Chromium rasterizes text differently on macOS and Linux. Each platform compares only against its own set.
- **Intentional visual change, macOS**: run `npm run test:visual:update`, review the changed PNGs in the diff, and commit them with the change.
- **Intentional visual change, Linux (CI)**: run the manual workflow **Refresh Linux visual baselines** (Actions tab), download the `visual-baselines-linux` artifact, unpack it over `tests/visual/__screenshots__/`, and commit.
- **Missing baselines** (first run on a platform, or a newly added shot): the suite writes the capture as the baseline, annotates the test `baseline-created`, and skips it instead of failing. The deploy workflow uploads such files as the `visual-baselines-linux` artifact and prints a notice. Commit them and the next run compares. A skipped screenshot test is therefore always visible in the run summary; it never silently passes.
- Tolerance: `maxDiffPixelRatio: 0.001`. Full pages are captured at scroll 0; post components are cropped from a full-document capture at integer coordinates (padded by one pixel) so sub-pixel layout never changes the crop size. Content pictures are collapsed to their fallback `<img>` before capture because Chromium's srcset candidate choice varies between loads; the candidates themselves are covered by the responsive-images interaction test.

## CI

`.github/workflows/deploy.yml` runs, on every push to `main`: `npm ci` → `npm run build` → `npm test` → `npm run test:visual` → `npx wrangler deploy`. A failing test blocks the deploy; the Playwright report and diffs are uploaded as the `playwright-report` artifact on failure. `.github/workflows/visual-baselines.yml` is the manual Linux baseline refresh described above.

## Conventions for new work

- A change to anything user-visible (CSS, tokens, layout, images, OG template, mermaid theme) is not done until `npm run test:visual` passes locally, with baselines updated on purpose and the diff reviewed.
- Prefer a rendered check over a source regex. If a fix is about a colour or a size, assert the computed result in `tests/visual/`; a source-level assertion on a class name only proves the class was typed.
- New post-page components get a crop in `screenshots.spec.ts` and, if they have behaviour, a flow in `interactions.spec.ts`.
- Page-level structure assertions go in `tests/dist-pages.test.mjs` and must hold for any content; component-specific markup with synthetic props stays in the component tests.

## Known gaps

- Shiki token colours inside code blocks are excluded from the contrast audit: `github-light` and `tokyo-night` ship several tokens below 4.5:1 (comments, attribute names). Changing that is a theme decision, not a regression.
- Only Chromium is exercised. Safari / Firefox rendering and the Chrome Android zoom-out itself are approximated by the 360px `isMobile` project and the overflow invariant.
- Mermaid label clipping depends on the viewer's fonts; the suite verifies the diagrams in Chromium with the fonts available on the test machine.
