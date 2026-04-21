# Reading Comfort Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the reading-comfort polish iteration — light-mode body shifts from `stone-50` to `stone-100`, dark-mode swaps from stone to a Tokyo Night Storm-inspired custom `night` palette, and the site's primary typeface becomes self-hosted Pretendard Std Variable (replacing the current `font-serif`).

**Architecture:** Extend `src/styles/global.css` with an `@font-face` for Pretendard Std Variable and an `@theme` block declaring `--font-sans` plus eleven `--color-night-*` tokens so Tailwind 4 auto-generates `bg-night-*`, `text-night-*`, `border-night-*`, etc. utilities. Preload the font in `Layout.astro` and swap the html/body classes off `stone-50`/`stone-950` and off `font-serif`. Shift the light palette one step on matching tokens (`bg-stone-50 → bg-stone-100`, plus panel side effects `bg-stone-100 → bg-stone-200` and `border-stone-100 → border-stone-200`). Run a bulk sed-driven remap to rewrite every `dark:*-stone-*` utility to `dark:*-night-*` per the mapping table, grouped in a single commit. Write a source-level regression test that asserts the key transforms shipped, then document with a new SSOT and roadmap updates.

**Tech Stack:** Tailwind 4 with CSS-based `@theme` configuration, Astro 6 content collections, self-hosted variable woff2 font, macOS-style `sed -i ''` for bulk text replacement, `node --test` with plain `readFile` for source-level regression assertions.

**Reference Spec:** `docs/superpowers/specs/2026-04-21-reading-comfort-polish-design.md`.

---

## File Structure

### Create

- `tests/theme-typography.test.mjs` — source-level regression test that asserts the font-face, `@theme` tokens, preload hint, body class changes, and an empty `dark:*-stone-*` residue after the bulk remap.
- `docs/spec-theme-typography.md` — SSOT documenting the palette, the Storm-as-primary-bg rationale, the Pretendard Std self-host, and the guardrails (no vivid Tokyo Night accents, no extra typefaces).

### Modify

- `src/styles/global.css` — add `@font-face` block for Pretendard Std Variable, add `@theme` block with `--font-sans` override and eleven `--color-night-*` tokens, update two `:where(.dark)` figure rules to reference night colors via `rgb()` literals.
- `src/layouts/Layout.astro` — add `<link rel="preload">` for the font in `<head>`; change the `<html>` and `<body>` class strings so `bg-stone-50 → bg-stone-100`, `dark:bg-stone-950 → dark:bg-night-800`, and remove the `font-serif` token from the body class.
- Light-palette side effects in the tag pill / filter toggle / prose code block surfaces (bulk sed in Task 3 across all matching files).
- Dark-palette remap across every file touching `dark:*-stone-*` (bulk sed in Task 4). The set matches `grep -rl "dark:.*stone-" src --include="*.astro" --include="*.ts" --include="*.mjs"`, which on a clean checkout returns 27 files.
- `docs/spec-layout.md` — body/html classes and the font-face reference.
- `docs/spec-roadmap.md` — append a Current State bullet.

---

## Tasks

### Task 1: Extend `global.css` with `@font-face`, `@theme`, and updated figure dark rules

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Replace the entire contents of `src/styles/global.css`**

Overwrite `src/styles/global.css` with:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@plugin "@tailwindcss/typography";

@font-face {
	font-family: "Pretendard Std Variable";
	src: url("/fonts/PretendardStdVariable.woff2") format("woff2-variations");
	font-weight: 100 900;
	font-style: normal;
	font-display: swap;
}

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

