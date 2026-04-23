# H2 Dawn Palette + Theme Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the custom `dawn` light-mode palette + `terracotta-600` link accent, wire them into the Layout and across every light-mode `*-stone-*` utility in the source tree, apply the H2 prose overrides on post-detail and about pages, add a 0.25s `.theme-transition` class that fades colors only during a theme toggle, expand the regression tests, update the SSOT, and retire the `/theme-preview` page.

**Architecture:** Define `--color-dawn-50..950` + `--color-terracotta-600` inside the existing `@theme` block in `src/styles/global.css` so Tailwind 4 auto-emits `bg-dawn-*`, `text-dawn-*`, `border-dawn-*`, `text-terracotta-600`, etc. Ship the `.theme-transition` rule in the same CSS file and add class-add/remove logic around the two client-side theme-toggle handlers in `Layout.astro`. Replace every light-mode `*-stone-*` utility with its `*-dawn-*` counterpart via a bulk sed pass across the source tree (dark-prefixed `*-night-*` utilities stay untouched; no `dark:*-stone-*` remains in the codebase from the earlier reading-comfort-polish pass). Rewrite the prose class strings on the two post-detail pages and the two about pages to add `prose-p:text-dawn-800`, `prose-headings:text-dawn-800`, and the terracotta link utilities. Expand `tests/theme-typography.test.mjs` to cover the new tokens, the transition rule, the html/body classes, the toggle-script class logic, and the absence of residual light-mode stone. Delete the `/theme-preview` page in the final cleanup commit.

**Tech Stack:** Tailwind 4 (CSS-based `@theme`), Astro 6, vanilla JS theme-toggle scripts, `node --test` with `@astrojs/compiler` + `experimental_AstroContainer`, macOS `sed -i ''` for the bulk remap.

**Reference Spec:** `docs/superpowers/specs/2026-04-24-h2-dawn-palette-design.md`.

---

## File Structure

### Create

No new source files in this iteration. A new commit of existing content only.

### Modify

- `src/styles/global.css` — append dawn + terracotta tokens inside the existing `@theme` block; append `.theme-transition` selector rule at file end.
- `src/layouts/Layout.astro` — rewrite the `<html>` and `<body>` class strings (stone → dawn); update both theme-toggle scripts (manual click + system-preference change) to add `theme-transition` class before `applyTheme()` and remove it via a 300ms `setTimeout`.
- Every `.astro` / `.ts` / `.mjs` file under `src/` that currently uses a light-mode `*-stone-*` utility — migrated via bulk sed.
- `src/pages/posts/[...slug].astro`, `src/pages/en/posts/[...slug].astro` — after bulk remap, rewrite the prose class string so the link color becomes `terracotta-600` (replacing the auto-converted `dawn-800`) and add the new `prose-p:text-dawn-800` / `prose-headings:text-dawn-800` utilities.
- `src/pages/about.astro`, `src/pages/en/about.astro` — add the full set of light-mode prose overrides (none existed before; bulk sed leaves these files alone in the prose region).
- `src/components/PostSummary.astro` — the bulk sed converts `border-stone-400` to `border-dawn-600`; no additional file-specific edit needed.
- `tests/theme-typography.test.mjs` — extend assertions for dawn tokens, terracotta accent, `.theme-transition` rule, Layout html/body classes, toggle-script class logic, and light-mode stone-residue scan.
- `docs/spec-theme-typography.md` — add Dawn Palette / Terracotta Accent / Theme Transition sections.
- `docs/spec-roadmap.md` — append a Current State bullet for the landed palette + transition.

### Delete

- `src/pages/theme-preview.astro` — the palette-selection utility page.

---

## Tasks

### Task 1: Add `dawn` palette + `terracotta-600` accent tokens to `@theme`

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Update the `@theme` block**

Open `src/styles/global.css`. Find the existing `@theme` block — it currently holds `--font-sans` and the eleven `--color-night-*` tokens. Immediately before the closing `}` of that block, append these twelve new tokens (no blank line between existing and new, keep them together as one palette declaration):

```css
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
```

- [ ] **Step 2: Verify Astro builds the stylesheet**

Run: `npm run astro -- check`
Expected: no new errors. Pre-existing warnings in unrelated files are fine to report but not fix.

- [ ] **Step 3: Verify Tailwind emits the utilities**

