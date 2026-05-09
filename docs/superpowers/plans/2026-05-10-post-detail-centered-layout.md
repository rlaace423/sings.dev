# Post Detail Centered Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure post detail page article so the body is dead-centered on the viewport (`max-w-3xl mx-auto`) and the table of contents overhangs the body's right edge as an absolutely-positioned satellite (`absolute inset-y-0 left-full pl-4 w-60`) at `xl:` (1280px) and above. Below `xl:`, the existing mobile pattern (single-column body + collapsible `<details>` TOC at top of article) extends through the tablet / small-laptop band.

**Architecture:** Replace the current `<article class="mx-auto max-w-5xl"><div class="md:flex md:gap-16">[3/4 body][1/4 TOC]</div></article>` with a flat `<article class="relative mx-auto max-w-3xl">[body content][aside absolute overhang]</article>`. The article is the `position: relative` ancestor that anchors the absolute TOC aside; the aside uses `inset-y-0` so it stretches to the article's full height (matching the current flex stretch behavior, so the sticky inner element scrolls with the entire article body). Mobile-style `<details>` TOC at the top of the article keeps its content but its trigger breakpoint moves from `md:hidden` to `xl:hidden`. Layout shell (`src/layouts/Layout.astro`'s `max-w-4xl`) stays unchanged — the body wrapper inside is its own `max-w-3xl mx-auto`, so body-on-viewport-center composes correctly through the shell, and the aside's absolute overhang escapes the shell horizontally via the shell's default `overflow: visible`.

**Tech Stack:** Astro 6 page templates, Tailwind 4 utilities (`relative`, `mx-auto`, `max-w-3xl`, `absolute`, `inset-y-0`, `left-full`, `pl-4`, `w-60`, `xl:hidden`, `xl:block`), `node --test` with source-grep regression assertions following the established pattern in `tests/theme-typography.test.mjs` and the rendered-output pattern in `tests/post-detail-structure.test.mjs`.

**Reference Spec:** `docs/superpowers/specs/2026-05-10-post-detail-centered-layout-design.md`.

---

## File Structure

### Modify

- `src/pages/posts/[...slug].astro` — restructure the `<article>` element and its children. Change article wrapper class from `mx-auto max-w-5xl` to `relative mx-auto max-w-3xl`. Remove the `<div class="md:flex md:gap-16">` flex wrapper and the `<div class="min-w-0 md:w-3/4">` body column wrapper (their content moves up to article level). Change mobile `<details>` trigger from `md:hidden` to `xl:hidden`. Reposition the TOC `<aside>` to be the last child of `<article>` and re-class it from `hidden md:block md:w-1/4` to `hidden xl:block absolute inset-y-0 left-full pl-4 w-60`. The aside's inner `<div class="sticky top-24 border-l border-dawn-300 pl-6 dark:border-night-600">` and the `<TOC>` component call inside stay byte-identical.
- `src/pages/en/posts/[...slug].astro` — identical restructure to the KO file. Same class changes; only the locale-specific `summary` text and `<TOC>` props differ (and those stay as they are today).
- `tests/post-detail-structure.test.mjs` — append one new source-grep test that asserts the new layout shape on both KO and EN files. The test uses the same `readFile` + `assert.match` pattern used by source-grep tests elsewhere in the suite. Existing rendered-output tests in this file (which assert on `data-pagefind-body`, `data-content`, `data-reading-flow` attributes) stay green because those attributes are unchanged.
- `docs/spec-post-detail.md` — rewrite the "Layout Change for Post Detail" section (currently lines 68-76 documenting the prior `md:` 2-column layout) to reflect the new `xl:` overhang pattern. Add a single sentence flagging the wide-figure / TOC-overhang corner case for future authors.
- `docs/spec-roadmap.md` — append one Current State bullet recording the centered-layout iteration.

### Create

- None. This iteration only modifies existing files.

### Out of scope