.prose figure {
	margin-top: 1.5rem;
	margin-bottom: 1.5rem;
}
.prose figure img {
	margin: 0;
	border-radius: 0.375rem;
	border: 1px solid rgb(231 229 228 / 1); /* stone-200 */
}
:where(.dark) .prose figure img {
	border-color: rgb(59 66 97 / 1); /* night-600 */
}
.prose figcaption {
	margin-top: 0.75rem;
	font-size: 0.875rem;
	font-style: italic;
	text-align: center;
	color: rgb(120 113 108 / 1); /* stone-500 */
}
:where(.dark) .prose figcaption {
	color: rgb(115 122 162 / 1); /* night-300 */
}
@media (min-width: 768px) {
	.prose figure[data-width="wide"] {
		margin-left: -4rem;
		margin-right: -4rem;
	}
}
```

The two `:where(.dark)` rules are updated so the figure border reads as `night-600` (#3b4261) and the figcaption text as `night-300` (#737aa2) under dark mode — both values match the corresponding entries in the `@theme` block above.

- [ ] **Step 2: Verify Astro builds the stylesheet**

Run: `npm run astro -- check`
Expected: no new errors. Any pre-existing warnings unrelated to this file stay.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "$(cat <<'EOF'
feat: declare night palette, Pretendard font, and updated figure dark rules

Adds @font-face for self-hosted Pretendard Std Variable, an @theme
block exposing --font-sans plus the eleven --color-night-* tokens that
Tailwind 4 needs to emit bg-night-*, text-night-*, border-night-*,
etc. utilities, and updates the two hand-written dark-mode figure
rules so the border and figcaption colors reference night-600 and
night-300 instead of the old stone-800 / stone-400 literals.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update `Layout.astro` with preload hint, new body classes, no `font-serif`

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Add the font preload hint**

Find the existing `<link rel="icon" href="/favicon.ico" />` line in the `<head>` (around line 40). Immediately after it (before the viewport meta line), insert:

```astro
<link rel="preload" href="/fonts/PretendardStdVariable.woff2" as="font" type="font/woff2" crossorigin />
```

- [ ] **Step 2: Update the `<html>` class**

Find the `<html>` tag:

```astro
<html lang={lang} class="bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
```

Replace with:

```astro
<html lang={lang} class="bg-stone-100 text-stone-900 dark:bg-night-800 dark:text-night-100">
```

- [ ] **Step 3: Update the `<body>` class**

Find the `<body>` tag:

```astro
<body
	data-pagefind-filter={`language:${lang}`}
	class="flex min-h-screen flex-col bg-stone-50 font-serif text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100"
>
```

Replace with:

```astro
<body
	data-pagefind-filter={`language:${lang}`}
	class="flex min-h-screen flex-col bg-stone-100 text-stone-900 antialiased dark:bg-night-800 dark:text-night-100"
>
```

(`font-serif` is removed; the body now inherits the default `font-sans` stack defined by `@theme` in Task 1.)

- [ ] **Step 4: Build check**

Run: `npm run astro -- check`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "$(cat <<'EOF'
feat: preload Pretendard and swap Layout to new palette + sans stack

Adds a <link rel="preload"> for the Pretendard Std Variable font file
in <head>, replaces the html and body background classes with the new
stone-100 light bg and night-800 dark bg, and removes font-serif from
the body class so text falls through to the Pretendard-led sans stack
declared in the @theme block.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Shift the light palette and panel side effects across the codebase

**Files:**
- Modify: every `.astro` / `.ts` / `.mjs` file under `src/` that uses `bg-stone-50`, `ring-offset-stone-50`, `bg-stone-100`, `border-stone-100`, `hover:bg-stone-200`, or `prose-pre:bg-stone-100`.

The changes are bulk, idempotent, and keyed on exact substring matches, so a single sed pass captures them safely. All remaining component files get updated in one commit.

- [ ] **Step 1: Enumerate the files that will be touched**

Run:

```bash
grep -rl -E "bg-stone-50|ring-offset-stone-50|bg-stone-100|border-stone-100|hover:bg-stone-200|prose-pre:bg-stone-100" src --include="*.astro" --include="*.ts" --include="*.mjs"
```

Expected: a non-empty list of source files. Note the count — the final verification step at the end of this task confirms every matching token has been rewritten.

- [ ] **Step 2: Run the bulk sed pass**

This repo is on macOS, which requires `sed -i ''` (empty string after `-i`). The first rule masks `dark:bg-stone-100` to a sentinel so the later `bg-stone-100 → bg-stone-200` rule does not corrupt the filter-toggle inversion highlight; the final rule restores the sentinel. Task 4 then remaps the restored `dark:bg-stone-100` to `dark:bg-night-50`. Rule ordering across the `-e` flags must match the order shown below.

```bash
grep -rl -E "bg-stone-50|ring-offset-stone-50|bg-stone-100|border-stone-100|hover:bg-stone-200|prose-pre:bg-stone-100" src --include="*.astro" --include="*.ts" --include="*.mjs" \
  | xargs sed -i '' \
    -e 's|dark:bg-stone-100|__DARK_INVERSION_BG__|g' \
    -e 's|bg-stone-50/80|bg-stone-100/80|g' \
    -e 's|bg-stone-50|bg-stone-100|g' \
    -e 's|ring-offset-stone-50|ring-offset-stone-100|g' \
    -e 's|hover:bg-stone-200|hover:bg-stone-300|g' \
    -e 's|prose-pre:bg-stone-100|prose-pre:bg-stone-200|g' \
    -e 's|bg-stone-100|bg-stone-200|g' \
    -e 's|border-stone-100|border-stone-200|g' \
    -e 's|__DARK_INVERSION_BG__|dark:bg-stone-100|g'
