# Post Figures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a figure/caption system for post body images. A small custom remark plugin promotes standalone markdown images into `<figure>` elements with a soft-frame visual treatment; every post migrates into a `slug/index.md` folder so images co-locate with their posts; one new example post (ko + en) acts as a coverage fixture that exercises figures, code blocks in three languages, links, inline code, and a blockquote on one page.

**Architecture:** Figure rendering is compile-time only. A single remark plugin (`src/utils/remarkPostFigure.ts`) transforms MDAST paragraph-with-single-image nodes into raw-HTML `<figure>` nodes. Width variants are signaled via a `#wide` URL fragment on the image src (stripped before emit). The plugin is wired into `astro.config.mjs`'s `markdown.remarkPlugins`. Styling lives in `src/styles/global.css` because the `data-width="wide"` attribute selector cannot be expressed through Tailwind's `prose-*:` utilities. Post IDs with a trailing `/index` segment are normalized at the `stripLocaleFromId` helper so URL generation stays identical between the old flat-file layout and the new folder layout.

**Tech Stack:** Astro 6, Tailwind CSS v4 + `@tailwindcss/typography`, Node's built-in test runner with `--experimental-strip-types`, `@astrojs/compiler` + `experimental_AstroContainer` for existing component tests, plain SVG for placeholder images. No new npm packages.

**Reference Spec:** `docs/superpowers/specs/2026-04-20-post-figures-design.md`.

---

## File Structure

### Create

- `src/utils/remarkPostFigure.ts` — the remark plugin.
- `tests/strip-locale-from-id.test.ts` — unit tests for the `/index` normalization update to `stripLocaleFromId`.
- `tests/remark-post-figure.test.ts` — unit tests for the plugin's four input cases plus edge cases (HTML escaping, whitespace-only text nodes around the image).
- `tests/post-figures-showcase.test.ts` — source-level assertions that the example posts include all four figure cases, three code-block languages, required links, and a blockquote.
- `src/content/blog/ko/iam-policy-checklist/index.md` — KO example post.
- `src/content/blog/ko/iam-policy-checklist/iam-policies-list.svg` — column figure mock.
- `src/content/blog/ko/iam-policy-checklist/iam-console-overview.svg` — wide figure mock.
- `src/content/blog/ko/iam-policy-checklist/spacer.svg` — decorative empty-alt mock.
- `src/content/blog/ko/iam-policy-checklist/cursor.svg` — inline image mock.
- `src/content/blog/en/iam-policy-checklist/index.md` — EN example post (parallel structure).
- `src/content/blog/en/iam-policy-checklist/{iam-policies-list,iam-console-overview,spacer,cursor}.svg` — same mock SVG files, duplicated for the EN locale.

### Modify

- `src/utils/blog.ts` — extend `stripLocaleFromId` to strip a trailing `/index` segment so `ko/first-post/index` → `first-post` (same URL as the old `ko/first-post` flat-file ID).
- `astro.config.mjs` — import and register the remark plugin under `markdown.remarkPlugins`.
- `src/styles/global.css` — append figure-and-figcaption prose styles plus the wide-variant media-query rule.
- `docs/spec-post-detail.md` — append a Figures section.
- `docs/spec-roadmap.md` — move the figure handling sub-area of item 3 into Current Status; add a Current State bullet.

### Rename (21 posts)

- KO (11): `src/content/blog/ko/{first-post,long-scroll-test,mpc-notes,operating-small-systems,quiet-builds,routing-story-finish,routing-story-middle,routing-story-start,routing-with-clarity,service-boundaries,writing-for-operators}.md` → `src/content/blog/ko/<slug>/index.md`.
- EN (10): `src/content/blog/en/{first-post,mpc-notes,operating-small-systems,quiet-builds,routing-story-finish,routing-story-middle,routing-story-start,routing-with-clarity,service-boundaries,writing-for-operators}.md` → `src/content/blog/en/<slug>/index.md`.

No content changes inside the renamed files.

---

## Tasks

### Task 1: Normalize `stripLocaleFromId` for folder-form post IDs

This is the defensive first step. Astro's `glob()` content loader derives a post's `id` from the file path relative to the collection base, minus the extension. For flat-file posts, `blog/ko/first-post.md` produces id `ko/first-post`. For folder-form posts, `blog/ko/first-post/index.md` produces id `ko/first-post/index`. The existing `stripLocaleFromId` helper feeds URL generation; if we do not strip the trailing `/index`, every migrated post's URL becomes `/posts/<slug>/index` instead of `/posts/<slug>`, breaking the site.

Update the helper **before** the migration so the bulk rename in Task 3 lands on top of a URL-stable foundation.

**Files:**

- Create: `tests/strip-locale-from-id.test.ts`
- Modify: `src/utils/blog.ts`

- [ ] **Step 1: Write failing unit tests for the new behavior**

Create `tests/strip-locale-from-id.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { stripLocaleFromId } from "../src/utils/blog.ts";

test("stripLocaleFromId strips the locale prefix for flat-file post IDs", () => {
	assert.equal(stripLocaleFromId("ko/first-post"), "first-post");
	assert.equal(stripLocaleFromId("en/first-post"), "first-post");
});

test("stripLocaleFromId strips the locale prefix AND a trailing /index for folder-form post IDs", () => {
	assert.equal(stripLocaleFromId("ko/first-post/index"), "first-post");
	assert.equal(stripLocaleFromId("en/first-post/index"), "first-post");
});

test("stripLocaleFromId preserves multi-segment slugs and only strips /index at the end", () => {
	assert.equal(stripLocaleFromId("ko/guides/routing"), "guides/routing");
	assert.equal(stripLocaleFromId("ko/guides/routing/index"), "guides/routing");
});

test("stripLocaleFromId does not strip index when it appears mid-slug", () => {
	assert.equal(stripLocaleFromId("ko/index-of-things"), "index-of-things");
	assert.equal(stripLocaleFromId("ko/index/other"), "index/other");
});
```