Run: `npm run build`
Expected: build completes successfully. The Tailwind compile step picks up the new tokens and can emit `bg-dawn-*`, `text-dawn-*`, `border-dawn-*`, `text-terracotta-600` utilities for later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "$(cat <<'EOF'
feat: add dawn palette and terracotta accent tokens to @theme

Adds an 11-shade dawn palette (warm paper tones sliding into cool
ink) plus a standalone terracotta-600 accent to the Tailwind 4
@theme block so the forthcoming light-mode migration can consume
bg-dawn-*, text-dawn-*, border-dawn-*, text-terracotta-600 etc.
utilities. dawn-800 reuses the hex #24283b that is also night-800,
creating the single-hue bridge between light and dark modes that
the H2 design calls for.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Ship `.theme-transition` class and wire it into both theme-toggle handlers

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Append the transition rule to `global.css`**

At the very end of `src/styles/global.css`, after all existing rules, append:

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

- [ ] **Step 2: Update the manual click handler in `Layout.astro`**

Open `src/layouts/Layout.astro`. Find the `document.addEventListener("click", (event) => { ... });` block inside the second `<script is:inline>` (the body-level theme-toggle script, not the `<head>` FOUC-prevention script). Locate the lines:

```js
			const nextTheme = root.classList.contains("dark") ? "light" : "dark";
			applyTheme(nextTheme);

			try {
				localStorage.setItem(storageKey, nextTheme);
			} catch {}
```

Replace that snippet with:

```js
			const nextTheme = root.classList.contains("dark") ? "light" : "dark";

			root.classList.add("theme-transition");
			applyTheme(nextTheme);
			setTimeout(() => root.classList.remove("theme-transition"), 300);

			try {
				localStorage.setItem(storageKey, nextTheme);
			} catch {}
```

- [ ] **Step 3: Update the system-preference change handler in `Layout.astro`**

In the same `<script is:inline>` block, find:

```js
		const handlePreferenceChange = (event) => {
			try {
				if (localStorage.getItem(storageKey)) return;
			} catch {}

			applyTheme(event.matches ? "dark" : "light");
		};
```

Replace with:

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

Do NOT touch the initial `applyTheme(getPreferredTheme())` call that runs at page-load time — it should remain transition-free to avoid a flash on first render.

- [ ] **Step 4: Verify builds**

Run: `npm run astro -- check && npm run build`
Expected: both pass. No runtime behavior change yet since nothing consumes the `.theme-transition` class aside from the new CSS rule.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/layouts/Layout.astro
git commit -m "$(cat <<'EOF'
feat: apply theme-transition class for smooth theme fade

Adds a scoped .theme-transition CSS rule that applies a 250ms color
fade to every element, and wires the two client-side theme-toggle
handlers (manual click + system-preference change) to add the class
on <html> before calling applyTheme() and remove it 300ms later via
setTimeout. The initial applyTheme(getPreferredTheme()) call at page
load is deliberately left untouched so first render stays instant
and never flashes. Hover and focus state changes also stay instant
because the class is absent outside the toggle window.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Wire the dawn palette into the `<html>` and `<body>` classes

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Update the `<html>` class**

In `src/layouts/Layout.astro`, find the `<html>` opening tag:

```astro
<html lang={lang} class="bg-stone-100 text-stone-900 dark:bg-night-800 dark:text-night-100">
```

Replace with:

```astro
<html lang={lang} class="bg-dawn-100 text-dawn-800 dark:bg-night-800 dark:text-night-100">
```

- [ ] **Step 2: Update the `<body>` class**

A few lines below, find the `<body>` tag (it sits after the `<head>` block and the initial theme `<script is:inline>`):

```astro
		<body
			data-pagefind-filter={`language:${lang}`}
			class="flex min-h-screen flex-col bg-stone-100 text-stone-900 antialiased dark:bg-night-800 dark:text-night-100"
		>
```

Replace with:

```astro
		<body
			data-pagefind-filter={`language:${lang}`}
			class="flex min-h-screen flex-col bg-dawn-100 text-dawn-800 antialiased dark:bg-night-800 dark:text-night-100"
		>
```

- [ ] **Step 3: Build and smoke-check**

Run: `npm run build`
Expected: build succeeds. Even with the rest of the codebase still on stone utilities, this change only affects the root html/body; nested components will temporarily sit on their still-stone surfaces against the new dawn body. The intermediate state is expected — Task 4 brings the rest of the tree over.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "$(cat <<'EOF'
feat: wire dawn palette into html and body