```

- [ ] **Step 3: Verify Layout.astro is unchanged by Task 3**

`src/layouts/Layout.astro` received its light-mode bg update in Task 2, so no `bg-stone-50` should remain in that file. Run:

```bash
grep -n "bg-stone-50" src/layouts/Layout.astro
```

Expected: no output.

- [ ] **Step 4: Verify no unhandled light-mode stone-50 or stone-100 bg remains**

Run:

```bash
grep -rn "bg-stone-50\b\|hover:bg-stone-200\b\|prose-pre:bg-stone-100\b\|border-stone-100\b" src --include="*.astro" --include="*.ts" --include="*.mjs"
```

Expected: no matches. Any match indicates a pattern the bulk sed missed — stop and report as DONE_WITH_CONCERNS.

- [ ] **Step 5: Build and test sanity**

Run: `npm run astro -- check && npm test`
Expected: astro check: no new errors. `npm test`: suite stays green (no test file references the shifted class names directly).

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "$(cat <<'EOF'
feat: shift light palette one step and fix panel differentiation

Migrates the light-mode body backgrounds and matching focus-ring
offsets from stone-50 to stone-100, and lifts panel surfaces (tag
pills, archive-filter toggles, prose code blocks, ArchiveBrowse row
borders) by one stone step so they still read as distinct against the
new body background. Dark-mode filter-toggle inversion classes remain
untouched for the dark remap in the next commit.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Remap every `dark:*-stone-*` utility to the corresponding `dark:*-night-*`

**Files:**
- Modify: every `.astro` / `.ts` / `.mjs` file under `src/` that still contains a `dark:*-stone-*` token. The set comes from a fresh grep.

This is a single bulk sed pass covering the thirty distinct `dark:*-stone-*` patterns enumerated during design. The mapping preserves semantic roles (primary bg, secondary bg, hover bg, primary/secondary text, muted text, borders, focus rings, prose overrides, inversion highlights).

- [ ] **Step 1: Enumerate the files that will be touched**

Run:

```bash
grep -rl "dark:.*stone-" src --include="*.astro" --include="*.ts" --include="*.mjs"
```

Expected: a non-empty list of files (around 27 on a clean checkout).

- [ ] **Step 2: Run the dark-mode bulk sed pass**

```bash
grep -rl "dark:.*stone-" src --include="*.astro" --include="*.ts" --include="*.mjs" \
  | xargs sed -i '' \
    -e 's|dark:bg-stone-100|dark:bg-night-50|g' \
    -e 's|dark:text-stone-950|dark:text-night-900|g' \
    -e 's|dark:prose-pre:bg-stone-900|dark:prose-pre:bg-night-900|g' \
    -e 's|dark:prose-pre:border-stone-700|dark:prose-pre:border-night-500|g' \
    -e 's|dark:prose-a:text-stone-100|dark:prose-a:text-night-100|g' \
    -e 's|dark:prose-a:decoration-stone-500|dark:prose-a:decoration-night-400|g' \
    -e 's|dark:prose-blockquote:border-stone-700|dark:prose-blockquote:border-night-500|g' \
    -e 's|dark:prose-blockquote:text-stone-300|dark:prose-blockquote:text-night-200|g' \
    -e 's|dark:prose-code:text-stone-100|dark:prose-code:text-night-100|g' \
    -e 's|dark:group-hover:text-stone-200|dark:group-hover:text-night-200|g' \
    -e 's|dark:focus-visible:ring-offset-stone-950|dark:focus-visible:ring-offset-night-800|g' \
    -e 's|dark:focus-visible:ring-offset-stone-900|dark:focus-visible:ring-offset-night-900|g' \
    -e 's|dark:focus-visible:ring-stone-700|dark:focus-visible:ring-night-500|g' \
    -e 's|dark:focus:border-stone-700|dark:focus:border-night-500|g' \
    -e 's|dark:hover:bg-stone-800|dark:hover:bg-night-700|g' \
    -e 's|dark:hover:border-stone-700|dark:hover:border-night-500|g' \
    -e 's|dark:hover:text-stone-50|dark:hover:text-night-50|g' \
    -e 's|dark:hover:text-stone-200|dark:hover:text-night-200|g' \
    -e 's|dark:hover:text-stone-300|dark:hover:text-night-200|g' \
    -e 's|dark:bg-stone-800|dark:bg-night-700|g' \
    -e 's|dark:bg-stone-900|dark:bg-night-900|g' \
    -e 's|dark:bg-stone-950|dark:bg-night-800|g' \
    -e 's|dark:border-stone-700|dark:border-night-500|g' \
    -e 's|dark:border-stone-800|dark:border-night-600|g' \
    -e 's|dark:divide-stone-800|dark:divide-night-600|g' \
    -e 's|dark:ring-stone-700|dark:ring-night-500|g' \
    -e 's|dark:ring-stone-800|dark:ring-night-600|g' \
    -e 's|dark:text-stone-50|dark:text-night-50|g' \
    -e 's|dark:text-stone-100|dark:text-night-100|g' \
    -e 's|dark:text-stone-200|dark:text-night-200|g' \
    -e 's|dark:text-stone-300|dark:text-night-200|g' \
    -e 's|dark:text-stone-400|dark:text-night-300|g' \
    -e 's|dark:text-stone-500|dark:text-night-400|g'
