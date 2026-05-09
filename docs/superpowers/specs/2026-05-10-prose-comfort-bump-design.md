# Prose Comfort Bump Design

**Date:** 2026-05-10

## Goal

Address the author's perception that body prose on the site reads small compared to a benchmark (`wormwlrm.github.io`). Bump every "reading prose" surface — the article body, post-card descriptions, and the post-summary block — from 1rem (16px) to 1.125rem (18px), preserving the existing typographic vocabulary for everything else (eyebrow labels, dates, metadata, card titles, hero h1, UI chrome). At the same time, fix a small internal inconsistency in figure rendering: in-prose images that are narrower than the figure container currently sit flush-left while the figcaption is already centered. Center the image so the figure block reads as one coherent unit.

## Decision

- Add `prose-lg` to the `.prose-site` `@apply` chain in `src/styles/global.css`. This bumps body font-size to 1.125rem and proportionally retunes line-height, paragraph spacing, heading scale, list indents, code-block sizing, and figure margins as a coordinated set.
- Bump four specific reading-prose surfaces outside `prose-site` from `1rem` to `text-lg` (1.125rem): the description `<p>` in `PostList.astro`, the description `<p>` in `PostSummary.astro`, and the description `<p>` in the inline post-list on each home page (`src/pages/index.astro`, `src/pages/en/index.astro`).
- Leave eyebrow labels (`text-sm uppercase tracking-[0.18em]`), dates and other metadata (`text-sm`), card titles (`text-2xl`), the hero h1 (`text-4xl sm:text-5xl`), the AboutIdentity intro summary (already `text-lg`), the AboutIdentity education/experience descriptions (compact list pattern at 1rem), and the RelatedReading description (`text-sm` compact card-list pattern) untouched.
- Do not change `html { font-size }` or any root scaling. Browser default 16px stays as the rem base.
- Change `.prose-site figure img` in `src/styles/global.css` from `margin: 0` to `margin: 0 auto`. Tailwind Typography already declares `figure img { display: block }`, so the auto-centering takes effect without further rules.
- Hand-written font-size overrides for figcaption (`0.875rem`), callout label (`0.75rem`), and any other absolute-sized elements stay as-is — they are intentionally absolute "small text" sizes that do not need to scale with body prose.

## Why

- **The "small site" feeling localizes to reading prose, not chrome.** A direct CSS audit of the benchmark site (`wormwlrm.github.io`) showed that wormwlrm's body and card descriptions are 1.125rem (with line-height 1.6), but their root font-size is the browser default 16px and their card titles, eyebrow labels, and metadata are sized comparably to the current sings.dev. The author's intuition that "everything feels small" was driven by the surfaces that are paragraph-style reading text — the article body and the descriptions under post-card titles — not by the chrome.
- **`prose-lg` retunes vertical rhythm as a set.** Tailwind Typography ships pre-tuned size variants. Bumping `font-size` alone would make body text larger while keeping paragraph gaps, heading scales, list indents, and code-block padding sized for 1rem prose, producing a "tall body, cramped surroundings" effect. `prose-lg` adjusts every dependent value at the same time. The site already has substantial custom CSS layered on `.prose-site` (figure margins, callouts, code copy buttons, list markers); switching size variant via the plugin's documented mechanism keeps those overrides aligned with the plugin's internal proportions, where bumping `font-size` directly would gradually drift them.
- **Picking `prose-lg` (1.125rem) over the benchmark's exact 1.15rem.** The visual difference is 0.4px (0.025rem) — invisible at normal reading distance. The engineering difference is real: 1.125rem is the plugin's standard step, so it ships with a coordinated set of paragraph-spacing / heading-scale / line-height adjustments. 1.15rem would require either accepting prose-base spacing under prose-lg-sized text (the cramped effect described above) or hand-tuning every dependent value and maintaining that drift forever.
- **The figure-image alignment fix resolves an inconsistency.** `src/styles/global.css` already sets `.prose-site figcaption { text-align: center }`. Combined with the current `.prose-site figure img { margin: 0 }`, a narrow figure currently renders as a left-flush image with a centered caption underneath — visually two different alignment axes inside one figure block. Centering the image puts both elements on the same axis and treats the figure as the single "exhibit" unit it semantically is. This matches the convention on most editorial reading sites including the benchmark.
- **The narrow scope on the home page eyebrow and date.** "최근 글" / "Latest writing" is a section eyebrow — small uppercase letter-spaced text functioning as a category marker, sized to be visibly secondary to the post title. Bumping the eyebrow up would flatten the visual hierarchy between "section label" and "post body". Same logic applies to dates and metadata, which sit one level below body in the typographic ladder. The benchmark keeps these small for the same reason.
- **Side effect: the "small date" perception will likely lessen for free.** With a card description at 1.125rem above a 14px date, the contrast between the two is 18:14 (1.29×) instead of the current 16:14 (1.14×). The hierarchy reads more cleanly even though the date itself is unchanged.

## Scope

### In scope

