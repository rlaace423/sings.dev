# H2 Dawn Palette + Theme Transition Design

**Date:** 2026-04-24

## Goal

Land the custom **`dawn`** light-mode palette ("H2": warm paper background + cool-tinted ink + terracotta link accent) chosen through the `/theme-preview` exploration, and add a smooth 0.25s color-fade that plays only during theme toggle. Dark mode (Tokyo Night Storm / `night` palette) stays exactly as-is; the change is fully scoped to the light-mode surface and the toggle transition. The new light palette shares the hex `#24283b` between its primary text (`dawn-800`) and the dark-mode body bg (`night-800`), creating a single-hue bridge that ties the two modes together.

## Decision

- Define a custom `dawn` scale (11 shades) plus a standalone `terracotta-600` accent as Tailwind 4 `@theme` tokens in `src/styles/global.css`. Tailwind auto-generates utilities (`bg-dawn-100`, `text-dawn-800`, `text-terracotta-600`, etc.).
- Remap every existing light-mode `*-stone-*` utility across the codebase to its `*-dawn-*` equivalent per a mapping table. No dark-mode `*-night-*` utility changes.
- Update the four pages that apply `prose-stone` (two post-detail pages + two about pages) with explicit `prose-p:text-dawn-800`, `prose-headings:text-dawn-800`, `prose-a:text-terracotta-600`, and related utilities so the cool-ink feel carries into the post body.
- Add a `.theme-transition` class rule in `global.css` that applies a 250ms color fade to every element. The class is added to `<html>` only during a theme toggle (manual click or system-preference change) and removed after 300ms, so the initial page render and hover/focus state changes stay instant.
- Update the existing `tests/theme-typography.test.mjs` to assert the dawn tokens, the terracotta accent, the `.theme-transition` rule, the new html/body classes, and the absence of stray light-mode `*-stone-*` utilities across the source tree.
- Retire the `/theme-preview` utility page in the same iteration, since the selection it supported is now made.

## Why

- Dark mode (Tokyo Night Storm) already has a named, character-driven palette. The light mode was using Tailwind's default `stone` utility scale, which functions well but has no identity and creates a naming asymmetry between the two modes. H2 gives the light side an equivalent custom palette with its own story (warm paper editorial tone).
- Sharing the exact hex `#24283b` between `dawn-800` (light primary text) and `night-800` (dark body bg) makes the two modes feel like "the same place at different times of day" rather than "two unrelated themes." The color is always present on screen in both modes; only its role (text vs background) reverses. This creates a quiet, deliberate palette continuity without any flashy cross-mode tricks.
- The terracotta link accent (`#a04e2a`) gives links a visibly distinct color without importing a generic blue hyperlink or a pink accent that would clash with the technical subject matter. It shares a warm-orange hue family with Tokyo Night's syntax string colors, so dark-mode readers encountering the link see a familiar palette note.
- The `.theme-transition` class pattern is the cleanest way to get a fade only during toggle. Applying `transition` globally would also animate hover/focus state changes (jittery feel) and the initial render (FOUC-like flash). The class lives on `<html>` for <= 300ms around each toggle, which is exactly the window where a fade is helpful.
- Splitting the iteration into layered commits (palette tokens, transition, body wiring, bulk remap, prose, tests, docs, cleanup) keeps each commit independently revertible and easy to review. The same pattern worked for the earlier `night` palette roll-out.

## Scope

### In scope