- [ ] **Step 2: Run the new tests and confirm they fail where expected**

Run: `npm test -- tests/strip-locale-from-id.test.ts`
Expected: the "flat-file post IDs" test and the "index mid-slug" test pass on the existing implementation; the two tests that involve a trailing `/index` fail because the current helper does not strip it.

- [ ] **Step 3: Update `stripLocaleFromId`**

Open `src/utils/blog.ts`. Find this block:

```ts
export const stripLocaleFromId = (id: string) =>
	id.split("/").slice(1).join("/");
```

Replace with:

```ts
export const stripLocaleFromId = (id: string) =>
	id
		.split("/")
		.slice(1)
		.join("/")
		.replace(/\/index$/, "");
```

The trailing `.replace(/\/index$/, "")` only matches an `/index` segment at the very end of the string, which is exactly what Astro produces for `<slug>/index.md` posts. It does not touch `index-of-things` (no `/` before `index`) or `index/other` (not at the end).

- [ ] **Step 4: Run the new tests and confirm they pass**

Run: `npm test -- tests/strip-locale-from-id.test.ts`
Expected: all four tests pass.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: pass count grows by 4 relative to the baseline. No regressions. This matters because `stripLocaleFromId` is called from `src/pages/posts/[...slug].astro`, `src/pages/en/posts/[...slug].astro`, `src/pages/index.astro`, `src/pages/en/index.astro`, and `src/components/PostList.astro`; any pre-existing test over those surfaces must still be green.

- [ ] **Step 6: Commit**

```bash
git add src/utils/blog.ts tests/strip-locale-from-id.test.ts
git commit -m "$(cat <<'EOF'
feat: strip trailing /index in stripLocaleFromId

Extends stripLocaleFromId so IDs coming from folder-form posts
(blog/<locale>/<slug>/index.md → id <locale>/<slug>/index) produce
the same URL slug as their flat-file equivalents (id <locale>/<slug>).
This is a precondition for the upcoming post directory migration: it
lets every post URL stay stable regardless of whether the post is
stored as a flat .md file or as a folder with index.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Canary-verify the folder-form post layout

Create a throwaway `slug/index.md` post, confirm its URL matches `dist/posts/<slug>/index.html`, and delete. No commit — this is a pure verification gate. If the canary URL comes out wrong, halt the plan and ping the user before proceeding.

**Files:** none permanent.

- [ ] **Step 1: Create a canary post**

Write `src/content/blog/ko/canary-figure-migration/index.md`:

```markdown
---
title: "Canary"
pubDate: 2026-01-01
description: "Canary post for slug behavior verification."
category: "Essay"
---