```

Compound patterns (`dark:hover:`, `dark:focus-visible:`, `dark:prose-*:`, `dark:group-hover:`) are listed before their underlying `dark:*-stone-N` equivalents so the longer patterns match first. The ordering guarantees that `dark:hover:bg-stone-800` is rewritten to `dark:hover:bg-night-700` before any rule could touch the bare `dark:bg-stone-800` part.

The `dark:bg-stone-100` and `dark:text-stone-950` rules at the top of the list handle the filter-toggle inversion highlight (`dark:bg-stone-100 text-stone-950` → `dark:bg-night-50 text-night-900`), where the intent is "bright pop text on bright pop bg" as the active state on a dark surface.

- [ ] **Step 3: Verify no `dark:*-stone-*` remains**

Run:

```bash
grep -rn "dark:.*stone-" src --include="*.astro" --include="*.ts" --include="*.mjs"
```

Expected: no output. Any remaining match means a `dark:*-stone-*` pattern not in the mapping — stop and report it as DONE_WITH_CONCERNS rather than guessing the remap.

- [ ] **Step 4: Build and test sanity**

Run: `npm run astro -- check && npm test`
Expected: astro check: no new errors. `npm test`: green.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "$(cat <<'EOF'
feat: remap every dark mode stone utility to the night palette

Bulk-rewrites all dark:*-stone-* utilities across the codebase to the
matching dark:*-night-* utility per the design spec's Color Mapping
Table: primary bg to night-800 (Tokyo Night Storm), panels to
night-900, hover bg to night-700, text to night-50/100/200/300/400,
borders to night-500/600, focus rings and divide utilities to
night-500/600, and the filter-toggle inversion highlight to
night-50 / night-900 so it still pops against the night body. Prose
overrides inside post detail pages are remapped in the same pass.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Source-level regression test

**Files:**
- Create: `tests/theme-typography.test.mjs`

- [ ] **Step 1: Write the test**

Create `tests/theme-typography.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const srcUrl = new URL("../src/", import.meta.url);
const globalCssUrl = new URL("styles/global.css", srcUrl);
const layoutUrl = new URL("layouts/Layout.astro", srcUrl);

