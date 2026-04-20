# Reading Comfort Polish Design

**Date:** 2026-04-21

## Goal

Soften the site's visual feel on both sides of the theme switch by (a) shifting the light-mode body background one step in from pure white, (b) replacing the dark-mode palette with a Tokyo Night Storm-inspired set of custom tokens that keep the muted, editorial character, and (c) introducing Pretendard Std Variable as the primary typeface for both Korean and Latin text. The outcome is a quieter reading surface that matches the blog's "essay, not dashboard" philosophy at both first paint and during long reading sessions.

## Decision

- Keep the stone palette in light mode. Shift the body background from `stone-50` (#fafaf9) to `stone-100` (#f5f5f4). Text, border, and muted tokens stay on the existing stone family.
- Introduce a new `night` custom color family in `src/styles/global.css` via the Tailwind 4 `@theme` block. Remap every `dark:*-stone-*` token in the codebase to the corresponding `dark:*-night-*` token.
- Self-host **PretendardStdVariable.woff2** (already copied to `public/fonts/`) and declare it as the primary `--font-sans` value in the `@theme` block. Remove the `font-serif` class from the body in `src/layouts/Layout.astro` so text inherits the new sans stack.
- Preserve the monospace stack for `<code>` and `<pre>` elements so code blocks continue to render in `ui-monospace` fallbacks.
- Ship the OFL license file alongside the font at `public/fonts/PretendardStd.LICENSE.txt` (already copied).
- Split the work into clean commits per layer (Tailwind tokens → font loading → light palette shift → dark palette remap → prose overrides → tests → docs) so each layer is independently reviewable and revertible.

## Why

- Pure white (`#fafaf9`) and near-black (`#0c0a09`) are the loudest possible surface on a reader's screen. On long-form reading surfaces, small inward steps (`stone-100`, `#f5f5f4` in the light direction; Tokyo-Night-Storm grays in the dark direction) noticeably reduce eye fatigue without losing the quiet editorial feel. Every reference blog the author named — Josh Comeau, Robin Rendle, Dan Abramov — sits in this off-white / off-black territory.
- Tokyo Night's Storm variant is a well-documented, widely recognized dark palette whose muted blue-gray tones match the blog's philosophy better than stone-black would. The variant explicitly avoids pure black while staying calm and atmospheric. The author picked it for personal affinity with the terminal theme, and that emotional resonance is a real design signal worth respecting.
- Pretendard Std covers 100% of the modern Korean this blog will ever contain (KS X 1001, 2,350 syllables). At 285 KB the variable font is cheap enough to preload without harming first paint, and Pretendard's hybrid Latin design means it carries both Korean and English in a single consistent stack. The current `font-serif` fallback produces inconsistent Korean rendering across platforms (Apple Myungjo on macOS, Malgun Gothic or Batang on Windows, browser defaults on Linux); adopting Pretendard fixes that plurality of inconsistent rendering with a single self-hosted file.
- The project is on Tailwind 4 with CSS-based theme configuration (`@import "tailwindcss"` in `src/styles/global.css`). CSS-based custom tokens are the idiomatic way to extend the palette, and the compiler auto-generates `bg-night-*`, `text-night-*`, `border-night-*`, `ring-night-*`, `divide-night-*`, and `ring-offset-night-*` utilities once `--color-night-*` tokens are declared.
- Splitting the iteration into seven layered commits lets the author roll back any one change independently (for example, revert the dark palette while keeping the font and light palette changes) if any one piece doesn't feel right in practice.

## Scope

### In scope

- `src/styles/global.css` — add `@font-face` for Pretendard Std Variable; add `@theme` block containing the `night` color tokens and the `--font-sans` override; update the hand-written prose-figure CSS that currently references `stone-200`/`stone-800` in the dark branch to reference `night-*` instead.
- `src/layouts/Layout.astro` — add a `<link rel="preload">` for the font file in `<head>`; update the `<html>` and `<body>` classes so `bg-stone-50` → `bg-stone-100`, `dark:bg-stone-950` → `dark:bg-night-800`, and remove `font-serif` from the body class.
- Every component and page that uses `dark:*-stone-*` — remap to the matching `dark:*-night-*` token per the **Color Mapping Table** below. The mapping covers `bg`, `text`, `border`, `divide`, `ring`, and `ring-offset` variants.
- Every component and page that uses `bg-stone-50` or `bg-stone-50/<opacity>` in a light-mode context — migrate to `bg-stone-100` / `bg-stone-100/<opacity>` so the header's translucent layer and focus-ring offsets still match the body background.
- `@tailwindcss/typography` overrides inside `<article class="prose">` wrappers — update any `dark:prose-*-stone-*` utility class to the corresponding `dark:prose-*-night-*`.
- Tests: add `tests/theme-typography.test.mjs` that source-greps the key files to confirm the palette shift and font-face declaration actually shipped, and runs a small rendered-output check for the body class. Update any existing test that hard-codes `stone-950` / `stone-50` references in its assertions.
- New SSOT `docs/spec-theme-typography.md` capturing the palette, font stack, and editorial guardrails for future theme work. Update `docs/spec-layout.md`, `docs/spec-roadmap.md`.

### Out of scope

- Any change to the temporary Medium legacy notice (the sky-blue CTA stays as-is; its colors are explicitly non-stone and are a separate retirement task).
- Any change to hero headline or body prose on either home page (the author will rewrite prose separately).
- Any change to post content, frontmatter, or any blog-reading behavior.
- A light-mode palette remap beyond the single `stone-50` → `stone-100` body-background step.
- Introducing any third typeface for headings or captions.
- Any change to the monospace stack.
- Any Tokyo Night syntax accent colors (purple, green, yellow highlights). Only the muted background and text tones from the Storm variant come across.
- Any removal or cleanup of the legacy `tailwind.config.mjs` file (Tailwind 4's CSS-based config is additive; the JS config is effectively inert but harmless).

## Architecture

### `@theme` block (`src/styles/global.css`)

Tailwind 4 generates utilities directly from CSS-declared tokens. The block goes at the top of `global.css` after `@import "tailwindcss"` and the `@custom-variant` / `@plugin` directives already present:

```css
@theme {
	--font-sans:
		"Pretendard Std Variable", "Pretendard Std", "Pretendard",
		ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI",
		"Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;

	--color-night-50: #c0caf5;
	--color-night-100: #a9b1d6;
	--color-night-200: #9aa5ce;
	--color-night-300: #737aa2;
	--color-night-400: #565f89;
	--color-night-500: #414868;
	--color-night-600: #3b4261;
	--color-night-700: #292e42;
	--color-night-800: #24283b;
	--color-night-900: #1f2335;
	--color-night-950: #16161e;
}
```

After this block, `bg-night-800`, `text-night-50`, `border-night-600`, etc. are all valid Tailwind utilities and can be used with the `dark:` variant.

Note the `night` palette is **luminance-correct but semantically ordered around Storm-as-primary-bg**: `night-800` (Tokyo Night Storm primary bg `#24283b`) is the dark body background. `night-900` (`#1f2335`) is the slightly darker "panel" / secondary surface. `night-950` (`#16161e`) is the deepest variant, used sparingly if at all. Text descends from `night-50` (lightest, primary text) through `night-500` (mid-muted).

### `@font-face` (`src/styles/global.css`)

Place the face declaration after the `@import` line and before any custom CSS. The format token `woff2-variations` is what browsers expect for a variable woff2.

```css
@font-face {
	font-family: "Pretendard Std Variable";
	src: url("/fonts/PretendardStdVariable.woff2") format("woff2-variations");
	font-weight: 100 900;
	font-style: normal;
	font-display: swap;
}
```

### Preload hint (`src/layouts/Layout.astro`)

The font is on the critical path for first-paint text. Add a `<link rel="preload">` immediately after the existing `<link rel="icon">` lines:

```astro
<link rel="preload" href="/fonts/PretendardStdVariable.woff2" as="font" type="font/woff2" crossorigin />
```

`font-display: swap` keeps text readable during the (brief) load window by showing the system fallback stack and swapping in Pretendard once available.

### Body class changes (`src/layouts/Layout.astro`)

- `<html>`: `bg-stone-50` → `bg-stone-100`, `dark:bg-stone-950` → `dark:bg-night-800`. Text classes stay on `text-stone-900` / `dark:text-stone-100` in this one file; those are handled by the general codebase remap in the next step.
- `<body>`: same `bg` changes; **remove** `font-serif` so the body picks up the default `font-sans` (now Pretendard via `@theme`).

### Color Mapping Table

Applied to every `dark:*-stone-*` utility across the codebase. The light-mode utilities (non-`dark:` variants) stay on stone.

| Stone token | Night replacement | Role |
|-------------|-------------------|------|
| `bg-stone-950` | `bg-night-800` | Primary dark body bg (Storm `#24283b`) |
| `bg-stone-900` | `bg-night-900` | Secondary dark bg (panels, cards) |
| `bg-stone-800` | `bg-night-700` | Interactive hover bg |
| `text-stone-50` | `text-night-50` | Primary text |
| `text-stone-100` | `text-night-100` | Primary text (lighter weight variant) |
| `text-stone-200` | `text-night-200` | Subdued primary text |
| `text-stone-300` | `text-night-200` | Secondary text |
| `text-stone-400` | `text-night-300` | Secondary-muted text |
| `text-stone-500` | `text-night-400` | Muted text |
| `border-stone-800` | `border-night-600` | Primary border (hairlines, dividers) |
| `border-stone-700` | `border-night-500` | Emphasis border |
| `divide-stone-800` | `divide-night-600` | List divider |
| `ring-stone-700` | `ring-night-500` | Focus ring |
| `ring-offset-stone-950` | `ring-offset-night-800` | Focus ring offset, matches body bg |
| `ring-offset-stone-900` | `ring-offset-night-900` | Focus ring offset on panels |

The table is the authoritative mapping for the mechanical remap. Any `dark:*-stone-*` that does not appear in the table should be reviewed before touching — it likely indicates either a stone shade we haven't mapped (rare) or an editorial choice that predates this spec.

### Light-mode `bg-stone-50` migration

In light mode, `bg-stone-50` is used specifically as the body background and the sticky-header translucent layer and focus-ring offsets that match the body. After this shift:

- `bg-stone-50` → `bg-stone-100`
- `bg-stone-50/80` → `bg-stone-100/80` (translucent header)
- `ring-offset-stone-50` → `ring-offset-stone-100`

### Light-mode side effects on panels that already use `bg-stone-100`

Shifting the body bg to `stone-100` collapses the visual contrast against any component that currently differentiates itself with `bg-stone-100`. Those components must step one shade up so they still read as a distinct surface against the body.

Affected tokens (verified by grep):

- **Tag pills** in `src/components/PostList.astro`, `src/components/ArchiveFilters.astro`, `src/components/PostHeader.astro`. Each uses `bg-stone-100` for the idle pill background with `hover:bg-stone-200`. Shift both up one:
  - `bg-stone-100` → `bg-stone-200`
  - `hover:bg-stone-200` → `hover:bg-stone-300`
- **Archive filter toggle state** in `src/pages/posts/index.astro` and `src/pages/en/posts/index.astro` (the inline `<script>` arrays `activeClasses` / `inactiveClasses`). The inactive bg is `bg-stone-100` with `hover:bg-stone-200`. Apply the same shift. The active `bg-stone-900` (dark high-contrast flip) stays as-is.
- **Code block background** in the prose override string inside `src/pages/posts/[...slug].astro` and `src/pages/en/posts/[...slug].astro` — `prose-pre:bg-stone-100` → `prose-pre:bg-stone-200`. Code blocks should remain visibly separate from body prose.

No other light-mode stone shade shifts. Borders (`stone-200`), muted text (`stone-500`, `stone-600`), primary text (`stone-900`), and all dark-mode tokens remain governed by the Color Mapping Table above.

### Prose overrides

`@tailwindcss/typography` has its own dark-mode token vocabulary used via `dark:prose-*` utilities. Post detail pages and the About page currently apply explicit overrides like `dark:prose-a:text-stone-100`, `dark:prose-blockquote:border-stone-700`, `dark:prose-code:text-stone-100`, `dark:prose-pre:border-stone-700`, and `dark:prose-pre:bg-stone-900`. Each such utility is remapped per the table above.

Additionally, the hand-written CSS in `src/styles/global.css` for `.prose figure img` and `.prose figcaption` references `stone-800` and `stone-400` via literal `rgb(...)` values in the `:where(.dark)` branches. These two rules get rewritten to reference the night palette via literal colors (since these are in global.css which does not benefit from Tailwind's token expansion).

### Testing approach

This iteration is largely stylistic. The tests do two things:

1. **Source-level regression guard (`tests/theme-typography.test.mjs`, new)** — a single `readFile` test that asserts `src/styles/global.css` contains the `@font-face` for `Pretendard Std Variable`, the `--font-sans` override, all eleven `--color-night-*` tokens, and the post-figure dark rules referencing night colors. It also asserts `src/layouts/Layout.astro` contains the preload hint and the updated `bg-stone-100` / `bg-night-800` body classes with no lingering `font-serif`.
2. **Mechanical remap verification (`tests/theme-typography.test.mjs`, same file)** — a second test that greps the source tree for any `dark:*-stone-*` utility, filters out the allowlist (the temporary Medium legacy notice uses non-stone sky tokens), and asserts the result is empty. This catches any page that was missed in the bulk find-and-replace.

Existing rendering tests (`archive-hub-structure`, `post-detail-structure`, etc.) do not hard-code stone class strings in their assertions, so they remain green without edits.

## Verification Target

- `npm run astro -- check` passes (no new errors beyond pre-existing ones).
- `npm test` passes. The new test file plus any adjustments are green.
- `npm run dev` renders:
  - Light mode: body sits on `#f5f5f4`; sticky header's translucent layer matches; text in Pretendard; Korean and English in the same sans family.
  - Dark mode: body sits on `#24283b`; panels/cards noticeably darker; text in `#c0caf5`; hairlines and focus rings readable against the night bg.
- The font file at `/fonts/PretendardStdVariable.woff2` returns 200 with `Content-Type: font/woff2` in both dev and built output.
- No `dark:*-stone-*` remains in the source tree after the remap, except the deliberate allowlist (Medium notice's `dark:border-sky-*` etc. — these are sky, not stone, so unaffected).
- `body` has no `font-serif` class.
- The OFL license file is present at `public/fonts/PretendardStd.LICENSE.txt`.

## Documentation

- **New**: `docs/spec-theme-typography.md` — SSOT for palette and typography. Documents the light-mode stone family, the custom night palette (with the Storm-as-primary-bg rationale so future readers understand why `night-800` is the body bg), the Pretendard Std self-host rationale, and the guardrail that Tokyo Night accent colors are off-limits.
- **Update**: `docs/spec-layout.md` — body/html classes and the font-face reference.
- **Update**: `docs/spec-roadmap.md` — append a Current State bullet noting the reading-comfort polish shipped.

## Alternatives Considered

- **Drop straight from `stone-50` to a custom warm off-white like `#faf7f2`**. Rejected: breaks the stone family consistency (borders, text, muted tokens all remain stone), and the visual gain over `stone-100` is tiny. `stone-100` is one cleaner step.
- **Use the `slate` palette for dark mode** (which has a built-in subtle blue undertone, halfway between stone and Tokyo Night). Rejected: the author specifically wants Tokyo Night Storm's flavor, and slate's cool gray reads too much like "generic cold dark theme" for the atmosphere we're going for.
- **Use full Pretendard** (the non-Std variant, 2.0 MB). Rejected: the 1.7 MB saving from Std covers 100% of what a modern Korean tech blog writes. The archaic KS X 1002 syllables and heavy Hanja that Std drops will not appear in this blog's content.
- **Use Pretendard via CDN (jsDelivr or similar)**. Rejected: adds an external runtime dependency, privacy footprint, and cache-opacity the site otherwise doesn't have. Self-hosting 285 KB is strictly better.
- **Keep `font-serif` for Latin and only apply Pretendard to Korean via `:lang(ko)` CSS selectors**. Rejected: fragile (the `:lang()` selector can't distinguish inline Korean inside a Latin paragraph), and Pretendard's Latin is designed to sit alongside its Korean, so a unified sans stack reads more consistently than a hybrid.
- **Define night colors in `tailwind.config.mjs` instead of CSS `@theme`**. Rejected: the project is on Tailwind 4 with CSS-based config (`global.css` uses `@import "tailwindcss"`). CSS-based token declaration is idiomatic; JS-based config is legacy and effectively inert here.
- **Remove the `tailwind.config.mjs` file as part of this change**. Rejected: scope creep. The file is harmless, and cleaning it up deserves its own small PR.
- **Ship a full light-mode palette remap alongside the dark-mode one** (e.g., custom "paper" palette for light). Rejected: the light mode is already in good shape with stone; a single `stone-50 → stone-100` step solves the harshness complaint without introducing a second custom palette family this iteration.