Shifts the <html> and <body> background and text color utilities
from the Tailwind stone family to the new custom dawn palette.
bg-stone-100 -> bg-dawn-100 keeps the body almost identical in
hue (tiny warmer shift toward ivory), while text-stone-900 ->
text-dawn-800 replaces the slightly warm near-black with the
cool-tinted near-black that is also the dark-mode body bg.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Map every light-mode `*-stone-*` utility across the codebase to `*-dawn-*`

**Files:**
- Modify: every `.astro` / `.ts` / `.mjs` file under `src/` that currently contains a light-mode `*-stone-*` utility.

This is a single bulk sed pass covering 29 distinct stone patterns. The `prose-stone` base class (no `-<N>` suffix) is not matched by any rule, so it stays untouched in the four prose-consuming pages. No `dark:*-stone-*` utilities exist anywhere under `src/` after the earlier reading-comfort-polish iteration, so no dark-prefix mask is required.

- [ ] **Step 1: Enumerate the files that will be touched**

Run:

```bash
grep -rl "stone-" src --include="*.astro" --include="*.ts" --include="*.mjs"
```

Expected: a non-empty list. Record the count — the verification step at the bottom of this task checks that the suffixed `stone-N` references are gone afterward and only unsuffixed `prose-stone` remains.

- [ ] **Step 2: Run the bulk sed pass**

This repo is on macOS, which requires `sed -i ''` (empty string after `-i`). Order matters: more specific `prose-*:` / `hover:` / `focus:` / `focus-visible:` / `group-hover:` patterns run before generic ones so the shorter patterns do not clobber the longer ones. Within each prefix, longer-tail `stone-NNN` (e.g., `stone-950`) must precede shorter-tail (e.g., `stone-950 → stone-50` is fine, `stone-50` only runs after `stone-900/950` have already been rewritten).

```bash
grep -rl "stone-" src --include="*.astro" --include="*.ts" --include="*.mjs" \
  | xargs sed -i '' \
    -e 's|prose-pre:bg-stone-200|prose-pre:bg-dawn-200|g' \
    -e 's|prose-pre:border-stone-200|prose-pre:border-dawn-300|g' \
    -e 's|prose-blockquote:border-stone-200|prose-blockquote:border-dawn-300|g' \
    -e 's|prose-blockquote:text-stone-600|prose-blockquote:text-dawn-700|g' \
    -e 's|prose-code:text-stone-900|prose-code:text-dawn-800|g' \
    -e 's|prose-a:text-stone-900|prose-a:text-dawn-800|g' \
    -e 's|prose-a:decoration-stone-300|prose-a:decoration-dawn-300|g' \
    -e 's|group-hover:text-stone-700|group-hover:text-dawn-700|g' \
    -e 's|focus-visible:ring-offset-stone-100|focus-visible:ring-offset-dawn-100|g' \
    -e 's|focus-visible:ring-stone-300|focus-visible:ring-dawn-300|g' \
    -e 's|focus:border-stone-300|focus:border-dawn-300|g' \
    -e 's|hover:bg-stone-300|hover:bg-dawn-300|g' \
    -e 's|hover:border-stone-300|hover:border-dawn-300|g' \
    -e 's|hover:text-stone-950|hover:text-dawn-800|g' \
    -e 's|hover:text-stone-700|hover:text-dawn-700|g' \
    -e 's|text-stone-950|text-dawn-800|g' \
    -e 's|text-stone-900|text-dawn-800|g' \
    -e 's|text-stone-700|text-dawn-700|g' \
    -e 's|text-stone-600|text-dawn-700|g' \
    -e 's|text-stone-500|text-dawn-600|g' \
    -e 's|text-stone-400|text-dawn-600|g' \
    -e 's|text-stone-50|text-dawn-50|g' \
    -e 's|bg-stone-900|bg-dawn-800|g' \
    -e 's|bg-stone-200|bg-dawn-200|g' \
    -e 's|bg-stone-100|bg-dawn-100|g' \
    -e 's|border-stone-400|border-dawn-600|g' \
    -e 's|border-stone-200|border-dawn-300|g' \
    -e 's|divide-stone-200|divide-dawn-300|g' \
    -e 's|ring-stone-200|ring-dawn-300|g'
```