test("global.css declares the Pretendard Std Variable font-face", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /@font-face\s*\{[^}]*font-family:\s*"Pretendard Std Variable"/);
	assert.match(css, /src:\s*url\("\/fonts\/PretendardStdVariable\.woff2"\)\s*format\("woff2-variations"\)/);
	assert.match(css, /font-weight:\s*100 900/);
	assert.match(css, /font-display:\s*swap/);
});

test("global.css @theme block declares font-sans and the eleven night tokens", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /@theme\s*\{/);
	assert.match(css, /--font-sans:[^;]*"Pretendard Std Variable"/);
	for (const shade of [
		["50", "#c0caf5"],
		["100", "#a9b1d6"],
		["200", "#9aa5ce"],
		["300", "#737aa2"],
		["400", "#565f89"],
		["500", "#414868"],
		["600", "#3b4261"],
		["700", "#292e42"],
		["800", "#24283b"],
		["900", "#1f2335"],
		["950", "#16161e"],
	]) {
		const [id, hex] = shade;
		const pattern = new RegExp(`--color-night-${id}:\\s*${hex}`, "i");
		assert.match(css, pattern, `missing --color-night-${id}: ${hex}`);
	}
});

test("global.css :where(.dark) figure rules reference night colors", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	assert.match(css, /:where\(\.dark\) \.prose figure img[^}]*border-color:\s*rgb\(59 66 97 \/ 1\)/);
	assert.match(css, /:where\(\.dark\) \.prose figcaption[^}]*color:\s*rgb\(115 122 162 \/ 1\)/);
});

test("Layout.astro preloads the Pretendard font and uses the new palette + sans stack", async () => {
	const layout = await readFile(layoutUrl, "utf8");
	assert.match(
		layout,
		/<link rel="preload" href="\/fonts\/PretendardStdVariable\.woff2" as="font" type="font\/woff2" crossorigin/,
	);
	assert.match(layout, /<html [^>]*class="bg-stone-100 text-stone-900 dark:bg-night-800 dark:text-night-100"/);
	assert.match(layout, /<body[\s\S]*?class="[^"]*bg-stone-100[^"]*dark:bg-night-800[^"]*"/);
	assert.doesNotMatch(layout, /font-serif/);
});

async function collectSourceFiles(dirUrl) {
	const results = [];
	const entries = await readdir(dirUrl, { withFileTypes: true });
	for (const entry of entries) {
		const childUrl = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dirUrl);
		if (entry.isDirectory()) {
			results.push(...(await collectSourceFiles(childUrl)));
			continue;
		}
		if (/\.(astro|ts|mjs)$/.test(entry.name)) {
			results.push(childUrl);
		}
	}
	return results;
}

test("no dark:*-stone-* utility remains anywhere under src/", async () => {
	const files = await collectSourceFiles(srcUrl);
	const offenders = [];
	for (const fileUrl of files) {
		const text = await readFile(fileUrl, "utf8");
		const matches = text.match(/dark:[A-Za-z-]*stone-[0-9]+/g);
		if (matches) {
			offenders.push({ file: fileUrl.pathname, matches: Array.from(new Set(matches)) });
		}
	}
	assert.deepEqual(offenders, [], `residual dark stone tokens:\n${JSON.stringify(offenders, null, 2)}`);
});

test("no light-mode bg-stone-50 or panel-level bg-stone-100 / border-stone-100 remains", async () => {
	const files = await collectSourceFiles(srcUrl);
	const patterns = [
		/\bbg-stone-50\b/,
		/\bring-offset-stone-50\b/,
		/(^|[^-])bg-stone-100\b/, // catches bare bg-stone-100 but not dark:bg-stone-100 which no longer exists after Task 4
		/\bborder-stone-100\b/,
		/\bprose-pre:bg-stone-100\b/,
		/\bhover:bg-stone-200\b/,
	];
	const offenders = [];
	for (const fileUrl of files) {
		const text = await readFile(fileUrl, "utf8");
		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) {
				offenders.push({ file: fileUrl.pathname, pattern: pattern.source, match: match[0] });
			}
		}
	}
	assert.deepEqual(offenders, [], `residual stone tokens:\n${JSON.stringify(offenders, null, 2)}`);
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- tests/theme-typography.test.mjs`
Expected: all six tests pass.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: suite stays green. Pass count grows by 6 relative to the pre-task baseline.

- [ ] **Step 4: Commit**

```bash
git add tests/theme-typography.test.mjs
git commit -m "$(cat <<'EOF'
test: cover palette shift, font-face, and dark/light stone residue