- `src/layouts/Layout.astro` — unchanged.
- `src/components/TOC.astro` — unchanged. The scroll-spy script binds to `nav[data-toc]` regardless of the parent's positioning.
- `src/components/ReadingProgress.astro`, `src/components/PostImageLightbox.astro`, `src/components/CodeCopyButton.astro` — unchanged. All bind to `article .prose-site` or to descendants of the article body. Restructuring the article wrapper around the body doesn't affect those selectors.
- `src/components/PostHeader.astro`, `src/components/PostSummary.astro`, `src/components/PostReadingFlow.astro`, `src/components/Comments.astro` — unchanged.
- All other pages (home, archive, /about, taxonomy) — unchanged.
- Wide figure CSS (`.prose-site figure[data-width="wide"]` in `src/styles/global.css`) — unchanged. Documented as a corner case in the spec doc update; no current post uses `#wide` so there's no behavior change.
- Body prose typography — unchanged from the prior iteration (`prose-lg` on `.prose-site`, `text-lg` on the four reading-prose `<p>` elements).

---

## Tasks

### Task 1: Restructure post detail pages and add the regression test

**Files:**
- Modify: `src/pages/posts/[...slug].astro` (lines 69-113, the `<article>` element)
- Modify: `src/pages/en/posts/[...slug].astro` (same lines, same shape)
- Test: `tests/post-detail-structure.test.mjs` (append one new test)

- [ ] **Step 1: Append a failing source-grep test to `tests/post-detail-structure.test.mjs`**

Open `tests/post-detail-structure.test.mjs` and append this new test block at the end of the file (after the last existing `test(...)` block):

```js
test("post detail pages center the body on viewport with TOC overhanging at xl:", async () => {
	for (const path of ["pages/posts/[...slug].astro", "pages/en/posts/[...slug].astro"]) {
		const file = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

		// Article wraps a centered, max-w-3xl, position: relative box for TOC absolute anchor.
		assert.match(
			file,
			/<article\s+class="relative mx-auto max-w-3xl"\s+data-pagefind-body/,
			`${path}: article should carry "relative mx-auto max-w-3xl" with data-pagefind-body`,
		);

		// Mobile details TOC is hidden at xl+ (not md+).
		assert.match(
			file,
			/<details[^>]*\bxl:hidden\b/,
			`${path}: mobile details TOC should be xl:hidden`,
		);

		// Desktop TOC aside overhangs at xl+ via absolute positioning, full-height for sticky scroll range.
		assert.match(
			file,
			/<aside\s+class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60"/,
			`${path}: desktop TOC aside should be the absolute overhang shape`,
		);

		// Old md: 2-column structure must not regress.
		assert.doesNotMatch(file, /md:flex md:gap-16/, `${path}: old md:flex layout should be removed`);
		assert.doesNotMatch(file, /md:w-3\/4/, `${path}: old md:w-3/4 body column should be removed`);
		assert.doesNotMatch(file, /hidden md:block md:w-1\/4/, `${path}: old md:w-1/4 TOC column should be removed`);
		assert.doesNotMatch(file, /max-w-5xl/, `${path}: old article max-w-5xl should be removed`);
	}
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `npm test -- --test-name-pattern="post detail pages center the body"`

Expected: the new test FAILS. Two of the four positive assertions miss (article doesn't have `relative mx-auto max-w-3xl`; aside doesn't have the new absolute shape) and the four `assert.doesNotMatch` calls also fail because the old structure is still in place.

- [ ] **Step 3: Restructure `src/pages/posts/[...slug].astro` (KO)**

Replace lines 69-113 of `src/pages/posts/[...slug].astro` with:

```astro
	<article
		class="relative mx-auto max-w-3xl"
		data-pagefind-body
	>
		<details class="mb-10 rounded-lg border border-dawn-300 px-4 py-3 dark:border-night-600 xl:hidden">
			<summary class="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.18em] text-dawn-700 dark:text-night-200">
				목차
			</summary>
			<div class="mt-4 border-t border-dawn-300 pt-4 dark:border-night-600">
				<TOC headings={headings} title="이 글의 흐름" ariaLabel="목차" />
			</div>
		</details>

		<PostHeader
			category={post.data.category}
			description={post.data.description}
			lang="ko"
			pubDate={post.data.pubDate}
			readingTimeMinutes={readingTimeMinutes}
			tags={post.data.tags ?? []}
			title={getDisplayTitle(post)}
		/>

		<PostSummary lang="ko" summary={post.data.summary} />

		<div class="prose-site mt-10 prose-headings:tracking-tight">
			<Content />
		</div>

		<PostReadingFlow lang="ko" series={seriesData} items={relatedItems} />

		<div class="mt-16 border-t border-dawn-300 pt-10 dark:border-night-600">
			<Comments lang="ko" />
		</div>

		<aside class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60">
			<div class="sticky top-24 border-l border-dawn-300 pl-6 dark:border-night-600">
				<TOC headings={headings} title="이 글의 흐름" ariaLabel="목차" />
			</div>
		</aside>
	</article>
