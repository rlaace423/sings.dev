# Prose Comfort Bump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump every "reading prose" surface on the site from 1rem to 1.125rem (article body via `prose-lg`; post-card and post-summary descriptions via `text-lg`), and center in-prose images that are narrower than the figure container so they sit on the same axis as the already-centered figcaption.

**Architecture:** Add `prose-lg` to the existing `.prose-site` `@apply` chain in `src/styles/global.css` so Tailwind Typography retunes body font-size, line-height, paragraph spacing, heading scale, code-block padding, and list indents as a coordinated set. Change the existing `.prose-site figure img` rule from `margin: 0` to `margin: 0 auto` so narrow images center without further selectors (Typography already declares `figure img { display: block }` via `prose`). Add a single `text-lg` utility on the description `<p>` in four files — `PostList.astro`, `PostSummary.astro`, `src/pages/index.astro`, `src/pages/en/index.astro` — leaving every other class (notably `leading-8`) intact. Extend `tests/theme-typography.test.mjs` with source-grep regression assertions for each change. Update `docs/spec-theme-typography.md` and append a Current State bullet to `docs/spec-roadmap.md`.

**Tech Stack:** Tailwind 4 with CSS-based `@theme` configuration, `@tailwindcss/typography` ^0.5 (`prose`, `prose-lg`, `prose-stone`), Astro 6, `node --test` with plain `readFile` for source-level regression assertions.

**Reference Spec:** `docs/superpowers/specs/2026-05-10-prose-comfort-bump-design.md`.

---

## File Structure

### Modify

- `src/styles/global.css` — add `prose-lg` to the `.prose-site` `@apply` chain (one token); change `.prose-site figure img { margin: 0 }` to `margin: 0 auto` (one declaration). No other rules touched.
- `src/components/PostList.astro` line 71 — add `text-lg` to the description `<p>` class string. No other classes touched.
- `src/components/PostSummary.astro` line 23 — change `text-base` to `text-lg` on the summary `<p>` class string. No other classes touched.
- `src/pages/index.astro` line 111 — add `text-lg` to the inline-list description `<p>` class string. No other classes touched.
- `src/pages/en/index.astro` line 88 — add `text-lg` to the inline-list description `<p>` class string. No other classes touched.
- `tests/theme-typography.test.mjs` — append six new tests to the existing file (one for `prose-lg`, one for `margin: 0 auto`, four for the per-component `text-lg` edits). The existing tests stay unchanged.
- `docs/spec-theme-typography.md` — add a `Body Prose Size` subsection documenting the `prose-lg` choice and the `text-lg` echoes outside `.prose-site`.
- `docs/spec-roadmap.md` — append one Current State bullet recording the prose comfort bump.

### Create

- None. This iteration only modifies existing files.

---

## Tasks

### Task 1: Apply `prose-lg` and center figure images in `.prose-site`

**Files:**
- Modify: `src/styles/global.css:65-93`
- Test: `tests/theme-typography.test.mjs` (append tests)

- [ ] **Step 1: Append failing tests to `tests/theme-typography.test.mjs`**

Open `tests/theme-typography.test.mjs` and append these two test blocks at the end of the file (after the last existing `test(...)` block on line 162):