Adds six source-level regression tests: the Pretendard Std Variable
font-face declaration, the @theme block shipping all eleven
--color-night-* tokens plus the --font-sans override, the dark-mode
figure rules referencing night colors, the Layout.astro preload hint
and updated body classes with no lingering font-serif, and two
whole-tree scans asserting no stray dark:*-stone-* or panel-level
light-mode stone-100 / stone-50 residue remains after the bulk
remaps.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Documentation

**Files:**
- Create: `docs/spec-theme-typography.md`
- Modify: `docs/spec-layout.md`
- Modify: `docs/spec-roadmap.md`

Three separate commits, one per file. Do not squash.

---

#### Sub-task 6a: Create `docs/spec-theme-typography.md`

- [ ] **Step 1: Write the file**

Create `docs/spec-theme-typography.md` with exactly this content:

```markdown
# Spec: Theme and Typography

- **Goal**: Describe the site's palette and typeface choices so future theme or font work stays aligned with the editorial voice.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. Both palettes and the typeface must reinforce the "quiet, text-first" feel — no pure white, no pure black, no loud accent colors.
- **Light Palette**:
  - Body background: `stone-100` (#f5f5f4). Chosen over `stone-50` so the reading surface feels like paper rather than a bright screen.
  - Text: `stone-900` primary, `stone-600` secondary, `stone-500` muted.
  - Border and hairline: `stone-200`.
  - Panel surfaces (tag pills, code blocks, filter toggles, ArchiveBrowse row borders): `stone-200` bg with `stone-300` hover so they remain visibly distinct against the `stone-100` body.
- **Dark Palette**: custom `night` family declared in `src/styles/global.css` via `@theme`. Inspired by the Tokyo Night Storm variant.
  - Primary body bg: `night-800` (#24283b). `night-800` is the lightest "dark" tone in the family; Storm uses it as the main writing surface.
  - Secondary surfaces (cards, panels, post-reading blocks, filter inactive state): `night-900` (#1f2335).
  - Hover bg for interactive panels: `night-700` (#292e42).
  - Deepest tone (`night-950`, #16161e) reserved for rare emphasis; not used by default in this iteration.
  - Text: `night-50` (#c0caf5) primary, `night-200` (#9aa5ce) secondary, `night-400` (#565f89) muted.
  - Border and hairline: `night-600` (#3b4261).
  - Focus ring: `night-500` (#414868).
  - Filter-toggle inversion highlight: `night-50` bg with `night-900` text (mirrors the light-mode flip that uses `stone-900` bg with `stone-50` text).
- **Typeface**:
  - Primary sans stack: self-hosted `Pretendard Std Variable` (variable woff2, 285 KB, KS X 1001 Korean coverage, hybrid Latin design).
  - Monospace stack: Tailwind default (`ui-monospace, ...`); retained for `<code>` and `<pre>` only.
  - Fallback chain: `"Pretendard Std Variable", "Pretendard Std", "Pretendard", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`.
  - Loading: `font-display: swap`; preloaded in `src/layouts/Layout.astro` so first paint swaps to Pretendard as early as the network allows.
  - License: OFL. The license file ships alongside the font at `public/fonts/PretendardStd.LICENSE.txt`.
- **Guardrails**:
  - No vivid Tokyo Night accent colors (the signature purple, green, yellow, orange from the terminal theme's syntax highlighting) anywhere in the dark palette. Only the muted Storm background/text tones come across.
  - No third typeface. Headings, captions, and body share the same sans stack; variation comes from weight and tracking.
  - No inline `style="color: ..."` overrides. All palette values flow through Tailwind utilities or the `@theme` tokens.
  - Do not remap `stone-200` / `stone-500` / `stone-900` usages in light mode. The single `stone-50 → stone-100` body shift plus the panel side-effect shifts are the entire light-mode delta.
- **What To Avoid**:
  - Adding a CDN font (jsDelivr, Google Fonts) — the project self-hosts Pretendard and has no runtime external font dependency.
  - Introducing a `font-serif` utility or class anywhere; body copy stays on the sans stack.
  - Adding more tones to the `night` family than the eleven already declared. If a specific element needs a tone we don't have, first verify it's not solvable by an existing token at a different step.
```