- `src/styles/global.css` — add dawn tokens, terracotta-600 accent, and `.theme-transition` rule to the existing `@theme` and CSS blocks.
- `src/layouts/Layout.astro` — update the `<html>` and `<body>` class strings from `bg-stone-100 text-stone-900` to `bg-dawn-100 text-dawn-800`; update the two client-side theme toggle scripts (manual click + system-preference change) to add `theme-transition` before the toggle and remove it after 300ms.
- Bulk remap of every light-mode `*-stone-*` utility across the source tree to its `*-dawn-*` counterpart. The mapping table is the authoritative list.
- `src/pages/posts/[...slug].astro` (KO) and `src/pages/en/posts/[...slug].astro` (EN) — add `prose-p:text-dawn-800`, `prose-headings:text-dawn-800`, `prose-a:text-terracotta-600`, `prose-a:decoration-terracotta-600/40` to the existing prose class string, and remap the other light-mode prose utilities per the table.
- `src/pages/about.astro` (KO) and `src/pages/en/about.astro` (EN) — the prose class string currently contains only `prose prose-stone max-w-none dark:...`. Add the same set of light-mode prose overrides so about-page body text also carries the H2 treatment.
- `src/components/PostSummary.astro` — update the left border from `border-stone-400` to `border-dawn-600` (maintains the "one notch darker than the border token" visibility we settled on, but in dawn space).
- `tests/theme-typography.test.mjs` — expand assertions to cover the new dawn + terracotta tokens, the `.theme-transition` rule, the Layout html/body changes, the absence of light-mode `*-stone-*` across the tree, and the toggle-script class add/remove logic.
- `docs/spec-theme-typography.md` — add a "Dawn palette" section mirroring the Night palette section, a "Terracotta accent" note, and a "Theme transition" note.
- `docs/spec-roadmap.md` — append a Current State bullet recording the landed light-mode palette and transition.
- `src/pages/theme-preview.astro` — delete in the final cleanup commit.

### Out of scope

- Any change to the `night` dark palette or any `dark:*-night-*` utility.
- Any change to the Shiki light theme (`github-light` stays). Code-block backgrounds painted by Shiki inline styles will sit on a warm dawn body but with a white Shiki-light bg; the visible contrast is minor and acceptable. Future iteration can revisit.
- Any change to `prose-strong`, `prose-em`, `prose-li`, `prose-hr` default colors. These inherit `prose-stone`'s stone-900 defaults, which visually collapse into dawn-800 at body-text scale. The "cool ink" effect comes from paragraphs and headings, which are explicitly overridden.
- Extracting the prose class strings into a shared helper. Four in-file string duplications are tolerable for now; DRY refactor can follow later if more prose-consuming surfaces appear.
- Migrating the temporary Medium legacy notice styles (stays on `sky-*` tokens).
- Accessibility retesting beyond the AA checks for dawn tokens done during brainstorming.

## Architecture

### `@theme` additions (`src/styles/global.css`)

Append to the existing `@theme` block (after the `night` tokens):

```css
@theme {
	/* ...existing night tokens stay here... */

	--color-dawn-50: #faf8f2;
	--color-dawn-100: #f5f3ee;
	--color-dawn-200: #e8e3d9;
	--color-dawn-300: #dcd6cc;
	--color-dawn-400: #b8aea1;
	--color-dawn-500: #7c8196;
	--color-dawn-600: #565f89;
	--color-dawn-700: #414868;
	--color-dawn-800: #24283b;
	--color-dawn-900: #1a1d2c;
	--color-dawn-950: #10121b;

	--color-terracotta-600: #a04e2a;
}
```

Rationale for the scale:
- `dawn-50..300` move through warm paper tones (ivory → cream → warm hairline). Used for body bg, panels, borders, hover surfaces.
- `dawn-400..500` are transition neutrals, rarely consumed directly but available for edge cases (mid-gray surfaces, subtle accents).
- `dawn-600..950` move through cool ink tones (blue-gray near-black). `dawn-600` is muted text (7.4:1 on dawn-100, AA safe), `dawn-700` is secondary, `dawn-800` is primary (matches `night-800` — the shared hex bridges the two modes), `dawn-900..950` are deeper emphasis shades.
- `terracotta-600` stands alone as a single-shade accent. A full terracotta scale is not needed for one link color; the single token keeps the palette surface minimal.

Contrast on `dawn-100` body bg:
- `dawn-800` primary text → 13:1 (AAA)
- `dawn-700` secondary → 10:1 (AAA)
- `dawn-600` muted → 7.4:1 (AA comfortable)
- `terracotta-600` link → 6.2:1 (AA)

### `.theme-transition` rule (`src/styles/global.css`)

Append below the existing `.astro-code` / `.shiki` dark override block:

```css
/*
 * Light/dark theme toggle transition.
 * The .theme-transition class is added to <html> only during an active
 * toggle (via the script in Layout.astro), applies a 250ms color fade
 * to every element, then is removed. That way:
 *   - Initial page load stays instant (no FOUC-adjacent flash).
 *   - Hover/focus state changes stay instant (responsive feel).
 *   - Only the moment of toggle animates, which is what the user sees
 *     when they consciously click the theme button.
 */
html.theme-transition,
html.theme-transition * {
	transition:
		background-color 250ms ease,
		color 250ms ease,
		border-color 250ms ease,
		fill 250ms ease,
		stroke 250ms ease !important;
}
```

The `!important` is required so the transition also applies to the Shiki dark-override rule, which itself uses `!important` to swap code-block token colors between themes.

### `Layout.astro` — html/body classes

Current:

```astro
<html lang={lang} class="bg-stone-100 text-stone-900 dark:bg-night-800 dark:text-night-100">
```

After:

```astro
<html lang={lang} class="bg-dawn-100 text-dawn-800 dark:bg-night-800 dark:text-night-100">
```

Body class follows the same swap: `bg-stone-100` → `bg-dawn-100`, `text-stone-900` → `text-dawn-800`. Dark-mode classes unchanged.

### `Layout.astro` — toggle-transition logic

Two script blocks need symmetric updates.

**Manual toggle handler** (around the existing `document.addEventListener("click", ...)` block):

```js
document.addEventListener("click", (event) => {
	const target = event.target;
	if (!(target instanceof Element)) return;

	const button = target.closest("[data-theme-toggle]");
	if (!button) return;

	const nextTheme = root.classList.contains("dark") ? "light" : "dark";

	root.classList.add("theme-transition");
	applyTheme(nextTheme);
	setTimeout(() => root.classList.remove("theme-transition"), 300);

	try {
		localStorage.setItem(storageKey, nextTheme);
	} catch {}
});
```

**System-preference change handler**:

```js
const handlePreferenceChange = (event) => {
	try {
		if (localStorage.getItem(storageKey)) return;
	} catch {}

	root.classList.add("theme-transition");
	applyTheme(event.matches ? "dark" : "light");
	setTimeout(() => root.classList.remove("theme-transition"), 300);
};
```

The initial `applyTheme(getPreferredTheme())` at page load stays unchanged — no class add — so the first render is instant.

### Stone → Dawn utility mapping

Applied as a bulk sed pass across every `.astro`, `.ts`, `.mjs` file under `src/`. The dark-prefixed `*-night-*` utilities must stay untouched; the sed rules target non-`dark:`-prefixed light-mode utilities.

| Stone utility | Dawn utility | Role |
|---|---|---|
| `bg-stone-100` | `bg-dawn-100` | body bg |
| `bg-stone-200` | `bg-dawn-200` | panel / code bg |
| `bg-stone-900` | `bg-dawn-800` | inverted active-pill bg |
| `border-stone-200` | `border-dawn-300` | hairline / divider |
| `border-stone-400` | `border-dawn-600` | PostSummary left rail (explicit re-pick) |
| `divide-stone-200` | `divide-dawn-300` | list divider |
| `focus-visible:ring-offset-stone-100` | `focus-visible:ring-offset-dawn-100` | focus ring offset |
| `focus-visible:ring-stone-300` | `focus-visible:ring-dawn-300` | focus ring |
| `focus:border-stone-300` | `focus:border-dawn-300` | focus border |
| `group-hover:text-stone-700` | `group-hover:text-dawn-700` | group-hover secondary |
| `hover:bg-stone-300` | `hover:bg-dawn-300` | panel hover |
| `hover:border-stone-300` | `hover:border-dawn-300` | border hover |
| `hover:text-stone-700` | `hover:text-dawn-700` | hover secondary |
| `hover:text-stone-950` | `hover:text-dawn-800` | hover primary |
| `ring-stone-200` | `ring-dawn-300` | idle ring |
| `ring-stone-300` | `ring-dawn-300` | focus ring idle |
| `text-stone-50` | `text-dawn-50` | inverted text on dark bg |
| `text-stone-400` | `text-dawn-600` | very muted (collapses with `stone-500 → dawn-600` for AA safety; the original stone-400/500 contrast difference is subtle enough to flatten) |
| `text-stone-500` | `text-dawn-600` | muted text |
| `text-stone-600` | `text-dawn-700` | secondary text |
| `text-stone-700` | `text-dawn-700` | secondary (hover target) |
| `text-stone-900` | `text-dawn-800` | primary text (the key semantic shift) |
| `text-stone-950` | `text-dawn-800` | primary (same role) |