- [ ] **Step 3: Verify no light-mode suffixed stone pattern remains**

Run:

```bash
grep -rn "\bstone-[0-9]" src --include="*.astro" --include="*.ts" --include="*.mjs"
```

Expected: no output. `prose-stone` is the base class without a numeric suffix, so it does not match `stone-[0-9]` and correctly stays in the four prose files.

- [ ] **Step 4: Verify `prose-stone` still survives in the four expected files**

Run:

```bash
grep -rn "prose-stone" src --include="*.astro"
```

Expected: four matches — two post-detail pages (`src/pages/posts/[...slug].astro`, `src/pages/en/posts/[...slug].astro`) and two about pages (`src/pages/about.astro`, `src/pages/en/about.astro`). These files still carry the `prose-stone` base class; Task 5 will layer the H2-specific prose overrides on top.

- [ ] **Step 5: Build and run the test suite**

Run: `npm run astro -- check && npm test`
Expected: astro check surfaces no new errors; `npm test` stays green on the existing suite. Component-level tests that have class-string assertions on the updated files will be the canary — if any hard-code an old stone utility they will fail here and need updating as part of this task. (Current suite inspection found none that hard-code light-mode stone-N utilities; if a failure appears, follow the assertion to the expected new dawn token.)

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "$(cat <<'EOF'
refactor: map light-mode stone utilities to dawn across codebase

Bulk-rewrites every light-mode *-stone-* utility across src/ to the
matching *-dawn-* utility per the design spec's mapping table. The
prose-stone base class (without a numeric suffix) stays in the four
prose-consuming pages; the H2 prose overrides come in the next
commit. No dark:*-night-* utilities change. The body/html update
from the previous commit is now visually complete because every
nested surface lives in the dawn palette as well.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Apply H2 prose overrides with the terracotta link color

**Files:**
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/pages/en/posts/[...slug].astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/en/about.astro`

After Task 4, the post-detail pages have `prose-a:text-dawn-800` (auto-converted from the old `prose-a:text-stone-900`). This task replaces that with `prose-a:text-terracotta-600` and adds the new `prose-p:text-dawn-800` / `prose-headings:text-dawn-800` utilities. The about pages received no changes from Task 4 in the prose region because they never had explicit light-mode overrides — this task adds the full light override set there.

- [ ] **Step 1: Update `src/pages/posts/[...slug].astro`**

Find the `<div>` that wraps `<Content />` with the long prose class string. The current class attribute (after Task 4) reads:

```
class="prose prose-stone mt-10 max-w-none prose-headings:tracking-tight prose-a:text-dawn-800 prose-a:decoration-dawn-300 prose-a:underline-offset-4 prose-blockquote:border-dawn-300 prose-blockquote:text-dawn-700 prose-code:text-dawn-800 prose-pre:border prose-pre:border-dawn-300 prose-pre:bg-dawn-200 dark:prose-invert dark:prose-a:text-night-100 dark:prose-a:decoration-night-400 dark:prose-blockquote:border-night-500 dark:prose-blockquote:text-night-200 dark:prose-code:text-night-100 dark:prose-pre:border-night-500 dark:prose-pre:bg-night-900"
```

Replace the entire class attribute with:

```
class="prose prose-stone mt-10 max-w-none prose-p:text-dawn-800 prose-headings:text-dawn-800 prose-headings:tracking-tight prose-a:text-terracotta-600 prose-a:decoration-terracotta-600/40 prose-a:underline-offset-4 prose-blockquote:border-dawn-300 prose-blockquote:text-dawn-700 prose-code:text-dawn-800 prose-pre:border prose-pre:border-dawn-300 prose-pre:bg-dawn-200 dark:prose-invert dark:prose-a:text-night-100 dark:prose-a:decoration-night-400 dark:prose-blockquote:border-night-500 dark:prose-blockquote:text-night-200 dark:prose-code:text-night-100 dark:prose-pre:border-night-500 dark:prose-pre:bg-night-900"
```

The two differences from the post-Task-4 string: (a) `prose-a:text-dawn-800` → `prose-a:text-terracotta-600` and `prose-a:decoration-dawn-300` → `prose-a:decoration-terracotta-600/40`; (b) new utilities `prose-p:text-dawn-800 prose-headings:text-dawn-800` inserted immediately after `max-w-none`.

- [ ] **Step 2: Update `src/pages/en/posts/[...slug].astro`**

Same exact replacement as Step 1 — the English post-detail page has an identical prose class string, and the new one is also identical.

- [ ] **Step 3: Update `src/pages/about.astro`**

Find the `<article>` that wraps `<Content />`. Its current class attribute reads:

```
class="prose prose-stone max-w-none dark:prose-invert dark:prose-a:text-night-100 dark:prose-a:decoration-night-400 dark:prose-blockquote:border-night-500 dark:prose-blockquote:text-night-200 dark:prose-code:text-night-100 dark:prose-pre:border-night-500 dark:prose-pre:bg-night-900"
```

Replace with:

```
class="prose prose-stone max-w-none prose-p:text-dawn-800 prose-headings:text-dawn-800 prose-a:text-terracotta-600 prose-a:decoration-terracotta-600/40 prose-a:underline-offset-4 prose-blockquote:border-dawn-300 prose-blockquote:text-dawn-700 prose-code:text-dawn-800 prose-pre:border prose-pre:border-dawn-300 prose-pre:bg-dawn-200 dark:prose-invert dark:prose-a:text-night-100 dark:prose-a:decoration-night-400 dark:prose-blockquote:border-night-500 dark:prose-blockquote:text-night-200 dark:prose-code:text-night-100 dark:prose-pre:border-night-500 dark:prose-pre:bg-night-900"
```

- [ ] **Step 4: Update `src/pages/en/about.astro`**

Same replacement as Step 3 — English about has the same class string.

- [ ] **Step 5: Build and run the test suite**

Run: `npm run astro -- check && npm test`
Expected: green. Prose utilities apply via the Typography plugin; the new `prose-headings:text-dawn-800` / `prose-p:text-dawn-800` / `prose-a:text-terracotta-600` / `prose-a:decoration-terracotta-600/40` are all valid variants on their respective color tokens, which now exist because Task 1 declared them.

- [ ] **Step 6: Commit**

```bash
git add src/pages/posts/\[...slug\].astro src/pages/en/posts/\[...slug\].astro src/pages/about.astro src/pages/en/about.astro
git commit -m "$(cat <<'EOF'
refactor: apply H2 prose overrides with terracotta link color