Canary body.
```

- [ ] **Step 2: Build the site**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Check the generated URL**

Run:

```bash
ls dist/posts/canary-figure-migration/
```

Expected output (order may vary): a line containing `index.html`. The `index.html` is what matters; pagefind-generated assets alongside it are fine.

If instead the output shows `dist/posts/canary-figure-migration/index/index.html` or any other path that is NOT `dist/posts/canary-figure-migration/index.html`, halt the plan. That result means the Task 1 normalization is insufficient, and the spec's assumption about the migration layout must be revisited with the user.

- [ ] **Step 4: Delete the canary**

```bash
rm -rf src/content/blog/ko/canary-figure-migration
```

- [ ] **Step 5: Confirm clean working tree**

Run: `git status`
Expected: the only unstaged changes are anything that was already unstaged before Task 2 started. No new files. No untracked directories under `src/content/blog/ko/`.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all tests pass. This is a sanity check that removing the canary also returns the collection to its pre-canary state.

Do NOT commit anything in this task.

---

### Task 3: Migrate all 21 existing posts to folder-form

Pure rename — no content changes. One commit.

**Files:**

- Rename (KO, 11 files): every post in `src/content/blog/ko/*.md` moves to `src/content/blog/ko/<slug>/index.md`.
- Rename (EN, 10 files): every post in `src/content/blog/en/*.md` moves to `src/content/blog/en/<slug>/index.md`.

- [ ] **Step 1: Migrate KO posts**

Run:

```bash
cd src/content/blog/ko
for f in *.md; do
  slug="${f%.md}"
  mkdir "$slug"
  git mv "$f" "$slug/index.md"
done
cd -
```

Expected: 11 files renamed, 11 new folders created. Git recognizes each as a rename so blame history is preserved.

- [ ] **Step 2: Migrate EN posts**

Run:

```bash
cd src/content/blog/en
for f in *.md; do
  slug="${f%.md}"
  mkdir "$slug"
  git mv "$f" "$slug/index.md"
done
cd -
```

Expected: 10 files renamed.

- [ ] **Step 3: Verify structure**

Run:

```bash
ls -1 src/content/blog/ko
ls -1 src/content/blog/en
```

Expected: every listed entry is a directory name (no `.md` file remains at the top of either locale). Then spot-check one folder:

```bash
ls src/content/blog/ko/first-post
```

Expected: `index.md`.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

If any test fails because a test fixture hard-codes a flat-file post path (for example, reads `src/content/blog/ko/<slug>.md` directly), update the test's path to `src/content/blog/ko/<slug>/index.md` and re-run. Do not change what the test asserts; only update the file path. If no tests read real post files, this step is a no-op.

- [ ] **Step 5: Build the site**

Run: `npm run build`
Expected: build succeeds. Spot-check two URLs to confirm they still resolve:

```bash
test -f dist/posts/first-post/index.html && echo "KO first-post OK"
test -f dist/en/posts/first-post/index.html && echo "EN first-post OK"
```

Expected: both lines print the OK message.

- [ ] **Step 6: Commit**

```bash
git add src/content/blog
git commit -m "$(cat <<'EOF'
chore: migrate all posts to slug/index.md folder form

Converts every post from blog/<locale>/<slug>.md to
blog/<locale>/<slug>/index.md so images can be co-located with
their posts in a consistent structure. Post contents and URLs are
unchanged; this is a pure rename on top of the earlier
stripLocaleFromId normalization that keeps URL derivation stable
across both layouts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Build the `remarkPostFigure` plugin with TDD

**Files:**

- Create: `tests/remark-post-figure.test.ts`
- Create: `src/utils/remarkPostFigure.ts`

- [ ] **Step 1: Write failing unit tests**

Create `tests/remark-post-figure.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import remarkPostFigure from "../src/utils/remarkPostFigure.ts";

type MdastNode = { type: string; [key: string]: unknown };

function makeTree(children: MdastNode[]) {
	return { type: "root", children } as { type: "root"; children: MdastNode[] };
}

function makeParagraph(children: MdastNode[]): MdastNode {
	return { type: "paragraph", children };
}

function makeImage(url: string, alt: string): MdastNode {
	return { type: "image", url, alt };
}

function makeText(value: string): MdastNode {
	return { type: "text", value };
}

test("standalone image with non-empty alt becomes a column figure", () => {
	const tree = makeTree([makeParagraph([makeImage("./iam.png", "Step 2: policy form")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, "html");
	const html = tree.children[0].value as string;
	assert.match(html, /^<figure>/);
	assert.match(html, /<img src="\.\/iam\.png" alt="Step 2: policy form">/);
	assert.match(html, /<figcaption>Step 2: policy form<\/figcaption>/);
	assert.doesNotMatch(html, /data-width/);
});

test("standalone image with #wide fragment becomes a wide figure with fragment stripped", () => {
	const tree = makeTree([makeParagraph([makeImage("./console.png#wide", "Full IAM console")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "html");
	const html = tree.children[0].value as string;
	assert.match(html, /^<figure data-width="wide">/);
	assert.match(html, /<img src="\.\/console\.png" alt="Full IAM console">/);
	assert.doesNotMatch(html, /#wide/);
	assert.match(html, /<figcaption>Full IAM console<\/figcaption>/);
});

test("standalone image with empty alt becomes a bare decorative img (no figure, no figcaption)", () => {
	const tree = makeTree([makeParagraph([makeImage("./spacer.svg", "")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "html");
	const html = tree.children[0].value as string;
	assert.equal(html, '<img src="./spacer.svg" alt="">');
});

test("inline image that shares a paragraph with other content is left untouched", () => {
	const tree = makeTree([
		makeParagraph([
			makeText("Click "),
			makeImage("./cursor.svg", "cursor"),
			makeText(" here."),
		]),
	]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "paragraph");
	const paragraph = tree.children[0] as unknown as { children: MdastNode[] };
	assert.equal(paragraph.children.length, 3);
	assert.equal(paragraph.children[1].type, "image");
	assert.equal((paragraph.children[1] as { url: string }).url, "./cursor.svg");
});

test("alt text with HTML-significant characters is escaped in both alt and figcaption", () => {
	const tree = makeTree([makeParagraph([makeImage("./img.png", 'Tag <script> & "quote"')])]);
	const transform = remarkPostFigure();
	transform(tree);

	const html = tree.children[0].value as string;
	assert.match(
		html,
		/<img src="\.\/img\.png" alt="Tag &lt;script&gt; &amp; &quot;quote&quot;">/,
	);
	assert.match(
		html,
		/<figcaption>Tag &lt;script&gt; &amp; &quot;quote&quot;<\/figcaption>/,
	);
});

test("whitespace text nodes around a single image in a paragraph do not block promotion", () => {
	const tree = makeTree([
		makeParagraph([makeText("  "), makeImage("./iam.png", "alt"), makeText("\n")]),
	]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "html");
	const html = tree.children[0].value as string;
	assert.match(html, /^<figure>/);
	assert.match(html, /<figcaption>alt<\/figcaption>/);
});

test("paragraph with two images is left as-is because it is not the single-image pattern", () => {
	const tree = makeTree([
		makeParagraph([makeImage("./a.png", "a"), makeImage("./b.png", "b")]),
	]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "paragraph");
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- tests/remark-post-figure.test.ts`
Expected: all seven tests fail because `src/utils/remarkPostFigure.ts` does not exist yet.

- [ ] **Step 3: Implement the plugin**

Create `src/utils/remarkPostFigure.ts`:

```ts
interface MdastNode {
	type: string;
	[key: string]: unknown;
}

interface ParagraphLike extends MdastNode {
	type: "paragraph";
	children: MdastNode[];
}

interface ImageLike extends MdastNode {
	type: "image";
	url: string;
	alt: string | null;
}

interface RootLike extends MdastNode {
	type: "root";
	children: MdastNode[];
}

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

function isWhitespaceText(node: MdastNode): boolean {
	if (node.type !== "text") return false;
	const value = (node as { value?: unknown }).value;
	return typeof value === "string" && /^\s*$/.test(value);
}

function findSoleImage(paragraph: ParagraphLike): ImageLike | null {
	let image: ImageLike | null = null;
	for (const child of paragraph.children) {
		if (isWhitespaceText(child)) continue;
		if (child.type === "image" && image === null) {
			image = child as ImageLike;
			continue;
		}
		return null;
	}
	return image;
}

function renderDecorative(src: string): string {
	return `<img src="${escapeHtml(src)}" alt="">`;
}

function renderFigure(src: string, alt: string, isWide: boolean): string {
	const attrs = isWide ? ' data-width="wide"' : "";
	const safeSrc = escapeHtml(src);
	const safeAlt = escapeHtml(alt);
	return `<figure${attrs}><img src="${safeSrc}" alt="${safeAlt}"><figcaption>${safeAlt}</figcaption></figure>`;
}

export default function remarkPostFigure() {
	return function transform(tree: RootLike): void {
		const children = tree.children;
		for (let i = 0; i < children.length; i += 1) {
			const node = children[i];
			if (node.type !== "paragraph") continue;
			const image = findSoleImage(node as ParagraphLike);
			if (image === null) continue;

			const alt = typeof image.alt === "string" ? image.alt : "";
			const rawUrl = typeof image.url === "string" ? image.url : "";

			let url = rawUrl;
			let isWide = false;
			const hashIndex = rawUrl.indexOf("#");
			if (hashIndex !== -1) {
				const fragment = rawUrl.slice(hashIndex + 1);
				if (fragment === "wide") {
					isWide = true;
					url = rawUrl.slice(0, hashIndex);
				}
			}

			const value = alt === "" ? renderDecorative(url) : renderFigure(url, alt, isWide);

			children[i] = {
				type: "html",
				value,
			};
		}
	};
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- tests/remark-post-figure.test.ts`
Expected: all seven tests pass.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: pass count grows by 7 relative to the Task 3 baseline. No regressions.

- [ ] **Step 6: Commit**

```bash
git add src/utils/remarkPostFigure.ts tests/remark-post-figure.test.ts
git commit -m "$(cat <<'EOF'
feat: add remarkPostFigure plugin for figure promotion

Adds a small remark plugin that walks the MDAST tree and promotes
any paragraph whose sole child is an image into a <figure> element,
using the image's alt text as both the img alt attribute and the
figcaption content. Width variants are signaled via a #wide
fragment on the image url, which is stripped from the emitted src.
Empty-alt images are treated as decorative and render as bare
<img alt=""> with no figure wrapping. Inline images that share a
paragraph with other content are left untouched. HTML-significant
characters in alt text are escaped.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire the plugin into `astro.config.mjs`

**Files:**

- Modify: `astro.config.mjs`

- [ ] **Step 1: Replace `astro.config.mjs` contents**

Overwrite `astro.config.mjs` with:

```js
// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkPostFigure from "./src/utils/remarkPostFigure.ts";

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    remarkPlugins: [remarkPostFigure],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://sings.dev",
  integrations: [sitemap()],
});
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests still pass. The plugin is now registered but no post uses images yet, so site output is unchanged.

- [ ] **Step 3: Build the site and spot-check**

Run: `npm run build`
Expected: build succeeds.

Run:

```bash
grep -r "<figure" dist/posts 2>/dev/null | wc -l
```

Expected: `0`. No existing post contains images yet; the plugin only takes effect once a post uses a standalone markdown image, which will happen in Task 8.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "$(cat <<'EOF'
feat: wire remarkPostFigure into Astro markdown pipeline

Adds markdown.remarkPlugins to astro.config.mjs so the new figure
plugin runs on every post at build time. Existing posts have no
images so the behavior of the site is unchanged; the plugin only
takes effect once a post uses a standalone markdown image.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Add figure CSS to `src/styles/global.css`

**Files:**

- Modify: `src/styles/global.css`

- [ ] **Step 1: Rewrite `global.css`**

Overwrite `src/styles/global.css` with:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@plugin "@tailwindcss/typography";

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
	border-color: rgb(41 37 36 / 1); /* stone-800 */
}
.prose figcaption {
	margin-top: 0.75rem;
	font-size: 0.875rem;
	font-style: italic;
	text-align: center;
	color: rgb(120 113 108 / 1); /* stone-500 */
}
:where(.dark) .prose figcaption {
	color: rgb(168 162 158 / 1); /* stone-400 */
}
@media (min-width: 768px) {
	.prose figure[data-width="wide"] {
		margin-left: -4rem;
		margin-right: -4rem;
	}
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass. CSS changes do not affect the HTML/JS tests.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds. The new CSS rules are compiled into the production stylesheet (no further verification needed at this stage — figures are visually exercised in the self-review checklist at the end of the plan).

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "$(cat <<'EOF'
feat: add figure and figcaption prose styles

Appends a small block to global.css targeting .prose figure, img,
figcaption, and figure[data-width="wide"]. Produces the soft-frame
treatment specified in the design: 1px stone-200 / stone-800 border,
6px radius, italic centered stone-500 / stone-400 caption, and an
md:-mx-16 bleed for wide figures that falls back to column width
below md. The rules live in global.css because Tailwind's prose-*:
utilities cannot express the data-width attribute selector.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Add mock SVG images for the example post

Four placeholder SVGs live in both locales' example-post folders. Each SVG is authored identically in both folders so the KO and EN posts reference the same visual content with locale-aware captions.

**Files:**

- Create: `src/content/blog/ko/iam-policy-checklist/iam-policies-list.svg`
- Create: `src/content/blog/ko/iam-policy-checklist/iam-console-overview.svg`
- Create: `src/content/blog/ko/iam-policy-checklist/spacer.svg`
- Create: `src/content/blog/ko/iam-policy-checklist/cursor.svg`
- Create: `src/content/blog/en/iam-policy-checklist/iam-policies-list.svg`
- Create: `src/content/blog/en/iam-policy-checklist/iam-console-overview.svg`
- Create: `src/content/blog/en/iam-policy-checklist/spacer.svg`
- Create: `src/content/blog/en/iam-policy-checklist/cursor.svg`

- [ ] **Step 1: Write `iam-policies-list.svg` to both locales**

Write the file content below to BOTH:

- `src/content/blog/ko/iam-policy-checklist/iam-policies-list.svg`
- `src/content/blog/en/iam-policy-checklist/iam-policies-list.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" role="img">
	<rect width="800" height="400" fill="#e7e5e4"/>
	<rect x="0" y="0" width="800" height="48" fill="#232f3e"/>
	<rect x="12" y="14" width="20" height="20" fill="#ff9900"/>
	<text x="44" y="30" font-family="sans-serif" font-size="14" fill="#ffffff">AWS IAM · Policies</text>
	<text x="400" y="220" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#44403c">Policies list (mock)</text>
	<text x="400" y="252" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#78716c">Placeholder for a real console capture</text>
</svg>
```

- [ ] **Step 2: Write `iam-console-overview.svg` to both locales**

Write the file content below to BOTH:

- `src/content/blog/ko/iam-policy-checklist/iam-console-overview.svg`
- `src/content/blog/en/iam-policy-checklist/iam-console-overview.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500" role="img">
	<rect width="1200" height="500" fill="#e7e5e4"/>
	<rect x="0" y="0" width="1200" height="48" fill="#232f3e"/>
	<rect x="12" y="14" width="20" height="20" fill="#ff9900"/>
	<text x="44" y="30" font-family="sans-serif" font-size="14" fill="#ffffff">AWS IAM · Create Policy</text>
	<rect x="0" y="48" width="220" height="452" fill="#1a2332"/>
	<text x="110" y="100" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#d6d3d1">Sidebar</text>
	<text x="710" y="270" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#44403c">Full console view (mock)</text>
	<text x="710" y="306" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#78716c">Wide variant: sidebar + main panel</text>
</svg>
```

- [ ] **Step 3: Write `spacer.svg` to both locales**

Write the file content below to BOTH:

- `src/content/blog/ko/iam-policy-checklist/spacer.svg`
- `src/content/blog/en/iam-policy-checklist/spacer.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 20" role="presentation">
	<rect width="400" height="20" fill="#e7e5e4"/>
</svg>
```

- [ ] **Step 4: Write `cursor.svg` to both locales**

Write the file content below to BOTH:

- `src/content/blog/ko/iam-policy-checklist/cursor.svg`
- `src/content/blog/en/iam-policy-checklist/cursor.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img">
	<path d="M4 2 L4 20 L9 15 L12 22 L15 20 L12 13 L19 13 Z" fill="#44403c"/>
</svg>
```

- [ ] **Step 5: Verify structure**

Run:

```bash
ls -1 src/content/blog/ko/iam-policy-checklist
ls -1 src/content/blog/en/iam-policy-checklist
```

Expected: each listing shows exactly four `.svg` files — `cursor.svg`, `iam-console-overview.svg`, `iam-policies-list.svg`, `spacer.svg` — and no other files yet (the `index.md` posts come in Tasks 8 and 9).

- [ ] **Step 6: Commit**

```bash
git add src/content/blog/ko/iam-policy-checklist src/content/blog/en/iam-policy-checklist
git commit -m "$(cat <<'EOF'
feat: add mock SVG images for post figures showcase

Adds four placeholder SVGs in both locales' iam-policy-checklist
folders: a column-width AWS policies list mock, a wide console
overview mock, a thin decorative spacer, and a small cursor for the
inline-image case. These are stand-ins that exercise the figure
system without requiring real AWS captures; the author can swap
them for real screenshots later without touching any other code.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Author the KO example post

**Files:**

- Create: `src/content/blog/ko/iam-policy-checklist/index.md`

- [ ] **Step 1: Write the KO example post**

Create `src/content/blog/ko/iam-policy-checklist/index.md`:

````markdown
---
title: "IAM 정책 만들 때 챙길 세 가지"
pubDate: 2026-04-20
description: "AWS IAM 콘솔에서 정책을 만들 때 놓치기 쉬운 세 가지를 짧게 정리합니다."
category: "Development"
tags:
  - aws
  - iam
  - infrastructure
---

AWS에서 새 정책을 만들 때, 콘솔 UI만 따라가면 실수하기 쉬운 지점이 몇 군데 있습니다. 이 글에서는 실무에서 자주 놓치는 세 가지를 기록해 둡니다. 라우팅 경계에 관한 이야기는 [다른 글](/posts/routing-with-clarity/)에서 다뤘습니다.

## 1. 정책 목록부터 확인하기

콘솔 왼쪽의 **Policies** 메뉴에서 기존 정책들을 먼저 훑어보면, 이미 누군가가 비슷한 것을 만들어 두었는지 알 수 있습니다.

![IAM 콘솔의 Policies 목록](./iam-policies-list.svg)

비슷한 정책이 있다면 복제해서 수정하는 쪽이 `CreatePolicy`를 처음부터 작성하는 것보다 안전합니다.

## 2. JSON 에디터로 전환하기

Visual 에디터는 권한을 빠르게 찍을 때는 편하지만, 조건(Condition) 블록이 복잡해지면 JSON이 훨씬 읽기 쉽습니다.

![IAM 콘솔의 정책 생성 전체 화면](./iam-console-overview.svg#wide)

예시 정책 문서:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceVpc": "vpc-12345678"
        }
      }
    }
  ]
}
```

CLI로 같은 일을 하려면 다음처럼 씁니다:

```bash
aws iam create-policy \
  --policy-name AllowS3ReadFromVpc \
  --policy-document file://policy.json
```

> 팁: 정책을 먼저 **dry-run** 하거나 로컬에서 `aws iam simulate-custom-policy` 로 검증해 두면 프로덕션에서 거절 로그를 보는 일이 줄어듭니다.

![](./spacer.svg)

## 3. SDK에서 재사용할 수 있게 ARN을 기록해 두기

생성된 정책의 ARN은 나중에 역할(role)에 붙일 때 반드시 필요합니다. CDK에서는 이렇게 참조합니다:

```typescript
import { aws_iam as iam } from "aws-cdk-lib";

const readOnly = iam.ManagedPolicy.fromManagedPolicyArn(
  this,
  "ReadOnlyFromVpc",
  "arn:aws:iam::123456789012:policy/AllowS3ReadFromVpc",
);

const role = new iam.Role(this, "WorkerRole", {
  assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  managedPolicies: [readOnly],
});
```

필요한 값을 클릭 ![cursor](./cursor.svg) 으로 찾는 것보다, 처음부터 ARN을 메모해 두는 쪽이 다음 작업을 빠르게 만듭니다.

자세한 필드 설명은 [AWS IAM 정책 문법 공식 문서](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html)를 확인하세요.
````

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Build and spot-check the KO output**

Run: `npm run build`
Expected: build succeeds. Then:

```bash
grep -o "<figure[^>]*>" dist/posts/iam-policy-checklist/index.html
```

Expected output has exactly two lines: one `<figure>` (plain column) and one `<figure data-width="wide">`.

```bash
grep -o 'src="[^"]*spacer\.svg"[^>]*alt=""' dist/posts/iam-policy-checklist/index.html
```

Expected: one match for the decorative spacer.

```bash
grep -c "#wide" dist/posts/iam-policy-checklist/index.html
```

Expected: `0`. The fragment has been stripped by the plugin.

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/ko/iam-policy-checklist/index.md
git commit -m "$(cat <<'EOF'
feat: add KO iam-policy-checklist example post

Adds the KO version of the figure-system coverage fixture. The post
is a short three-section practical reference that exercises every
case the figure pipeline should handle: a captioned column figure,
a captioned wide figure, an empty-alt decorative image, and an
inline image mid-sentence. It also carries three code blocks (json,
bash, typescript), an external link, an internal cross-link, a
blockquote, and inline code so reviewers can judge how all
in-prose elements look together on a single page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Author the EN example post

**Files:**

- Create: `src/content/blog/en/iam-policy-checklist/index.md`

- [ ] **Step 1: Write the EN example post**

Create `src/content/blog/en/iam-policy-checklist/index.md`:

````markdown
---
title: "Three things to check when creating an IAM policy"
pubDate: 2026-04-20
description: "Short notes on the three things that are easiest to miss when creating an IAM policy from the AWS console."
category: "Development"
tags:
  - aws
  - iam
  - infrastructure
---

When you create a new policy in AWS, following the console UI step by step is easy to get wrong. These are the three details I most often miss in practice, written down so I can stop tripping over them. A related routing-structure discussion lives in [this earlier post](/en/posts/routing-with-clarity/).

## 1. Look at the Policies list first

The **Policies** menu in the console's left sidebar lists every existing policy. Scanning the list first tells you whether someone has already made something close to what you need.

![The Policies list inside the IAM console](./iam-policies-list.svg)

If a similar policy exists, cloning and editing it is safer than writing `CreatePolicy` from scratch.

## 2. Switch to the JSON editor

The Visual editor is great for quickly picking actions, but once the `Condition` block gets complex, JSON is much easier to read.

![The IAM Create Policy console with the form open](./iam-console-overview.svg#wide)

An example policy document:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceVpc": "vpc-12345678"
        }
      }
    }
  ]
}
```

Same thing from the CLI:

```bash
aws iam create-policy \
  --policy-name AllowS3ReadFromVpc \
  --policy-document file://policy.json