Any unlisted `stone-*` pattern that grep finds after the sed pass is a signal to stop and review, not to guess a mapping.

### Prose overrides

#### Post detail pages (`src/pages/posts/[...slug].astro`, `src/pages/en/posts/[...slug].astro`)

Current light-mode section of the prose class string:

```
prose-stone
prose-a:text-stone-900
prose-a:decoration-stone-300
prose-a:underline-offset-4
prose-blockquote:border-stone-200
prose-blockquote:text-stone-600
prose-code:text-stone-900
prose-pre:border
prose-pre:border-stone-200
prose-pre:bg-stone-200
```

After:

```
prose-stone
prose-p:text-dawn-800
prose-headings:text-dawn-800
prose-headings:tracking-tight
prose-a:text-terracotta-600
prose-a:decoration-terracotta-600/40
prose-a:underline-offset-4
prose-blockquote:border-dawn-300
prose-blockquote:text-dawn-700
prose-code:text-dawn-800
prose-pre:border
prose-pre:border-dawn-300
prose-pre:bg-dawn-200
```

The `prose-headings:tracking-tight` utility already exists on these pages; it stays. The key additions are `prose-p:text-dawn-800`, `prose-headings:text-dawn-800`, `prose-a:text-terracotta-600`, `prose-a:decoration-terracotta-600/40`. The `prose-stone` base stays so that `prose-strong`, `prose-em`, `prose-li`, `prose-hr`, `prose-thead` still get sane defaults; those defaults are stone-900 which is visually indistinguishable from dawn-800 on inline elements.

#### About pages (`src/pages/about.astro`, `src/pages/en/about.astro`)

Current: `prose prose-stone max-w-none` + dark overrides only. No light-mode overrides.

After: same additions as the post-detail pages above — `prose-p:text-dawn-800`, `prose-headings:text-dawn-800`, `prose-a:text-terracotta-600`, `prose-a:decoration-terracotta-600/40`, plus `prose-blockquote:border-dawn-300`, `prose-blockquote:text-dawn-700`, `prose-code:text-dawn-800`, `prose-pre:border-dawn-300`, `prose-pre:bg-dawn-200` for consistency (even though about pages rarely use blockquotes/code blocks, keeping the palette complete avoids surprise).

### PostSummary left border

`src/components/PostSummary.astro` currently uses `border-stone-400` for the left rail in light mode. The mapping table sends `border-stone-400 → border-dawn-600` (cool-tint zone), which matches our chosen visibility notch. The change is applied as part of the bulk sed pass — no standalone commit.

### Testing

Expand `tests/theme-typography.test.mjs` with:

- **Dawn tokens** — assert the 11 `--color-dawn-<shade>: <hex>` declarations and the single `--color-terracotta-600: #a04e2a` in `global.css`.
- **Theme transition rule** — assert the `.theme-transition` selector block exists with the expected five transition properties.
- **Layout html/body** — assert the new `bg-dawn-100 text-dawn-800 dark:bg-night-800 dark:text-night-100` classes on both tags.
- **Toggle script** — assert that both the manual click handler and the system-preference handler in Layout.astro call `root.classList.add("theme-transition")` before `applyTheme` and schedule a `root.classList.remove("theme-transition")`. Matched via string search in the source, not runtime execution.
- **No residual light-mode `*-stone-*`** — scan every `.astro`/`.ts`/`.mjs` under `src/` for light-mode stone utilities (i.e., any `stone-<N>` pattern that is NOT preceded by `dark:`). The only allowed stone reference in source is inside the `prose-stone` base class (which stays).

Existing "no residual `dark:*-stone-*`" test stays green because the dark palette is untouched.

### Documentation