```

Concrete summary of the changes vs. the prior structure:
- `<article class="mx-auto max-w-5xl" data-pagefind-body>` → `<article class="relative mx-auto max-w-3xl" data-pagefind-body>`
- `<div class="md:flex md:gap-16">` and `<div class="min-w-0 md:w-3/4">` wrappers — both removed; their children dissolve up to `<article>`.
- `<details ... md:hidden>` → `<details ... xl:hidden>` (one breakpoint token swap).
- `<aside class="hidden md:block md:w-1/4">` → `<aside class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60">` (entire class string changes).
- The aside is now positioned as the final child of `<article>` (after the comments div). Inside, `<div class="sticky top-24 border-l border-dawn-300 pl-6 dark:border-night-600">` and `<TOC headings={headings} title="이 글의 흐름" ariaLabel="목차" />` stay byte-identical.
- The closing tags `</div>` of the removed flex wrappers naturally drop with the structure rewrite.

The lines outside the article (`<Layout ...>`, `<ReadingProgress />`, `<CodeCopyButton />`, `<PostImageLightbox lang="ko" />`, `</Layout>`) are unchanged.

- [ ] **Step 4: Restructure `src/pages/en/posts/[...slug].astro` (EN)**

Replace lines 69-113 of `src/pages/en/posts/[...slug].astro` with the EN-locale equivalent. The structure is identical; only the locale-specific strings change (`summary` text, `<TOC>` `title` and `ariaLabel`, `lang="en"` props).

```astro
	<article
		class="relative mx-auto max-w-3xl"
		data-pagefind-body
	>
		<details class="mb-10 rounded-lg border border-dawn-300 px-4 py-3 dark:border-night-600 xl:hidden">
			<summary class="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.18em] text-dawn-700 dark:text-night-200">
				Table of contents
			</summary>
			<div class="mt-4 border-t border-dawn-300 pt-4 dark:border-night-600">
				<TOC headings={headings} title="Contents" ariaLabel="Table of contents" />
			</div>
		</details>

		<PostHeader
			category={post.data.category}
			description={post.data.description}
			lang="en"
			pubDate={post.data.pubDate}
			readingTimeMinutes={readingTimeMinutes}
			tags={post.data.tags ?? []}
			title={getDisplayTitle(post)}
		/>

		<PostSummary lang="en" summary={post.data.summary} />

		<div class="prose-site mt-10 prose-headings:tracking-tight">
			<Content />
		</div>

		<PostReadingFlow lang="en" series={seriesData} items={relatedItems} />

		<div class="mt-16 border-t border-dawn-300 pt-10 dark:border-night-600">
			<Comments lang="en" />
		</div>

		<aside class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60">
			<div class="sticky top-24 border-l border-dawn-300 pl-6 dark:border-night-600">
				<TOC headings={headings} title="Contents" ariaLabel="Table of contents" />
			</div>
		</aside>
	</article>
```