```

> Tip: dry-running the policy or validating it locally with `aws iam simulate-custom-policy` removes a lot of "denied" lines from production logs later.

![](./spacer.svg)

## 3. Write the ARN down so your SDK can reuse it

The ARN of the new policy is what you will reach for when you attach it to a role. In CDK:

```typescript
import { aws_iam as iam } from "aws-cdk-lib";

const readOnly = iam.ManagedPolicy.fromManagedPolicyArn(
  this,
  "ReadOnlyFromVpc",
  "arn:aws:iam::123456789012:policy/AllowS3ReadFromVpc",
);

const role = new iam.Role(this, "WorkerRole", {
  assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  managedPolicies: [readOnly],
});
```

Finding the right values by clicking ![cursor](./cursor.svg) through the console is slower than writing the ARN down once up front.

For the full field reference, see the [AWS IAM policy grammar documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html).
````

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Build and spot-check the EN output**

Run: `npm run build`
Expected: build succeeds. Then:

```bash
grep -o "<figure[^>]*>" dist/en/posts/iam-policy-checklist/index.html
```

Expected: two lines — one `<figure>` and one `<figure data-width="wide">`.

```bash
grep -c "#wide" dist/en/posts/iam-policy-checklist/index.html
```

Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/en/iam-policy-checklist/index.md
git commit -m "$(cat <<'EOF'
feat: add EN iam-policy-checklist example post

Adds the EN parallel of the KO figure-system fixture with matching
structure: same three sections, same four figure cases, same three
code-block languages, an external link to the AWS policy grammar
documentation, an internal cross-link, a blockquote, and inline
code. Keeping both locales in lockstep makes it easy to verify that
the figure pipeline behaves identically regardless of the source
language.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Source-level integration test for the example posts

The test reads the KO and EN example-post markdown files and asserts the coverage matrix is intact (four figure shapes, three code languages, the required links, a blockquote). The end-to-end build output is verified manually as part of the self-review checklist because generating the built HTML before running the test would make the test fragile against stale `dist/` state.

**Files:**

- Create: `tests/post-figures-showcase.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/post-figures-showcase.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const LOCALES = [
	{ lang: "ko", path: "../src/content/blog/ko/iam-policy-checklist/index.md" },
	{ lang: "en", path: "../src/content/blog/en/iam-policy-checklist/index.md" },
] as const;