- `src/styles/global.css`:
  - In `.prose-site`'s `@apply` chain, add `prose-lg` between `prose` and `prose-stone`. Result: `@apply prose prose-lg prose-stone max-w-none ...`.
  - In `.prose-site figure img`, change `margin: 0` to `margin: 0 auto`. All other declarations (border-radius, border, dark-mode border-color override) stay.
- `src/components/PostList.astro` line 71: add `text-lg` to the description `<p>` class list.
- `src/components/PostSummary.astro` line 23: change `text-base` to `text-lg` on the summary `<p>`.
- `src/pages/index.astro` line 111: add `text-lg` to the inline post-list description `<p>` class list.
- `src/pages/en/index.astro` line 88: add `text-lg` to the inline post-list description `<p>` class list.
- Tests: extend `tests/theme-typography.test.mjs` (or add a new `tests/prose-comfort.test.mjs`, whichever the implementation phase prefers) to grep-assert each of the five edits above, so a future refactor cannot silently regress the size choice.
- Documentation: update `docs/spec-theme-typography.md` to record the body prose size decision and the `prose-lg` usage, and update `docs/spec-post-detail.md` if it currently asserts a specific body size.

### Out of scope

- Any change to `html { font-size }` or any root-level font-size scaling.
- Any change to UI chrome: site header, footer, navigation, comments, TOC, search modal, code-copy button, lightbox.
- Any change to eyebrow labels, section labels, dates, reading-time text, category badges, tag chips, or any `text-sm` / `text-xs` / `text-[0.7*]rem` / `text-[0.8*]rem` element.
- Any change to card titles, the hero h1, post-detail h1, h2, h3, h4, or any heading utility outside what `prose-lg` already retunes inside the article body.
- Any change to the `RelatedReading.astro` description — it stays at `text-sm leading-6` as a compact card-list pattern.
- Any change to `AboutIdentity.astro` education or experience descriptions — they stay at `1rem leading-7` as a structured-list pattern.
- Any change to the AboutIdentity intro summary — it is already `text-lg leading-8` and matches the new target.
- Any palette or color-token change.
- Any change to `figcaption`, callout label, or other absolute-sized "small text" overrides in `.prose-site`.
- Refactoring `src/pages/index.astro` and `src/pages/en/index.astro` to share the `PostList` component instead of inlining a near-duplicate post list — known duplication, separate cleanup, not blocking this change.
- Any change to wide-figure handling (`figure[data-width="wide"]` negative-margin bleed). The new `margin: 0 auto` on the inner `<img>` does not conflict — wide images already fill the bleed container at 100% width, so the auto margins collapse.

## Architecture

### `prose-lg` interaction with existing overrides

`.prose-site` currently composes `prose prose-stone max-w-none` plus a long list of `prose-*` utilities for color and palette. Adding `prose-lg` to the chain triggers the plugin's size-variant rules, which retune:

- Body `font-size` to `1.125rem` and `line-height` to `1.7777778`.
- Heading sizes (h1 through h4) and their margins/line-heights.
- Paragraph `margin-top` / `margin-bottom`.
- List `padding-left`, list-item `margin-top` / `margin-bottom`.
- Code-block padding and inline-code font-size.
- Default figure `margin-top` / `margin-bottom` (overridden by the existing `.prose-site figure { margin: 1.5rem 0 }` rule, which has higher specificity and stays the source of truth).
- Default figcaption `font-size` (overridden by the existing `.prose-site figcaption { font-size: 0.875rem }` rule, which has higher specificity and stays the source of truth).

The two existing `.prose-site figure` and `.prose-site figcaption` overrides are intentionally specific. Their values stay constant; the plugin's larger figure/figcaption defaults at `prose-lg` are shadowed. This is the same shadowing pattern the file already relies on at `prose-base` — no new precedence concerns.

### Figure image centering

```css
/* before */
.prose-site figure img {
    margin: 0;
    border-radius: 0.375rem;
    border: 1px solid rgb(220 214 204 / 1);
}

/* after */
.prose-site figure img {
    margin: 0 auto;
    border-radius: 0.375rem;
    border: 1px solid rgb(220 214 204 / 1);
}
```

`@tailwindcss/typography` declares `figure img { display: block }` as part of `prose`, which is already in effect via the `prose-site` chain. With `display: block` and `margin: 0 auto`, an image narrower than its figure container centers within the container. Images that are exactly as wide as the container (or that bleed beyond via the `data-width="wide"` mechanism) render unchanged because the auto margins collapse.

The dark-mode rule (`:where(.dark) .prose-site figure img { border-color: ... }`) only sets `border-color` and is unaffected.

### Component class edits

The four component-level edits all add (or change) a single utility on a description `<p>`:

| File | Line | Before | After |
|---|---|---|---|
| `src/components/PostList.astro` | 71 | `class="max-w-2xl leading-8 text-dawn-700 dark:text-night-200"` | `class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200"` |
| `src/components/PostSummary.astro` | 23 | `class="mt-2 max-w-2xl text-base leading-8 text-dawn-700 dark:text-night-200"` | `class="mt-2 max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200"` |
| `src/pages/index.astro` | 111 | `class="max-w-2xl leading-8 text-dawn-700 dark:text-night-200"` | `class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200"` |
| `src/pages/en/index.astro` | 88 | `class="max-w-2xl leading-8 text-dawn-700 dark:text-night-200"` | `class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200"` |