- [ ] **Step 2: Commit 6a**

```bash
git add docs/spec-theme-typography.md
git commit -m "$(cat <<'EOF'
docs: add theme and typography spec

Adds the SSOT documenting the light stone palette, the custom night
dark palette (Tokyo Night Storm-inspired, primary-bg-at-night-800),
the self-hosted Pretendard Std Variable typeface and its fallback
chain, and the guardrails that keep future theme work from drifting
into vivid accents or a secondary typeface.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

#### Sub-task 6b: Update `docs/spec-layout.md`

- [ ] **Step 1: Add a base theme bullet to the Layout Structure block**

In `docs/spec-layout.md`, find the `**Layout Structure**:` bullet list. At the end of the list, append:

```markdown
  - Apply the light stone / dark night palette and the Pretendard Std Variable sans stack at the html and body level. See `docs/spec-theme-typography.md`.
```

- [ ] **Step 2: Update the Footer bullet to mention the signature under the new palette context**

No change needed in the Footer block — the signature line already references site identity. Skip.

- [ ] **Step 3: Commit 6b**

```bash
git add docs/spec-layout.md
git commit -m "$(cat <<'EOF'
docs: point layout spec at the theme and typography SSOT

Adds a bullet inside the Layout Structure block noting that the html
and body carry the stone / night palette plus the Pretendard sans
stack, and cross-references docs/spec-theme-typography.md for the
full contract.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

#### Sub-task 6c: Update `docs/spec-roadmap.md`

- [ ] **Step 1: Append a landed bullet to `## Current State`**

Find the `## Current State` bullet list at the top of `docs/spec-roadmap.md`. Append this new bullet at the end of that list (after the draft-mode bullet):

```markdown
- Reading-comfort polish is in place: the light body bg is now `stone-100`, the dark body bg is a Tokyo Night Storm-inspired custom `night-800`, and the primary sans typeface is self-hosted Pretendard Std Variable (see `docs/spec-theme-typography.md`).
```

- [ ] **Step 2: Commit 6c**

```bash
git add docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record reading comfort polish landed in roadmap

Notes at the top of the roadmap that the light palette shift, the
custom night dark palette, and the Pretendard Std typeface have
shipped, and points at docs/spec-theme-typography.md for the full
contract.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Final test-suite pass**

Run: `npm test`
Expected: suite still green (docs-only changes).

---

## Self-Review Checklist (for the executor)

Before declaring the plan complete:

1. Run `npm test` and confirm all tests pass.
2. Run `npm run astro -- check` and confirm no new type errors.
3. Spot-check `/` and `/en/` in `npm run dev` in both light and dark modes. Confirm:
   - Light body bg is `#f5f5f4`, text sits on a slightly softer background than before.
   - Dark body bg is `#24283b`, panels (`night-900`) are visibly darker, text is pale blue-white (`#c0caf5`).
   - Korean and English text render in Pretendard (visually distinct from the previous serif).
   - Tag pills, filter toggles, code blocks, and ArchiveBrowse rows all remain visually distinct from the body.
4. Open devtools network tab, confirm the request for `/fonts/PretendardStdVariable.woff2` is served with `Content-Type: font/woff2` (or the browser's equivalent) and returns 200. The `<link rel="preload">` should fire high-priority.
5. Confirm no `font-serif` class exists anywhere in `src/`:
   ```bash
   grep -rn "font-serif" src
   ```
   Expected: no output.
6. Re-read `docs/spec-theme-typography.md`, `docs/spec-layout.md`, and `docs/spec-roadmap.md` and confirm they describe what actually shipped.