Rewrites the prose class strings on the four prose-consuming pages
(post detail KO/EN and about KO/EN) so body paragraphs and headings
pick up the cool-ink dawn-800 color via prose-p:text-dawn-800 and
prose-headings:text-dawn-800, and links render in terracotta-600
with a 40% underline decoration. The prose-stone base class stays
for prose-strong / prose-em / prose-li defaults that collapse into
dawn-800 at inline-element scale. Completes the visible H2 light
palette by shifting the post body to the cool-tinted ink the
design spec calls for.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Extend `tests/theme-typography.test.mjs` with dawn + transition coverage

**Files:**
- Modify: `tests/theme-typography.test.mjs`

- [ ] **Step 1: Read the existing file to know the structure**

The existing test file starts with imports and a `collectSourceFiles` helper, then has tests for font-face, @theme night tokens, dark figure rules, Layout preload/body classes, and two whole-tree stone-residue scans. The new tests fit alongside these. Do not remove any existing tests.

- [ ] **Step 2: Add the dawn token and terracotta assertion after the existing night-token test**

In `tests/theme-typography.test.mjs`, find the test block titled:

```js
test("global.css @theme block declares font-sans and the eleven night tokens", async () => {
```

Immediately after that test's closing `});`, insert this new test:

```js
test("global.css @theme block declares the eleven dawn tokens and the terracotta accent", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /--color-dawn-50:\s*#faf8f2/i);
	assert.match(css, /--color-dawn-100:\s*#f5f3ee/i);
	assert.match(css, /--color-dawn-200:\s*#e8e3d9/i);
	assert.match(css, /--color-dawn-300:\s*#dcd6cc/i);
	assert.match(css, /--color-dawn-400:\s*#b8aea1/i);
	assert.match(css, /--color-dawn-500:\s*#7c8196/i);
	assert.match(css, /--color-dawn-600:\s*#565f89/i);
	assert.match(css, /--color-dawn-700:\s*#414868/i);
	assert.match(css, /--color-dawn-800:\s*#24283b/i);
	assert.match(css, /--color-dawn-900:\s*#1a1d2c/i);
	assert.match(css, /--color-dawn-950:\s*#10121b/i);
	assert.match(css, /--color-terracotta-600:\s*#a04e2a/i);
});
```