`text-lg` from Tailwind defaults to `font-size: 1.125rem; line-height: 1.75rem`. The `leading-8` already on each `<p>` resolves to `line-height: 2rem` and takes precedence — Tailwind's `leading-*` utilities are generated after `text-*` utilities in the CSS output, so they override the line-height baked into `text-*`. Result on the four edited surfaces: 1.125rem font-size, 2rem line-height — slightly wider line-leading than `text-lg` defaults to, matching the existing "essay" feel of these descriptions and incidentally aligning with `prose-lg`'s body line-height ratio of 1.778 (2rem / 1.125rem).

### Why `text-lg` and not `text-[1.125rem]`

`text-lg` is Tailwind's standard step. Using the named utility keeps a uniform vocabulary across the file ("size that matches body prose" reads as `text-lg`, just like `prose-lg` reads as the matching prose-size step) and avoids introducing one-off arbitrary values that future maintainers have to interpret.

## Verification Target

- `npm run astro -- check` passes.
- `npm test` passes; the new or extended tests assert the five edits.
- `npm run dev` renders the post detail page with body prose at 1.125rem, retuned heading and paragraph rhythm, and figures with their images centered (verifiable on any post containing a narrow figure — for example, posts in the IAM checklist series).
- `npm run dev` renders both home pages (`/`, `/en/`) with the post-card descriptions at 1.125rem; eyebrow labels, dates, post titles unchanged.
- `npm run dev` renders the post detail page with the summary block at 1.125rem and the body underneath at 1.125rem; the two surfaces read at the same size, with the summary still distinguished by its left-rule and uppercase label rather than by font-size.
- `/about` is unaffected (AboutIdentity does not use `prose-site` and its summary is already `text-lg`).
- Wide figures (`data-width="wide"`) still bleed beyond the prose container on `>=md` viewports; the inner image continues to fill its bleed width because the auto margins collapse when the image is at 100% of its container.
- No regressions in dark mode for any of the touched surfaces.

## Documentation

- **Update**: `docs/spec-theme-typography.md` — add a "Body Prose Size" subsection capturing that body reading prose is `prose-lg` (1.125rem) via the `.prose-site` chain, with the rationale that it is the plugin's standard size step matching the editorial-blog reading-comfort target. Cross-reference this design doc.
- **Update (if the file currently asserts a specific size)**: `docs/spec-post-detail.md`. Spot-check before editing — the change is editorial-only.
- **Update**: `docs/spec-roadmap.md` — append a Current State bullet noting the prose comfort bump shipped.

## Alternatives Considered

- **Bump `html { font-size }` from the browser default 16px to ~17.5px or 18px** so every rem-based size scales at once. Rejected: blast radius covers UI chrome that is intentionally compact (tap targets, header padding, button sizes, search modal, code-copy button). The benchmark site does not do this, and the author's perception was specifically about reading prose, not chrome. Single-line elegance does not justify the regression surface.
- **Pick the benchmark's literal 1.15rem instead of `prose-lg`'s 1.125rem.** Rejected: the visual difference is 0.4px and reading-comfort change is none, while leaving the plugin's standard step would force either accepting prose-base spacing under larger text or hand-tuning every dependent margin and heading and maintaining that drift. The plugin's coordinated step is the right unit of change.
- **Bump only `.prose-site` and stop there.** Rejected as the user-facing decision: the post-card descriptions on the home page and archive — the surfaces a reader sees before clicking into an article — are reading prose with the same role as the article body. Leaving them at 1rem while bumping article body would produce a visible "list reads small, article reads bigger" jump on every navigation, and would only partly address the stated complaint.
- **Also bump `RelatedReading.astro` description and `AboutIdentity.astro` education/experience descriptions to `text-lg`.** Rejected: these are compact list-card patterns, not main reading prose. They already serve a "supporting elaboration in a structured list" role, and bumping them would push the related-reading footer into the same visual weight as the post body it follows, weakening the visual closure of the article.
- **Bump eyebrow labels and date/metadata up one step (e.g., `text-sm` → `text-[0.9375rem]`)** to address the screenshot's small-feeling chrome directly. Rejected for this iteration: the typographic role is "secondary marker", and bumping it flattens the hierarchy that visually distinguishes section structure from body content. The follow-up plan if the author still feels these are too small after the body bump ships is to revisit per-element rather than as a sweeping change.
- **Apply `prose-xl` (1.25rem) instead of `prose-lg` (1.125rem).** Rejected: 1.25rem reads as "extra large" rather than "comfortable body" and exceeds the benchmark, the plugin's intended "comfortable body" step is `prose-lg`. The audited benchmark sits at 1.125rem; matching that is the right calibration.
- **Center figure images via `text-align: center` on the `<figure>` block.** Rejected: relies on inline-element alignment via inherited `text-align`, which would also affect any text inside the figure (including a future caption variant). Setting `margin: 0 auto` directly on the `<img>` is more explicit about intent — the image is centered, not the figure's text content.