```js
test("global.css applies prose-lg on .prose-site for the body prose size step", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	// Match the .prose-site @apply chain and assert prose-lg appears in it.
	const match = css.match(/\.prose-site\s*\{[^}]*@apply\s+([^;]+);/);
	assert.ok(match, ".prose-site @apply chain not found");
	const chain = match[1];
	assert.ok(
		/\bprose-lg\b/.test(chain),
		`expected prose-lg in .prose-site @apply chain; got: ${chain.trim()}`,
	);
	// And the size step must come after the base prose token so the cascade is correct.
	assert.ok(
		/\bprose\b[\s\S]*\bprose-lg\b/.test(chain),
		"prose-lg should appear after the base prose token in the @apply chain",
	);
});

test("global.css centers in-prose images via margin: 0 auto", async () => {
	const css = await readFile(globalCssUrl, "utf8");
	// Match the .prose-site figure img rule body and assert margin: 0 auto is present.
	const match = css.match(/\.prose-site figure img\s*\{([^}]*)\}/);
	assert.ok(match, ".prose-site figure img rule not found");
	const body = match[1];
	assert.match(
		body,
		/margin:\s*0\s+auto/,
		`expected margin: 0 auto in .prose-site figure img; got: ${body.trim()}`,
	);
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run: `npm test -- --test-name-pattern="prose-lg|margin: 0 auto"`

Expected: both new tests FAIL.
- The `prose-lg` test fails with a message ending `; got: prose prose-stone max-w-none ...` (no `prose-lg` in chain).
- The `margin: 0 auto` test fails with the assertion regex not matching (current rule is `margin: 0`).

- [ ] **Step 3: Add `prose-lg` to the `.prose-site` `@apply` chain**

In `src/styles/global.css`, edit the `.prose-site` declaration (currently starting at line 66):

```css
/* before */
.prose-site {
    @apply prose prose-stone max-w-none
        prose-p:text-dawn-800 prose-li:text-dawn-800 prose-headings:text-dawn-800
        prose-a:text-terracotta-600 prose-a:decoration-terracotta-600/40 prose-a:underline-offset-4
        ...

/* after */
.prose-site {
    @apply prose prose-lg prose-stone max-w-none
        prose-p:text-dawn-800 prose-li:text-dawn-800 prose-headings:text-dawn-800
        prose-a:text-terracotta-600 prose-a:decoration-terracotta-600/40 prose-a:underline-offset-4
        ...
```

Concrete edit: replace the single token `prose prose-stone max-w-none` with `prose prose-lg prose-stone max-w-none` on the first `@apply` line of `.prose-site`. Every other line stays unchanged.

- [ ] **Step 4: Change the `.prose-site figure img` margin to `0 auto`**

In `src/styles/global.css` around line 86-90, edit:

```css
/* before */
.prose-site figure img {
    margin: 0;
    border-radius: 0.375rem;
    border: 1px solid rgb(220 214 204 / 1); /* dawn-300 */
}

/* after */
.prose-site figure img {
    margin: 0 auto;
    border-radius: 0.375rem;
    border: 1px solid rgb(220 214 204 / 1); /* dawn-300 */
}
```

Concrete edit: change `margin: 0;` to `margin: 0 auto;` on the line immediately after `.prose-site figure img {`. Every other declaration stays unchanged.

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npm test -- --test-name-pattern="prose-lg|margin: 0 auto"`

Expected: both tests PASS. The full test suite should also pass — run `npm test` if you want the full sweep.

- [ ] **Step 6: Manual visual verification**

Start the dev server and open a post-detail page that contains a narrow figure (any post under `src/content/blog/ko/iam-policy-checklist/` works — its SVGs are narrower than the article column).

```bash
npm run dev
```

Open `http://localhost:4321/posts/<some-post-with-figure>/` and confirm:

- Body text reads visibly larger than before (1.125rem instead of 1rem); paragraph gaps and list indents look proportional, not cramped.
- The narrow figure's image now sits centered within the figure block, on the same axis as the figcaption underneath. Wide figures (`#wide` URL fragment, `data-width="wide"`) still bleed beyond the column on `>=md` viewports — verify on a post that uses one if available.
- No regression in dark mode (toggle the theme switch and re-check both items).

If you do not have browser access, ask the user to load the dev URL and confirm visually. Stop the dev server with Ctrl-C once verified.

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css tests/theme-typography.test.mjs
git commit -m "$(cat <<'EOF'
style: apply prose-lg on .prose-site and center narrow figure images

Bumps article body to 1.125rem with the plugin's coordinated rhythm
(line-height, paragraph spacing, heading scale, code-block padding).
Switches in-prose images that are narrower than their figure container
to margin: 0 auto so they sit on the same axis as the centered
figcaption, resolving a small alignment inconsistency.

See docs/superpowers/specs/2026-05-10-prose-comfort-bump-design.md.
EOF
)"
```

---

### Task 2: Bump description paragraphs to `text-lg`

**Files:**
- Modify: `src/components/PostList.astro:71`
- Modify: `src/components/PostSummary.astro:23`
- Modify: `src/pages/index.astro:111`
- Modify: `src/pages/en/index.astro:88`
- Test: `tests/theme-typography.test.mjs` (append more tests)

- [ ] **Step 1: Append failing tests for the four description-paragraph edits**

Open `tests/theme-typography.test.mjs` and append these four new test blocks at the end of the file (after the two tests added in Task 1):

```js
test("PostList.astro description paragraph carries text-lg", async () => {
	const file = await readFile(new URL("components/PostList.astro", srcUrl), "utf8");
	// The description <p> is the one that renders post.data.description.
	// Match the <p ...> opening tag immediately preceding {post.data.description}.
	const match = file.match(/<p\s+class="([^"]+)"\s*>\s*\{post\.data\.description\}/);
	assert.ok(match, "PostList description <p> not found");
	const classes = match[1];
	assert.ok(
		/\btext-lg\b/.test(classes),
		`expected text-lg on PostList description <p>; got: ${classes}`,
	);
});

test("PostSummary.astro summary paragraph carries text-lg, not text-base", async () => {
	const file = await readFile(new URL("components/PostSummary.astro", srcUrl), "utf8");
	// The summary <p> is the second <p> in the file, rendering {summary}.
	const match = file.match(/<p\s+class="([^"]+)"\s*>\s*\{summary\}/);
	assert.ok(match, "PostSummary summary <p> not found");
	const classes = match[1];
	assert.ok(
		/\btext-lg\b/.test(classes),
		`expected text-lg on PostSummary summary <p>; got: ${classes}`,
	);
	assert.ok(
		!/\btext-base\b/.test(classes),
		`text-base should be removed from PostSummary summary <p>; got: ${classes}`,
	);
});