Locale-specific strings in the EN file (verified against `src/pages/en/posts/[...slug].astro` lines 75-110): `<summary>` text is `Table of contents`, `<TOC>` `title` is `Contents`, and `<TOC>` `ariaLabel` is `Table of contents`. The KO equivalents are `목차`, `이 글의 흐름`, `목차` respectively. The structure rewrite keeps every locale-specific string byte-identical — only positioning, classes, and breakpoints change.

- [ ] **Step 5: Run the regression test and the full suite to verify pass**

Run: `npm test`

Expected:
- The new test (`post detail pages center the body on viewport with TOC overhanging at xl:`) PASSES on both KO and EN files.
- Every other test in the suite (the existing render-based tests in `tests/post-detail-structure.test.mjs`, the typography tests, i18n tests, etc.) stays green. No regressions.

If any existing rendered-output test fails: the test likely asserts on something unrelated to the layout (data attributes, post header, summary, content, reading flow). Read the failing assertion and confirm whether the rendered HTML output actually changed in a way that breaks the assertion (very unlikely — the data attributes are on inner elements and the article wrapper around them is what changed). If it's a real regression, fix the article wrapper structure to preserve the data attributes; otherwise update the test if the assertion was incidental to the old wrapper shape.

- [ ] **Step 6: Manual visual verification**

Skip this step — subagents do not have browser access. Note in your report that visual verification is deferred to the controller. Do not spin up a dev server.

- [ ] **Step 7: Commit**

```bash
git add src/pages/posts/[...slug].astro src/pages/en/posts/[...slug].astro tests/post-detail-structure.test.mjs
git commit -m "$(cat <<'EOF'
style: center post body on viewport with TOC overhanging at xl:

Restructures the article element so the body wrapper is max-w-3xl
mx-auto (768px, dead-centered), and the TOC aside overhangs the
body's right edge via position: absolute; inset-y-0; left-full;
pl-4; w-60. Activates at xl: (1280px) and above; below xl: the
existing mobile pattern (single-column body + collapsible details
TOC at top) extends through the tablet / small-laptop band.

The Layout shell stays unchanged — the body wrapper inside is its
own max-w-3xl mx-auto, so body-on-viewport-center composes through
the shell, and the aside's absolute overhang escapes the shell via
the shell's default overflow: visible.

See docs/superpowers/specs/2026-05-10-post-detail-centered-layout-design.md.
EOF
)"
```

---

### Task 2: Update documentation

**Files:**
- Modify: `docs/spec-post-detail.md` (rewrite "Layout Change for Post Detail" section)
- Modify: `docs/spec-roadmap.md` (append one Current State bullet)

- [ ] **Step 1: Rewrite the "Layout Change for Post Detail" section in `docs/spec-post-detail.md`**

Open `docs/spec-post-detail.md` and locate the `Layout Change for Post Detail` block (currently around lines 68-76, the bullet block following the `Table of Contents Component` block). Replace the existing block:

```markdown
- **Layout Change for Post Detail**:
  - **Desktop (`md:` and above)**:
    - Use a 2-column layout.
    - Left column: shared header, article body, and post footer.
    - Right column: a sticky TOC rail with a left border and left padding.
  - **Mobile**:
    - Use a single-column layout.
    - Render the TOC above the article body in a native `<details>` / `<summary>` block.
    - Start the article body below the header with `mt-10` spacing.
```

With this new content:

```markdown
- **Layout Change for Post Detail**:
  - **Desktop (`xl:` and above, viewport ≥ 1280px)**:
    - Article body is dead-centered on the viewport via `<article class="relative mx-auto max-w-3xl" data-pagefind-body>` (768px max). The Layout shell (`src/layouts/Layout.astro`'s `max-w-4xl mx-auto`) stays in place; the body wrapper is its own narrower `mx-auto max-w-3xl`, so body-on-viewport-center composes correctly through the shell.
    - TOC overhangs the body's right edge as an absolutely-positioned satellite: `<aside class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60">` with the existing `<div class="sticky top-24 border-l border-dawn-300 pl-6 dark:border-night-600">` and `<TOC>` inside. `inset-y-0` stretches the aside to the article's full height so the sticky inner element scrolls with the entire article body.
    - The aside escapes the Layout shell's right edge horizontally via the shell's default `overflow: visible`.
  - **Below `xl:` (mobile, tablet, small laptop — viewport < 1280px)**:
    - Single-column body. The TOC renders above the article body in a native `<details>` / `<summary>` block carrying `xl:hidden` so it disappears at the desktop breakpoint.
    - Start the article body below the header with `mt-10` spacing.
  - **Wide figure corner case**: `figure[data-width="wide"]` (the `#wide` URL fragment) bleeds `-4rem` (-64px) on each side of the prose column. At `xl:` viewports with the TOC visible, the right-side bleed (body_right + 64) overlaps the TOC's gap-and-content range (body_right + 16 to body_right + 256) by ~48px. No current post uses `#wide`, so this is a future-content concern only. If a wide figure is added to a post that ships at `xl:`, options are: (a) reduce the right bleed to 0 at `xl:`, (b) hide the desktop TOC overhang on screens that contain wide figures, (c) reduce the bleed amount to fit the available space.
```

Concrete edit: use the Edit tool with the entire old bullet block (lines 68-76) as `old_string` and the new block as `new_string`.

- [ ] **Step 2: Append a Current State bullet to `docs/spec-roadmap.md`**

Open `docs/spec-roadmap.md` and locate the last bullet of the Current State section. The last bullet is currently:

```markdown
- Prose comfort bump landed: article body and matching reading-prose surfaces are now at 1.125rem — `prose-lg` on `.prose-site` for the article body, and `text-lg` on the description `<p>` elements in `PostList.astro`, `PostSummary.astro`, and the inline post lists on `src/pages/index.astro` and `src/pages/en/index.astro`. In-prose images that are narrower than their figure container also center now via `margin: 0 auto`, matching the figcaption that was already centered. UI chrome (eyebrows, dates, card titles, hero h1) stays at its existing sizes. See `docs/spec-theme-typography.md` and `docs/superpowers/specs/2026-05-10-prose-comfort-bump-design.md`.
```

Append one new bullet immediately after that one (still inside the Current State section, before the blank line that precedes `## Priority Areas`):

```markdown
- Post detail layout now centers the article body on the viewport with the TOC overhanging the body's right edge as an absolutely-positioned satellite at `xl:` (1280px) and above. Below `xl:`, the mobile pattern (single-column body + collapsible `<details>` TOC at top of article) extends up through the tablet / small-laptop band. Body width is `max-w-3xl` (768px) at all viewport widths the body fits in. The Layout shell stays unchanged. See `docs/spec-post-detail.md` and `docs/superpowers/specs/2026-05-10-post-detail-centered-layout-design.md`.
```

Concrete edit: use the Edit tool with the prose-comfort-bump bullet (the line ending in `2026-05-10-prose-comfort-bump-design.md`) as `old_string` and the same line plus a newline plus the new bullet as `new_string`. The single blank line separating Current State from `## Priority Areas` stays exactly where it is.

- [ ] **Step 3: Verify the doc edits with a quick read-back**

Run:

```bash
grep -n "xl:.*and above" docs/spec-post-detail.md
grep -n "Post detail layout now centers" docs/spec-roadmap.md
```

Expected output:
- One match in `docs/spec-post-detail.md` (the new "Desktop (`xl:` and above, …)" sub-bullet header).
- One match in `docs/spec-roadmap.md` (the new Current State bullet).

- [ ] **Step 4: Commit**

```bash
git add docs/spec-post-detail.md docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record post detail centered layout iteration

Rewrites the Layout Change for Post Detail section in
spec-post-detail to describe the new xl:-based desktop overhang
+ extended mobile pattern across the tablet/small-laptop band,
and notes the wide-figure / TOC-overhang corner case for future
authors. Appends a Current State bullet to spec-roadmap.

See docs/superpowers/specs/2026-05-10-post-detail-centered-layout-design.md.
EOF
)"
```