- [ ] **Step 3: Add the `.theme-transition` rule assertion**

After the dawn-tokens test closing `});`, insert:

```js
test("global.css declares the theme-transition rule with the expected properties", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /html\.theme-transition,\s*\n\s*html\.theme-transition \*/);
	assert.match(css, /background-color\s+250ms\s+ease/);
	assert.match(css, /color\s+250ms\s+ease/);
	assert.match(css, /border-color\s+250ms\s+ease/);
	assert.match(css, /fill\s+250ms\s+ease/);
	assert.match(css, /stroke\s+250ms\s+ease/);
});
```

- [ ] **Step 4: Replace the existing Layout html/body class assertion**

Find this test:

```js
test("Layout.astro preloads the Pretendard font and uses the new palette + sans stack", async () => {
```

Inside its body, the assertions include these two lines that reference the current stone classes:

```js
	assert.match(layout, /<html [^>]*class="bg-stone-100 text-stone-900 dark:bg-night-800 dark:text-night-100"/);
	assert.match(layout, /<body[\s\S]*?class="[^"]*bg-stone-100[^"]*dark:bg-night-800[^"]*"/);
```

Replace those two lines with:

```js
	assert.match(layout, /<html [^>]*class="bg-dawn-100 text-dawn-800 dark:bg-night-800 dark:text-night-100"/);
	assert.match(layout, /<body[\s\S]*?class="[^"]*bg-dawn-100[^"]*text-dawn-800[^"]*dark:bg-night-800[^"]*"/);
```

Leave the preload and `font-serif` absence assertions intact.

- [ ] **Step 5: Add the toggle-script assertion**

After the Layout html/body test closing `});`, insert:

```js
test("Layout.astro theme toggle handlers add and remove the theme-transition class around applyTheme", async () => {
	const layout = await readFile(layoutUrl, "utf8");
	assert.ok(
		/root\.classList\.add\("theme-transition"\);\s*\n\s*applyTheme\(nextTheme\);\s*\n\s*setTimeout\(\(\) => root\.classList\.remove\("theme-transition"\), 300\);/.test(layout),
		"manual click handler should add theme-transition before applyTheme and remove it after 300ms",
	);
	assert.ok(
		/root\.classList\.add\("theme-transition"\);\s*\n\s*applyTheme\(event\.matches \? "dark" : "light"\);\s*\n\s*setTimeout\(\(\) => root\.classList\.remove\("theme-transition"\), 300\);/.test(layout),
		"system-preference handler should add theme-transition before applyTheme and remove it after 300ms",
	);
});
```

- [ ] **Step 6: Update the residue-scan test so it catches light-mode stone utilities**

Find the existing test:

```js
test("no light-mode bg-stone-50 or panel-level bg-stone-100 / border-stone-100 remains", async () => {
```

Replace the entire test block (from `test(` through `});`) with:

```js
test("no light-mode *-stone-* utility remains anywhere under src/", async () => {
	const files = await collectSourceFiles(srcUrl);
	const offenders = [];
	for (const fileUrl of files) {
		const text = await readFile(fileUrl, "utf8");
		const matches = text.match(/(?<!["'`])(?<!-)\bstone-[0-9]+/g);
		if (matches) {
			offenders.push({ file: fileUrl.pathname, matches: Array.from(new Set(matches)) });
		}
	}
	assert.deepEqual(offenders, [], `residual light-mode stone tokens:\n${JSON.stringify(offenders, null, 2)}`);
});
```

The regex matches any `stone-<digits>` that is not preceded by a hyphen — this deliberately skips `prose-stone` (the `-stone` part is followed by nothing, so no digit match anyway, but the lookbehind also guards against hypothetical `custom-stone-50` utilities).

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: all existing + new assertions pass. The full suite should grow by 3 tests (dawn tokens, theme-transition rule, toggle handlers) plus 1 modified test (residue scan, still reports a single pass).

- [ ] **Step 8: Commit**

```bash
git add tests/theme-typography.test.mjs
git commit -m "$(cat <<'EOF'
test: update theme-typography tests for dawn palette and transition