- **Update `docs/spec-theme-typography.md`**:
  - Add a "Dawn Palette" section paralleling the Night Palette section, documenting the 11 shades and their primary roles.
  - Add a "Terracotta Accent" note explaining the single-token palette extension and its use (link color in prose).
  - Add a "Theme Transition" section documenting the `.theme-transition` class pattern, the 250ms duration, and the instant-at-load / instant-on-hover / animated-on-toggle contract.
  - Update the **Guardrails** list: add "Do not extend `terracotta` beyond the `-600` shade unless a new accent role requires it" and "Do not apply `.theme-transition` globally — it exists only as a toggle-scoped class."
- **Update `docs/spec-roadmap.md`**:
  - Append a Current State bullet: "Light-mode custom `dawn` palette + `terracotta-600` accent + smooth theme-toggle transition landed. Body ink now bridges with dark mode via the shared hex `#24283b` (`dawn-800` / `night-800`)."

### `/theme-preview` cleanup

Final commit of the iteration deletes `src/pages/theme-preview.astro`. No other file references the page; nothing else needs updating.

## Verification Target

- `npm run astro -- check` passes with no new errors.
- `npm test` — all expanded `tests/theme-typography.test.mjs` assertions plus existing suite pass.
- `npm run dev` + `npm run preview`:
  - Light mode renders on `#f5f3ee` body with `#24283b` primary text. Tag pills sit on `#e8e3d9`. Borders on `#dcd6cc`. Prose body text is cool-tinted. Post-body links render in terracotta.
  - Dark mode unchanged from current state.
  - Theme toggle click produces a visible 0.25s color fade rather than an instant flip. Initial page load has no flash.
  - System-preference change (toggling OS dark mode while site is open with no stored preference) also triggers the fade.
- `/theme-preview` returns 404 in the built output.

## Commit Sequence

1. `feat: add dawn palette and terracotta accent tokens to @theme`
2. `feat: apply theme-transition class for smooth theme fade`
3. `feat: wire dawn palette into html and body`
4. `refactor: map light-mode stone utilities to dawn across codebase` — bulk sed covers every file including `PostSummary.astro` left-border shift
5. `refactor: apply H2 prose overrides with terracotta link color`
6. `test: update theme-typography tests for dawn palette and transition`
7. `docs: document dawn palette, terracotta accent, and theme transition`
8. `chore: remove /theme-preview utility page`

## Alternatives Considered

- **Keep Tailwind stone and only add a `terracotta-600` accent.** Rejected: leaves the core naming/identity asymmetry between the two modes unaddressed. The `dawn-800` / `night-800` bridge is the heart of the H2 design.
- **Define `dawn` as a pure warm-paper scale and use `night` directly for cool-ink text tokens in light mode.** Rejected: works mathematically but creates confusing cross-palette usage in components (e.g., `bg-dawn-100 text-night-800`). Keeping everything under one `dawn` name in light-mode code reads more cleanly. Note: `dawn-700` and `dawn-800` happen to match `night-500` and `night-800` by hex, but `dawn-600` is its own value (#565f89) and does not match the current `night-400` (#8891b8), which was lightened earlier for AA on the dark body.
- **Full terracotta scale (50–950) instead of a single `terracotta-600`.** Rejected as premature. One shade covers the only accent role (link color) in the H2 design. A full scale can be added when a second terracotta role appears.
- **Animate the theme toggle via the `view-transition-api` instead of a `.theme-transition` class.** Rejected: the view-transition API gives cross-fade of whole page snapshots, which is heavier and browser-support-limited for this single-property case. A targeted CSS transition class is cheaper, more portable, and limits the effect to the color properties we actually want to fade.
- **Swap the Shiki light theme to one that matches the dawn palette (e.g., Solarized Light or Rose Pine Dawn).** Deferred, not rejected. `github-light` on a dawn bg creates a minor color mismatch in code-block backgrounds. The gap is small enough that it can be addressed in a follow-up iteration when the overall H2 feel has had time to settle.
- **Drop the `prose-stone` base class entirely and define a custom `prose-dawn` via a typography plugin config.** Rejected: Tailwind typography's custom color config needs a JS/TS plugin config path that is not currently wired up in the project (the project is fully on CSS-based Tailwind 4 `@theme`). Overriding specific prose utilities achieves the same result without requiring a plugin reshape.