test("Korean home page inline post-list description carries text-lg", async () => {
	const file = await readFile(new URL("pages/index.astro", srcUrl), "utf8");
	const match = file.match(/<p\s+class="([^"]+)"\s*>\s*\{post\.data\.description\}/);
	assert.ok(match, "ko home inline-list description <p> not found");
	const classes = match[1];
	assert.ok(
		/\btext-lg\b/.test(classes),
		`expected text-lg on ko home description <p>; got: ${classes}`,
	);
});

test("English home page inline post-list description carries text-lg", async () => {
	const file = await readFile(new URL("pages/en/index.astro", srcUrl), "utf8");
	const match = file.match(/<p\s+class="([^"]+)"\s*>\s*\{post\.data\.description\}/);
	assert.ok(match, "en home inline-list description <p> not found");
	const classes = match[1];
	assert.ok(
		/\btext-lg\b/.test(classes),
		`expected text-lg on en home description <p>; got: ${classes}`,
	);
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run: `npm test -- --test-name-pattern="text-lg|text-base"`

Expected: all four new tests FAIL — none of the four description paragraphs currently carries `text-lg`. The PostSummary test fails on the first assertion (`expected text-lg`) because the current class is `text-base`.

- [ ] **Step 3: Edit `src/components/PostList.astro` description**

In `src/components/PostList.astro` line 71, edit the description `<p>`:

```astro
<!-- before -->
<p class="max-w-2xl leading-8 text-dawn-700 dark:text-night-200">
    {post.data.description}
</p>

<!-- after -->
<p class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200">
    {post.data.description}
</p>
```

Concrete edit: insert ` text-lg` between `max-w-2xl` and `leading-8` in the `class=` attribute on line 71. The existing `leading-8` (line-height: 2rem) stays — it overrides `text-lg`'s default line-height (1.75rem) because `leading-*` utilities are generated after font-size utilities in Tailwind v4's CSS output.

- [ ] **Step 4: Edit `src/components/PostSummary.astro` description**

In `src/components/PostSummary.astro` line 23, edit the summary `<p>`:

```astro
<!-- before -->
<p class="mt-2 max-w-2xl text-base leading-8 text-dawn-700 dark:text-night-200">
    {summary}
</p>

<!-- after -->
<p class="mt-2 max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200">
    {summary}
</p>
```

Concrete edit: replace the single token `text-base` with `text-lg` on line 23. Every other class stays.

- [ ] **Step 5: Edit `src/pages/index.astro` inline post-list description**

In `src/pages/index.astro` line 111, edit the description `<p>` inside the recent-posts inline list:

```astro
<!-- before -->
<p class="max-w-2xl leading-8 text-dawn-700 dark:text-night-200">
    {post.data.description}
</p>

<!-- after -->
<p class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200">
    {post.data.description}
</p>
```

Concrete edit: insert ` text-lg` between `max-w-2xl` and `leading-8` on line 111.

- [ ] **Step 6: Edit `src/pages/en/index.astro` inline post-list description**

In `src/pages/en/index.astro` line 88, edit the description `<p>` (same shape as the KO page):

```astro
<!-- before -->
<p class="max-w-2xl leading-8 text-dawn-700 dark:text-night-200">
    {post.data.description}
</p>

<!-- after -->
<p class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200">
    {post.data.description}
</p>
```

Concrete edit: insert ` text-lg` between `max-w-2xl` and `leading-8` on line 88.

- [ ] **Step 7: Run the tests and verify they pass**

Run: `npm test`

Expected: every test PASSES, including the four new tests added in Step 1 and the two added in Task 1. There should be no regressions in unrelated tests.

If `post-summary.test.mjs` or `post-detail-structure.test.mjs` has any string assertion that incidentally matches `text-base` for the summary, that test would need its assertion updated. Check the failures, and if any unrelated test breaks, fix the assertion in that test rather than reverting the size bump.

- [ ] **Step 8: Manual visual verification**

Start the dev server:

```bash
npm run dev
```

Open these URLs and confirm:

- `http://localhost:4321/` — the recent-posts inline list shows post descriptions visibly larger (1.125rem) than they were; "최근 글" eyebrow and dates above stay small (intentional).
- `http://localhost:4321/posts/` — the archive listing's post descriptions match the home page sizing.
- `http://localhost:4321/en/` and `http://localhost:4321/en/posts/` — same for the English locale.
- `http://localhost:4321/posts/<some-post-with-summary>/` — the post-summary block (`요약` / `Summary` left-bordered block above the body) reads at the same size as the article body underneath. Visual hierarchy comes from the left-rule and uppercase label, not from a font-size jump.
- Dark mode (toggle the theme switch) — descriptions stay readable, contrast unchanged.

If you do not have browser access, ask the user to load each URL and confirm visually. Stop the dev server once verified.

- [ ] **Step 9: Commit**

```bash
git add src/components/PostList.astro src/components/PostSummary.astro src/pages/index.astro src/pages/en/index.astro tests/theme-typography.test.mjs
git commit -m "$(cat <<'EOF'
style: bump post-card and post-summary descriptions to text-lg

Lifts the four reading-prose surfaces outside .prose-site to 1.125rem
so the article body and the descriptions readers scan in lists / on
home pages share the same text size. Eyebrow labels, dates, and other
chrome stay at their existing sizes by design.

See docs/superpowers/specs/2026-05-10-prose-comfort-bump-design.md.
EOF
)"
```

---

### Task 3: Document the body prose size and append a roadmap bullet

**Files:**
- Modify: `docs/spec-theme-typography.md` (append a new bullet block)
- Modify: `docs/spec-roadmap.md` (append a Current State bullet)

- [ ] **Step 1: Add a `Body Prose Size` bullet to `docs/spec-theme-typography.md`**

Open `docs/spec-theme-typography.md` and locate the `Typeface` bullet block (currently around lines 26-31, ending with the OFL license bullet). Insert a new top-level bullet block immediately after the `Typeface` block and before the existing `Code Block Syntax Highlighting` block. The new block should read:

```markdown
- **Body Prose Size**:
  - Article body sits at 1.125rem (18px) via Tailwind Typography's `prose-lg` size step. The `.prose-site` chain in `src/styles/global.css` composes `prose prose-lg prose-stone`, which retunes line-height (1.78), paragraph spacing, heading scale, list indents, and code-block padding as a coordinated set rather than only the body font-size.
  - Reading-prose surfaces outside `.prose-site` echo the same size: post-card descriptions in `PostList.astro` and the inline post lists on `src/pages/index.astro` and `src/pages/en/index.astro`, and the summary paragraph in `PostSummary.astro`, all carry `text-lg` (1.125rem) with `leading-8` (line-height 2rem) preserved for the existing essay-feel leading.
  - Compact list-card patterns (`RelatedReading.astro`, education / experience descriptions in `AboutIdentity.astro`) and UI chrome (eyebrow labels, dates, metadata, card titles, hero h1, h2 section headings) stay at their existing sizes. The bump targets reading prose only.
  - In-prose images that are narrower than the figure container center via `margin: 0 auto` on `.prose-site figure img`, matching the figcaption that is already centered. Wide images using `data-width="wide"` continue to bleed beyond the prose column at full container width.
  - Rationale and decision history: `docs/superpowers/specs/2026-05-10-prose-comfort-bump-design.md`.
```

Concrete edit: use the Edit tool to insert the block. The unique anchor for the insertion point is the line `  - License: OFL. The license file ships alongside the font at `public/fonts/PretendardStd.LICENSE.txt`.` (the last sub-bullet inside the Typeface block). Insert the new top-level bullet block on the line immediately after that anchor; existing top-level bullets in this file are flush against each other with no blank-line separator.

- [ ] **Step 2: Append a Current State bullet to `docs/spec-roadmap.md`**

Open `docs/spec-roadmap.md` and locate the last bullet of the Current State section (currently line 32, the legacy-Medium bullet ending `... future archival imports.`). Append one new bullet on the line immediately after it (still inside the Current State section, before the blank line that separates it from `## Priority Areas`):

```markdown
- Prose comfort bump landed: article body and matching reading-prose surfaces are now at 1.125rem — `prose-lg` on `.prose-site` for the article body, and `text-lg` on the description `<p>` elements in `PostList.astro`, `PostSummary.astro`, and the inline post lists on `src/pages/index.astro` and `src/pages/en/index.astro`. In-prose images that are narrower than their figure container also center now via `margin: 0 auto`, matching the figcaption that was already centered. UI chrome (eyebrows, dates, card titles, hero h1) stays at its existing sizes. See `docs/spec-theme-typography.md` and `docs/superpowers/specs/2026-05-10-prose-comfort-bump-design.md`.
```

Concrete edit: use the Edit tool to insert this bullet. The unique anchor for the insertion point is the line `- Legacy Medium archive migration is complete: ...` ending in `... for any future archival imports.`. Insert the new bullet on the line immediately after that anchor.

- [ ] **Step 3: Verify the doc edits with a quick read-back**

Run:

```bash
grep -n "Body Prose Size" docs/spec-theme-typography.md
grep -n "Prose comfort bump landed" docs/spec-roadmap.md
```

Expected output:
- One match for `Body Prose Size` in `docs/spec-theme-typography.md`.
- One match for `Prose comfort bump landed` in `docs/spec-roadmap.md`.

- [ ] **Step 4: Commit**

```bash
git add docs/spec-theme-typography.md docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record body prose size decision and prose comfort bump

Adds a Body Prose Size bullet to spec-theme-typography (prose-lg on
.prose-site, text-lg echoes outside it, narrow-image centering),
and appends a Current State bullet to spec-roadmap.

See docs/superpowers/specs/2026-05-10-prose-comfort-bump-design.md.
EOF
)"
```