Adds three new source-level assertions (dawn + terracotta tokens in
@theme, .theme-transition rule in global.css, theme-transition class
add/remove in Layout toggle handlers), swaps the existing Layout
html/body class assertion from bg-stone-100 to bg-dawn-100, and
broadens the stone-residue scan so any light-mode stone-N utility
anywhere under src/ fails the test. prose-stone (no numeric suffix)
is still allowed and continues to appear in the four prose files.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Document the dawn palette, terracotta accent, and theme transition

**Files:**
- Modify: `docs/spec-theme-typography.md`
- Modify: `docs/spec-roadmap.md`

Two separate commits.

---

#### Sub-task 7a: Update `docs/spec-theme-typography.md`

- [ ] **Step 1: Replace the Light Palette section**

Open `docs/spec-theme-typography.md`. Find the `- **Light Palette**:` bullet block. It currently describes the Tailwind stone baseline. Replace that entire bullet (from `- **Light Palette**:` through its last sub-bullet) with:

```markdown
- **Light Palette**: custom `dawn` family declared in `src/styles/global.css` via `@theme`. Warm paper tones at the light end slide into cool ink at the dark end, so the body feels like ivory paper while the text reads as a muted blue-gray near-black.
  - Primary body bg: `dawn-100` (#f5f3ee). Warmer than pure white; pairs with Pretendard Korean glyphs like old essay-collection paper.
  - Secondary surfaces (tag pills, code blocks, figure panels): `dawn-200` (#e8e3d9).
  - Hover bg for interactive surfaces: `dawn-300` (#dcd6cc).
  - Border and hairline: `dawn-300` (#dcd6cc).
  - Text: `dawn-800` (#24283b) primary, `dawn-700` (#414868) secondary, `dawn-600` (#565f89) muted. `dawn-800` is the same hex as `night-800`, creating a single-hue bridge that ties light and dark modes together — the color that is the dark body bg is reused here as the body text ink. `dawn-600` gives muted small text ~7.4:1 on `dawn-100` (clears WCAG AA).
  - Focus ring: `dawn-300` (#dcd6cc), ring offset: `dawn-100` (#f5f3ee).
  - Inverted highlight (active tag-filter bg): `dawn-800` bg with `dawn-50` text.
- **Accent**:
  - Link color: `terracotta-600` (#a04e2a). Single-shade custom token. Deeper cousin of Tokyo Night's syntax-orange (`#ff9e64`), warm-on-warm against the `dawn-100` body, reads visibly as "link" without pulling the page toward a generic web-blue hyperlink.
  - Applied only to `prose-a` utilities (post body links and about-page links). UI affordances such as category badges, tag pills, and navigation items keep the stone/dawn-neutral treatment they had.
  - Link underline uses `terracotta-600/40` (40% alpha) to stay quiet in the reading rhythm.