for (const { lang, path } of LOCALES) {
	test(`iam-policy-checklist (${lang}) body includes all four figure cases in the source markdown`, async () => {
		const source = await readFile(new URL(path, import.meta.url), "utf8");

		// Column captioned figure: non-empty alt, no fragment.
		assert.match(source, /!\[[^\]\n]+\]\(\.\/iam-policies-list\.svg\)/);

		// Wide captioned figure: non-empty alt, #wide fragment.
		assert.match(source, /!\[[^\]\n]+\]\(\.\/iam-console-overview\.svg#wide\)/);

		// Decorative empty-alt image.
		assert.match(source, /!\[\]\(\.\/spacer\.svg\)/);

		// Inline image: at least one non-newline character on each side of the image syntax.
		assert.match(source, /[^\n]!\[[^\]\n]*\]\(\.\/cursor\.svg\)[^\n]/);
	});

	test(`iam-policy-checklist (${lang}) source includes json, bash, and typescript code blocks`, async () => {
		const source = await readFile(new URL(path, import.meta.url), "utf8");
		assert.match(source, /```json\n/);
		assert.match(source, /```bash\n/);
		assert.match(source, /```typescript\n/);
	});

	test(`iam-policy-checklist (${lang}) source includes an external link, an internal link, and a blockquote`, async () => {
		const source = await readFile(new URL(path, import.meta.url), "utf8");
		assert.match(source, /\]\(https:\/\/docs\.aws\.amazon\.com\//);
		const internalLinkPattern = lang === "ko" ? /\]\(\/posts\// : /\]\(\/en\/posts\//;
		assert.match(source, internalLinkPattern);
		assert.match(source, /^> /m);
	});
}
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- tests/post-figures-showcase.test.ts`
Expected: all six tests pass (three checks × two locales).

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: pass count grows by 6 relative to the Task 9 baseline. No regressions.

- [ ] **Step 4: Commit**

```bash
git add tests/post-figures-showcase.test.ts
git commit -m "$(cat <<'EOF'
test: cover iam-policy-checklist source coverage matrix

Adds source-level assertions that the example posts in both locales
include all four figure cases the plugin handles (column, wide,
decorative empty-alt, inline), all three code-block languages
specified in the design (json, bash, typescript), an external link
to AWS documentation, an internal cross-link, and a blockquote.
End-to-end HTML verification lives in the plan's self-review
checklist rather than in automated tests so we do not couple test
runs to the freshness of the dist/ output.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Document figures in `docs/spec-post-detail.md`

**Files:**

- Modify: `docs/spec-post-detail.md`

- [ ] **Step 1: Append the Figures section**

Open `docs/spec-post-detail.md`. Append the following block to the end of the file (after the existing `Layout Change for Post Detail` bullets):

```markdown

## Figures in Post Bodies

- **Authoring convention**:
  - `![caption text](./image.png)` on its own line renders as a `<figure>` with the caption text used as both the `alt` attribute and the `<figcaption>` content.
  - `![caption text](./image.png#wide)` renders the same figure but with `data-width="wide"`, which at `md:` and up bleeds roughly 64px outside the prose column on each side. Below `md:` the figure falls back to column width.
  - `![](./image.png)` (empty alt) renders a bare decorative `<img alt="">` with no `<figure>` wrapping and no caption.
  - An image that shares a paragraph with other text (an inline image) is left untouched and stays inside that paragraph.
- **File layout**:
  - Every post lives as `src/content/blog/<locale>/<slug>/index.md`.
  - Images for a post live in the same folder as `index.md`, referenced with relative paths like `./image.png` from the post body.
- **Visual treatment**:
  - Images get a 1px `stone-200` (light) / `stone-800` (dark) border and a 6px radius. No shadow, no background tint.
  - Captions are italic, `text-sm`, center-aligned, with `stone-500` (light) / `stone-400` (dark) text.
  - Dark mode does not invert or dim the image itself — the frame alone handles contrast.
- **Implementation location**:
  - The authoring-to-HTML transformation happens in `src/utils/remarkPostFigure.ts`, wired in through `astro.config.mjs`'s `markdown.remarkPlugins`.
  - The visual rules live in `src/styles/global.css` as `.prose figure`, `.prose figure img`, `.prose figcaption`, and `.prose figure[data-width="wide"]`.
  - Post ID normalization for folder-form posts happens in `stripLocaleFromId` (`src/utils/blog.ts`), which strips the trailing `/index` segment so URLs stay the same as the flat-file layout.
```

- [ ] **Step 2: Commit**

```bash
git add docs/spec-post-detail.md
git commit -m "$(cat <<'EOF'
docs: document figure authoring and visual treatment in post-detail spec

Appends a Figures in Post Bodies section to the post detail SSOT
describing the authoring convention (alt doubles as caption, #wide
fragment triggers the wide variant, empty alt stays decorative,
inline images stay inline), the file layout rule (each post is a
folder and images live next to index.md), the visual treatment
(soft frame, italic centered caption, no image recoloring in dark
mode), and the implementation locations for each concern (remark
plugin, CSS rules, and the stripLocaleFromId normalization).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Update `docs/spec-roadmap.md`

**Files:**

- Modify: `docs/spec-roadmap.md`

- [ ] **Step 1: Append a Current State bullet**

Open `docs/spec-roadmap.md`. Find the `## Current State` block near the top of the file. Append this bullet at the end of its list, preserving the existing bullets verbatim:

```markdown
- Post bodies now support captioned figures: standalone markdown images are promoted to `<figure>` with the alt text reused as the caption, a `#wide` url fragment bleeds the figure outside the prose column on desktop, and every post now lives as a folder so images can co-locate with their post. See `docs/spec-post-detail.md` for the full figure rules.
```

- [ ] **Step 2: Update the item 3 section**

In `### 3. In-Post Reading Experience`, find this block:

```markdown
- **Likely Surfaces**:
  - Article structure cues
  - Image captions and figure handling
  - Optional summary aids for suitable posts
  - Additional reading guidance inside long technical posts where the current flow is still too thin
```

Replace with:

```markdown
- **Current Status**:
  - Image captions and figure handling landed: see `docs/spec-post-detail.md` for the authoring convention and visual treatment, and `src/content/blog/{ko,en}/iam-policy-checklist/` for a coverage-fixture example post.
- **Remaining Surfaces**:
  - Article structure cues
  - Optional summary aids for suitable posts
  - Additional reading guidance inside long technical posts where the current flow is still too thin
```

Leave the `- **Intent**:`, `- **Direction**:`, and `- **Avoid**:` blocks inside item 3 untouched.

- [ ] **Step 3: Commit**

```bash
git add docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record post figures landed in roadmap

Moves the figure handling sub-area of item 3 (In-Post Reading
Experience) out of Likely Surfaces and into Current Status, and
adds a bullet to the top Current State block summarising what
shipped so future work knows the figure system is already in place.
The remaining sub-areas (structure cues, optional summary aids,
long-post guidance) stay as pending.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Checklist (for the executor)

Before declaring the plan complete, run through each of these manually. Do not skip items; the visual and behavioral ones catch regressions the automated tests cannot.

1. **`npm test`** — every test passes. Pass count has grown by the sum of new tests added across Tasks 1, 4, and 10 (4 + 7 + 6 = 17).
2. **`npm run build`** — build succeeds. Open `dist/posts/iam-policy-checklist/index.html`:
   - Contains exactly one `<figure>` (with no attributes beyond the tag itself) and exactly one `<figure data-width="wide">`.
   - Contains `<figcaption>` text that matches the KO caption strings in the example post.
   - Contains `<img src="./spacer.svg" alt="">` (decorative, no figure wrap).
   - Contains the inline cursor image as `<img>` inside a `<p>` with surrounding prose.
   - Does NOT contain the substring `#wide` anywhere.
3. **Same checks in `dist/en/posts/iam-policy-checklist/index.html`** with EN caption strings.
4. **`npm run dev` visual check** on both locales' example posts:
   - Light mode: column figure has a thin stone-200 border; wide figure bleeds outside the prose column on a ≥768px viewport; italic centered caption sits below each figure with stone-500 text.
   - Dark mode toggle: figure borders switch to stone-800; captions switch to stone-400; **screenshots are NOT inverted or dimmed** — the frame alone handles contrast.
   - Decorative spacer renders as a plain `<img>` with no frame and no caption.
   - Inline cursor image sits mid-sentence without breaking the paragraph.
5. **Code block rendering spot-check**: visit either locale's example post, confirm the `json`, `bash`, and `typescript` blocks render with the project's Shiki defaults. If they look clashy against the existing prose-pre background in light or dark mode (for example, dark Shiki tokens on a light prose-pre background), **do not fix it in this plan** — open a follow-up task for Shiki dual-theme tuning. That is explicitly out of scope per the spec.
6. **Migration smoke**: visit `/posts/first-post/` and `/posts/routing-story-start/` (plus one EN equivalent like `/en/posts/mpc-notes/`). Confirm each post body looks exactly the same as before the migration. If any URL 404s, the Task 1 normalization did not land correctly; go back and re-verify.
7. **Doc review**: re-read `docs/spec-post-detail.md` and `docs/spec-roadmap.md` and confirm they describe what actually shipped.