```

- [ ] **Step 2: Replace the Dark Palette body-bg reference to mention the bridge**

In the same file, find the `- **Dark Palette**:` bullet block. Inside it, locate the sub-bullet describing `night-800`:

```markdown
  - Primary body bg: `night-800` (#24283b). `night-800` is the lightest "dark" tone in the family; Storm uses it as the main writing surface.
```

Replace with:

```markdown
  - Primary body bg: `night-800` (#24283b). `night-800` is the lightest "dark" tone in the family; Storm uses it as the main writing surface. The same hex also serves as `dawn-800` — the primary text color in light mode — creating a single-hue bridge between the two modes (see Light Palette above).
```

- [ ] **Step 3: Append a Theme Transition section**

Find the `- **Guardrails**:` bullet block. Immediately before it, insert this new block:

```markdown
- **Theme Transition**:
  - `src/styles/global.css` declares a scoped `html.theme-transition` rule that applies a 250ms color fade to every element (background-color, color, border-color, fill, stroke).
  - The class is added to `<html>` only by the two theme-toggle handlers in `src/layouts/Layout.astro` (manual click and `prefers-color-scheme` change) immediately before `applyTheme()`, and removed via a 300ms `setTimeout`.
  - Initial page load stays instant: the head-level FOUC-prevention script and the body-level `applyTheme(getPreferredTheme())` both run without adding the class.
  - Hover and focus state changes also stay instant because `.theme-transition` is absent outside the toggle window.
  - The `!important` on the transition declaration ensures the Shiki dark-override rule (which itself uses `!important`) also participates in the fade so code blocks swap themes alongside the page chrome.
```

- [ ] **Step 4: Update the Guardrails block**

Find the `- **Guardrails**:` bullet. Append two new sub-bullets at the end of its existing list:

```markdown
  - Do not extend the `terracotta` scale beyond the single `-600` shade unless a new accent role requires it. One shade covers link color; more shades would invite accent creep.
  - Do not apply the `.theme-transition` class anywhere other than the two theme-toggle handlers. Applying it globally would animate every hover and focus change; applying it at page load would produce a flash on first render.
```

- [ ] **Step 5: Commit 7a**

```bash
git add docs/spec-theme-typography.md
git commit -m "$(cat <<'EOF'
docs: document dawn palette, terracotta accent, and theme transition

Replaces the old Light Palette bullet (which described the Tailwind
stone baseline) with the new custom dawn palette + the single-shade
terracotta-600 link accent, cross-references the shared-hex bridge
between dawn-800 and night-800 from the Dark Palette section, adds
a Theme Transition section explaining the .theme-transition class
contract (250ms fade only during toggle; instant on page load and
hover), and extends the Guardrails list with two rules: terracotta
stays single-shade, and .theme-transition stays toggle-scoped.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

#### Sub-task 7b: Update `docs/spec-roadmap.md`

- [ ] **Step 1: Append the landed bullet to `## Current State`**

Find the `## Current State` bullet list at the top of `docs/spec-roadmap.md`. Append this new bullet at the end of the list (after the most recent prior bullet):

```markdown
- Light-mode custom `dawn` palette + `terracotta-600` link accent + smooth theme-toggle transition landed. Body ink now bridges with dark mode via the shared hex `#24283b` (`dawn-800` / `night-800`); `.theme-transition` class produces a 250ms color fade only during toggle. See `docs/spec-theme-typography.md`.
```

- [ ] **Step 2: Commit 7b**

```bash
git add docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record dawn palette and theme transition in roadmap

Notes at the top of the roadmap that the custom dawn light palette,
the terracotta link accent, and the toggle-scoped theme transition
all landed, and cross-references the full contract in the
theme-typography SSOT.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Remove the `/theme-preview` utility page

**Files:**
- Delete: `src/pages/theme-preview.astro`

- [ ] **Step 1: Verify nothing else references the preview page**

Run:

```bash
grep -rn "theme-preview" src docs --include="*.astro" --include="*.ts" --include="*.mjs" --include="*.md"
```

Expected: matches only inside this plan file and the design spec (under `docs/superpowers/`). No component, layout, or live-doc references. If anything else turns up, stop and flag it — the preview page was supposed to be unlinked.

- [ ] **Step 2: Delete the file**

```bash
rm src/pages/theme-preview.astro
```

- [ ] **Step 3: Build and confirm cleanup**

Run: `npm run build`
Expected: build completes. `dist/theme-preview/` no longer appears in output. The full test suite (`npm test`) should also stay green — no test references the preview page.

- [ ] **Step 4: Commit**

```bash
git add -A src/pages
git commit -m "$(cat <<'EOF'
chore: remove /theme-preview utility page

The preview page existed to render side-by-side light-palette
candidates during the H2 selection. With dawn shipped as the
final choice and its tokens living in the @theme block, the
preview page has no further role and its maintenance would
only drift from the real palette.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Checklist (for the executor)

Before declaring the plan complete:

1. `npm run astro -- check` shows no new errors; any residual errors are pre-existing.
2. `npm test` is green with the expanded coverage (existing tests plus three new and one modified).
3. `grep -rn "\\bstone-[0-9]" src --include="*.astro" --include="*.ts" --include="*.mjs"` returns no output. `grep -rn "prose-stone" src --include="*.astro"` returns exactly four matches in the prose-consuming pages.
4. `grep -rn "theme-preview" src` returns no output; `dist/theme-preview/` does not exist after a fresh build.
5. Spot-check `/` and `/en/` in `npm run dev`:
   - Light mode body is the warm ivory `dawn-100` with cool-tinted ink primary text.
   - Post-detail pages show post body paragraphs/headings in cool ink and links in terracotta.
   - About pages pick up the same prose treatment.
   - Theme toggle click produces a 0.25s smooth color fade, not an instant flip.
   - Initial page load under both modes is instant — no flash.
6. Re-read `docs/spec-theme-typography.md` and `docs/spec-roadmap.md`; both describe what actually shipped.
