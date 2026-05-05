# Code Block Copy Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quiet, hover-only copy-to-clipboard button to fenced code blocks in post bodies. The button is emitted at build time by a new rehype plugin, styled with hairline CSS, and wired up by a small idempotent click handler that ships with each post detail route.

**Architecture:** The button markup is build-time. A new rehype plugin (`src/utils/rehypeCodeCopyButton.ts`) walks the hast tree after Shiki has produced its `<pre class="astro-code">` output and replaces every non-empty match with a `<div class="code-block">` wrapper containing the original `<pre>` and a `<button class="code-copy-button">`. Locale-aware ARIA labels are decided from `vfile.path` in the same style as `remarkAdmonition.ts`. The click behavior ships as an Astro component (`src/components/CodeCopyButton.astro`) mounted on both post detail routes; it uses a single delegated `click` listener on `document`, an idempotent `window.__codeCopyInit` guard, and `navigator.clipboard.writeText` for the copy itself. CSS lives in `src/styles/global.css` and gates the button visibility behind `.code-block:hover` / `:focus-within` on desktop, with an `@media (max-width: 767px)` override that pins it visible on mobile.

**Tech Stack:** Astro 6 (`markdown.rehypePlugins`), Shiki (already configured for the dual `github-light` / `tokyo-night` themes — unchanged), Tailwind CSS v4 (only used for the existing prose chain — the new CSS is hand-written so it can target the structural wrapper). Node's built-in test runner with `--experimental-strip-types`. No new npm packages.

**Reference Spec:** `docs/superpowers/specs/2026-05-06-code-copy-button-design.md`.

---

## File Structure

### Create

- `src/utils/rehypeCodeCopyButton.ts` — the rehype plugin that walks the hast tree, finds `<pre class="astro-code">` nodes, and replaces them with the wrapper + button structure.
- `src/components/CodeCopyButton.astro` — Astro component that emits the inline `<script>` containing the click handler.
- `tests/rehype-code-copy-button.test.ts` — seven-case unit test for the plugin.

### Modify

- `astro.config.mjs` — import the new plugin and register it under a new `markdown.rehypePlugins` array.
- `src/styles/global.css` — append the `.code-block` wrapper rules and `.code-copy-button` button rules, including the `:hover` / `:focus-within` reveal, mobile always-on, and `prefers-reduced-motion` overrides.
- `src/pages/posts/[...slug].astro` — import and mount `<CodeCopyButton />` once inside the post detail layout.
- `src/pages/en/posts/[...slug].astro` — same for the English route.
- `docs/spec-post-detail.md` — append a "Code blocks" section.
- `docs/spec-roadmap.md` — add a Current State bullet under In-Post Reading Experience.

### Pre-existing files referenced (no changes required)

- `src/utils/remarkAdmonition.ts` — used as the pattern source for locale detection from `vfile.path`.
- `src/utils/remarkPostFigure.ts` — used as the pattern source for "no external deps; walk the AST manually" plugin style.
- `src/components/ReadingProgress.astro`, `src/components/TOC.astro` — used as the pattern source for the idempotent `window.__xxxInit` mount guard.

---

## Tasks

### Task 1: Build the rehype plugin via TDD

The plugin is a self-contained module with no Astro dependency. Test-driving it lets the rest of the work (config wiring, CSS, component) land on top of a verified plugin.

**Files:**

- Create: `tests/rehype-code-copy-button.test.ts`
- Create: `src/utils/rehypeCodeCopyButton.ts`

- [ ] **Step 1: Write the full failing test file**

Create `tests/rehype-code-copy-button.test.ts` with all seven cases at once. The plugin import will fail because the module does not exist yet, which is the failure we want from this step.

```ts
import assert from "node:assert/strict";
import test from "node:test";
import rehypeCodeCopyButton from "../src/utils/rehypeCodeCopyButton.ts";

type HastNode = { type: string; [key: string]: unknown };

function makeRoot(children: HastNode[]): HastNode {
	return { type: "root", children };
}

function makeElement(
	tagName: string,
	properties: Record<string, unknown> = {},
	children: HastNode[] = [],
): HastNode {
	return { type: "element", tagName, properties, children };
}

function makeText(value: string): HastNode {
	return { type: "text", value };
}

function makeShikiPre(text: string): HastNode {
	return makeElement(
		"pre",
		{ className: ["astro-code"] },
		[makeElement("code", {}, [makeText(text)])],
	);
}

function makeFile(locale: "ko" | "en"): { path: string } {
	return { path: `/abs/repo/src/content/blog/${locale}/sample/index.md` };
}

test("wraps a single Shiki <pre> in a code-block div with a copy button (ko default)", () => {
	const tree = makeRoot([makeShikiPre("console.log('hi');")]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const rootChildren = (tree as { children: HastNode[] }).children;
	assert.equal(rootChildren.length, 1);

	const wrapper = rootChildren[0] as {
		type: string;
		tagName: string;
		properties: Record<string, unknown>;
		children: HastNode[];
	};
	assert.equal(wrapper.type, "element");
	assert.equal(wrapper.tagName, "div");
	assert.deepEqual(wrapper.properties.className, ["code-block"]);
	assert.equal(wrapper.children.length, 2);

	const pre = wrapper.children[0] as { tagName: string };
	assert.equal(pre.tagName, "pre");

	const button = wrapper.children[1] as {
		tagName: string;
		properties: Record<string, unknown>;
	};
	assert.equal(button.tagName, "button");
	assert.deepEqual(button.properties.className, ["code-copy-button"]);
	assert.equal(button.properties.type, "button");
	assert.equal(button.properties["aria-label"], "코드 복사");
	assert.equal(button.properties["data-copied-label"], "복사됨");
});

test("uses English labels when the file path is under /blog/en/", () => {
	const tree = makeRoot([makeShikiPre("console.log('hi');")]);

	rehypeCodeCopyButton()(tree, makeFile("en"));

	const wrapper = (tree as { children: HastNode[] }).children[0] as {
		children: HastNode[];
	};
	const button = wrapper.children[1] as { properties: Record<string, unknown> };
	assert.equal(button.properties["aria-label"], "Copy code");
	assert.equal(button.properties["data-copied-label"], "Copied");
});

test("falls back to Korean labels when the file path has no locale segment", () => {
	const tree = makeRoot([makeShikiPre("x")]);

	rehypeCodeCopyButton()(tree, { path: "/some/other/path.md" });

	const wrapper = (tree as { children: HastNode[] }).children[0] as {
		children: HastNode[];
	};
	const button = wrapper.children[1] as { properties: Record<string, unknown> };
	assert.equal(button.properties["aria-label"], "코드 복사");
	assert.equal(button.properties["data-copied-label"], "복사됨");
});

test("wraps every Shiki <pre> in a tree with multiple code blocks", () => {
	const tree = makeRoot([makeShikiPre("a"), makeShikiPre("b")]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 2);
	assert.equal((children[0] as { tagName: string }).tagName, "div");
	assert.equal((children[1] as { tagName: string }).tagName, "div");
});

test("skips empty <pre class=astro-code> elements", () => {
	const emptyPre = makeElement(
		"pre",
		{ className: ["astro-code"] },
		[makeElement("code", {}, [])],
	);
	const tree = makeRoot([emptyPre]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const node = children[0] as { tagName: string };
	assert.equal(node.tagName, "pre");
});

test("leaves <pre> elements without the astro-code class untouched", () => {
	const plainPre = makeElement("pre", {}, [makeText("hello")]);
	const tree = makeRoot([plainPre]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const node = children[0] as {
		tagName: string;
		properties: Record<string, unknown>;
	};
	assert.equal(node.tagName, "pre");
	const cls = node.properties.className;
	assert.equal(Array.isArray(cls) && cls.includes("code-block"), false);
});

test("wraps Shiki <pre> nested inside <aside class=callout>", () => {
	const aside = makeElement("aside", { className: ["callout"] }, [
		makeShikiPre("inside"),
	]);
	const tree = makeRoot([aside]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const asideNode = children[0] as {
		tagName: string;
		children: HastNode[];
	};
	assert.equal(asideNode.tagName, "aside");
	assert.equal(asideNode.children.length, 1);
	const wrapper = asideNode.children[0] as {
		tagName: string;
		properties: Record<string, unknown>;
	};
	assert.equal(wrapper.tagName, "div");
	assert.deepEqual(wrapper.properties.className, ["code-block"]);
});

test("does not double-wrap on a second pass over the same tree (idempotency)", () => {
	const tree = makeRoot([makeShikiPre("once")]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));
	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const wrapper = children[0] as {
		tagName: string;
		children: HastNode[];
	};
	assert.equal(wrapper.tagName, "div");
	assert.equal(wrapper.children.length, 2);
	assert.equal((wrapper.children[0] as { tagName: string }).tagName, "pre");
	assert.equal((wrapper.children[1] as { tagName: string }).tagName, "button");
});
```

- [ ] **Step 2: Run the test file and confirm it fails on import**

Run: `npm test -- tests/rehype-code-copy-button.test.ts`

Expected: every test fails with an error along the lines of `Cannot find module '../src/utils/rehypeCodeCopyButton.ts'` (or a similar resolution error from Node's loader). The file does not exist yet; this is the correct failure state.

- [ ] **Step 3: Implement the plugin**

Create `src/utils/rehypeCodeCopyButton.ts`:

```ts
interface HastNode {
	type: string;
	[key: string]: unknown;
}

interface HastElement extends HastNode {
	type: "element";
	tagName: string;
	properties?: Record<string, unknown>;
	children: HastNode[];
}

interface HastText extends HastNode {
	type: "text";
	value: string;
}

interface HastRoot extends HastNode {
	type: "root";
	children: HastNode[];
}

interface VFileLike {
	path?: string;
}

const LABELS: Record<"ko" | "en", { aria: string; copied: string }> = {
	ko: { aria: "코드 복사", copied: "복사됨" },
	en: { aria: "Copy code", copied: "Copied" },
};

const SVG_ATTRS =
	'viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const CLIPBOARD_SVG =
	`<svg data-state="idle" ${SVG_ATTRS}>` +
	'<rect x="9" y="2" width="6" height="4" rx="1" ry="1"></rect>' +
	'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>' +
	"</svg>";

const CHECK_SVG =
	`<svg data-state="copied" ${SVG_ATTRS} hidden>` +
	'<polyline points="20 6 9 17 4 12"></polyline>' +
	"</svg>";

function detectLocale(file: VFileLike | undefined): "ko" | "en" {
	const path = file?.path ?? "";
	if (/[\\/]blog[\\/]en[\\/]/.test(path)) return "en";
	return "ko";
}

function hasClass(node: HastElement, className: string): boolean {
	const cls = node.properties?.className;
	if (!Array.isArray(cls)) return false;
	return cls.includes(className);
}

function isPreAstroCode(node: HastNode): node is HastElement {
	return (
		node.type === "element" &&
		(node as HastElement).tagName === "pre" &&
		hasClass(node as HastElement, "astro-code")
	);
}

function isCodeBlockWrapper(node: HastNode): node is HastElement {
	return (
		node.type === "element" &&
		(node as HastElement).tagName === "div" &&
		hasClass(node as HastElement, "code-block")
	);
}

function getRecursiveText(node: HastNode): string {
	if (node.type === "text") return (node as HastText).value;
	if (node.type === "element" || node.type === "root") {
		const children = (node as { children?: HastNode[] }).children ?? [];
		return children.map(getRecursiveText).join("");
	}
	return "";
}

function buildButton(locale: "ko" | "en"): HastElement {
	const labels = LABELS[locale];
	return {
		type: "element",
		tagName: "button",
		properties: {
			type: "button",
			className: ["code-copy-button"],
			"aria-label": labels.aria,
			"data-copied-label": labels.copied,
		},
		children: [
			{ type: "raw", value: CLIPBOARD_SVG },
			{ type: "raw", value: CHECK_SVG },
		],
	};
}

function buildWrapper(pre: HastElement, locale: "ko" | "en"): HastElement {
	return {
		type: "element",
		tagName: "div",
		properties: { className: ["code-block"] },
		children: [pre, buildButton(locale)],
	};
}

function walk(
	parent: { children: HastNode[] },
	locale: "ko" | "en",
	insideWrapper: boolean,
): void {
	for (let i = 0; i < parent.children.length; i += 1) {
		const child = parent.children[i];

		if (isPreAstroCode(child)) {
			if (insideWrapper) continue;
			if (getRecursiveText(child).trim() === "") continue;
			parent.children[i] = buildWrapper(child as HastElement, locale);
			continue;
		}

		if (child.type === "element") {
			const childInsideWrapper = insideWrapper || isCodeBlockWrapper(child);
			walk(child as HastElement, locale, childInsideWrapper);
		}
	}
}

export default function rehypeCodeCopyButton() {
	return function transform(tree: HastRoot, file: VFileLike): void {
		const locale = detectLocale(file);
		walk(tree, locale, false);
	};
}
```

- [ ] **Step 4: Run the test file and confirm every test passes**

Run: `npm test -- tests/rehype-code-copy-button.test.ts`

Expected: all seven tests pass. If a test fails, debug against the implementation — do not change the test cases. The seven cases are taken directly from the spec's Test Plan and any drift would mean the spec was misimplemented, not that the test should bend.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`

Expected: all existing tests pass and the new file's seven tests pass on top. The pass count grows by exactly 7 relative to the pre-task baseline. No regressions because the plugin is not yet wired into Astro's pipeline at this point — this is purely a green unit-test landing.

- [ ] **Step 6: Commit**

```bash
git add src/utils/rehypeCodeCopyButton.ts tests/rehype-code-copy-button.test.ts
git commit -m "$(cat <<'EOF'
feat: add rehype plugin that wraps Shiki code blocks with a copy button

Introduces src/utils/rehypeCodeCopyButton.ts, a build-time hast walker
that takes every <pre class="astro-code"> Shiki emits and replaces it
with a <div class="code-block"> containing the original <pre> and a
<button class="code-copy-button"> sibling. Locale-aware aria-label and
data-copied-label values are decided from vfile.path in the same style
as remarkAdmonition (en falls under /blog/en/, everything else falls
back to ko). Empty pre elements and non-Shiki <pre> are left untouched,
and the plugin is idempotent against re-application on the same tree.

Plugin behavior is unit-tested across seven cases. The plugin is not
wired into astro.config.mjs in this commit; that wiring follows in the
next change so this commit can be reverted independently if needed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire the plugin into Astro's markdown pipeline

The plugin only takes effect once registered under `markdown.rehypePlugins`. After this step, every post built by Astro will have its code blocks wrapped in `<div class="code-block">` with an unstyled, inert button inside.

**Files:**

- Modify: `astro.config.mjs`

- [ ] **Step 1: Update the Astro config**

Open `astro.config.mjs`. Find this block:

```js
import remarkPostFigure from "./src/utils/remarkPostFigure.ts";
import remarkAdmonition from "./src/utils/remarkAdmonition.ts";
```

Add a third import directly below:

```js
import rehypeCodeCopyButton from "./src/utils/rehypeCodeCopyButton.ts";
```

Then find this block:

```js
markdown: {
    remarkPlugins: [remarkPostFigure, remarkAdmonition],
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "tokyo-night",
      },
    },
  },
```

Replace with:

```js
markdown: {
    remarkPlugins: [remarkPostFigure, remarkAdmonition],
    rehypePlugins: [rehypeCodeCopyButton],
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "tokyo-night",
      },
    },
  },
```

The `rehypePlugins` entry is added without changing anything else. `remarkPlugins` order is preserved; `shikiConfig` is unchanged.

- [ ] **Step 2: Run the test suite**

Run: `npm test`

Expected: all tests pass. Adding the plugin to the config does not affect any test fixture because no test reads the rendered post HTML directly — the plugin's behavior is already covered by the unit test from Task 1.

- [ ] **Step 3: Build the site**

Run: `npm run build`

Expected: the build completes without error or new warnings beyond what was reported in the pre-task baseline build. The pagefind index also generates without error.

- [ ] **Step 4: Verify the wrapper appears in the dist output**

Run:

```bash
grep -c 'class="code-block"' dist/posts/ethereum-keystore-encryption/index.html
grep -c 'class="code-copy-button"' dist/posts/ethereum-keystore-encryption/index.html
```

Expected: both commands print a number ≥ 1. The Korean post about KeyStore encryption has multiple code blocks, so the count for the wrapper class should be the same as the number of fenced code blocks in that post (≥ 4).

Then verify the English counterpart:

```bash
grep -c 'class="code-copy-button"' dist/en/posts/ethereum-keystore-encryption/index.html
grep -F 'aria-label="Copy code"' dist/en/posts/ethereum-keystore-encryption/index.html
grep -F 'aria-label="코드 복사"' dist/posts/ethereum-keystore-encryption/index.html
```

Expected:
- The `code-copy-button` count in the English file is ≥ 1.
- `Copy code` appears in the English dist file.
- `코드 복사` appears in the Korean dist file.

If any of these checks fail, halt the plan: it means the plugin is not running against real markdown, or the locale detection is not firing on Astro's actual `vfile.path` strings. Inspect the dist output of the failing locale to diagnose.

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs
git commit -m "$(cat <<'EOF'
feat: wire rehypeCodeCopyButton into Astro's markdown pipeline

Registers the new rehype plugin under markdown.rehypePlugins so every
post body's Shiki <pre class="astro-code"> blocks now ship with the
.code-block wrapper and the .code-copy-button sibling in the static
HTML. The button is structurally present and locale-aware in both ko
and en dist output, but it has no styling yet (so it visually leaks
into the layout) and no click handler. Both pieces land in the next
two commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add the visual styles

After this step the button is invisible during normal reading on desktop, fades in on hover or focus-within of the code block, and stays visible at all times on mobile. The button still has no click handler — clicking it does nothing — but visually it should look correct.

**Files:**

- Modify: `src/styles/global.css`

- [ ] **Step 1: Add the wrapper and button rules to `global.css`**

Open `src/styles/global.css`. Find the comment block and rule for `.prose-site pre code`:

```css
/*
 * The `prose-code:*` utilities on post bodies target every <code>, including
 * the one Shiki nests inside <pre>. That gives the code-block wrapper a chip
 * background + padding + radius, which then peeks through the line-height gaps
 * between each `<span class="line">` and reads as horizontal bars behind the
 * code. Reset those properties for <pre><code> so only the <pre> background
 * shows.
 */
.prose-site pre code {
	background-color: transparent !important;
	padding: 0 !important;
	border-radius: 0 !important;
	color: inherit !important;
}
```

Append this new block immediately after that rule, before the `.theme-transition` block:

```css
/*
 * Code-block copy button.
 * The `rehypeCodeCopyButton` plugin (`src/utils/rehypeCodeCopyButton.ts`)
 * wraps every Shiki <pre class="astro-code"> in a <div class="code-block">
 * and appends a <button class="code-copy-button"> sibling. The button's
 * click handling lives in `src/components/CodeCopyButton.astro`.
 *
 * Visibility model:
 *   - Desktop: the button stays at opacity 0 (and is not focusable, because
 *     pointer-events is none) until the wrapper is hovered or focused
 *     within. Hover or focus-within fades it to opacity 1 in 150ms. The
 *     button itself bumps its border + icon color one shade darker on
 *     hover / focus-visible.
 *   - Mobile (<= 767px): the button stays visible at opacity 1 because
 *     touch devices have no hover, and the alternative would force a tap-
 *     and-wait gesture before the button shows up.
 *   - Reduced motion: the opacity / color transitions are skipped.
 *
 * The wrapper is position: relative so the absolutely-positioned button
 * sits in the wrapper's top-right corner and stays put when the code
 * underneath scrolls horizontally.
 */
.code-block {
	position: relative;
}

.code-copy-button {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	border: 1px solid rgb(220 214 204 / 1); /* dawn-300 */
	border-radius: 0.25rem;
	background: transparent;
	color: rgb(86 95 137 / 1); /* dawn-600 */
	cursor: pointer;
	opacity: 0;
	pointer-events: none;
	transition:
		opacity 150ms ease,
		color 150ms ease,
		border-color 150ms ease;
}

:where(.dark) .code-copy-button {
	border-color: rgb(59 66 97 / 1); /* night-600 */
	color: rgb(115 122 162 / 1); /* night-300 */
}

.code-block:hover .code-copy-button,
.code-block:focus-within .code-copy-button {
	opacity: 1;
	pointer-events: auto;
}

.code-copy-button:hover,
.code-copy-button:focus-visible {
	color: rgb(65 72 104 / 1); /* dawn-700 */
	border-color: rgb(86 95 137 / 1); /* dawn-600 */
	outline: none;
}

:where(.dark) .code-copy-button:hover,
:where(.dark) .code-copy-button:focus-visible {
	color: rgb(192 202 245 / 1); /* night-50 */
	border-color: rgb(115 122 162 / 1); /* night-300 */
}

@media (max-width: 767px) {
	.code-copy-button {
		opacity: 1;
		pointer-events: auto;
	}
}

@media (prefers-reduced-motion: reduce) {
	.code-copy-button {
		transition: none;
	}
}
```

- [ ] **Step 2: Run the dev server and visually verify desktop behavior**

Start: `npm run dev`

In a desktop-width browser window, open `http://localhost:4321/posts/ethereum-keystore-encryption`.

Expected:
- The page renders normally.
- Code blocks look identical to before this task at the non-hover baseline (no chrome added in the corner).
- Hovering any code block fades a small 28×28 px square into the top-right corner of that block over ~150ms. The square has a hairline border in `dawn-300` and a small clipboard icon centered inside in `dawn-600`.
- Hovering the button itself nudges the icon and border one shade darker.
- Tabbing through the page eventually lands inside or near a code block; when focus enters the wrapper, the button appears even without a mouse hover.
- Moving the mouse off the code block fades the button back to invisible.

Switch to dark mode (theme toggle in the header).

Expected:
- Same hover / focus behavior.
- Border and icon now use `night-600` / `night-300` so the button reads as a thin frame on the dark `night-900` code background, not a glaring outline.

- [ ] **Step 3: Visually verify mobile behavior**

In the same dev server window, open DevTools → toggle device mode → choose any width ≤ 767 px (e.g. iPhone 14, 390 px).

Expected:
- The copy button is visible at full opacity in the top-right corner of every code block immediately, with no hover required.
- Resize back above 767 px → the button returns to hover-only behavior.

- [ ] **Step 4: Visually verify the reduced-motion override**

In DevTools, open the Rendering panel → set "Emulate CSS media feature prefers-reduced-motion" to `reduce`.

Expected:
- Hovering a code block on desktop still reveals the button, but the appearance is instant (no fade-in).
- The icon / border darkening on button hover is also instant.
- All other site behaviors are unaffected.

Reset the emulation when done.

- [ ] **Step 5: Run the test suite**

Run: `npm test`

Expected: all tests still pass. CSS is not exercised by any test in this repo, but the suite acts as a structural canary.

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css
git commit -m "$(cat <<'EOF'
style: add hover-only copy-button styling for code blocks

Adds the .code-block wrapper and .code-copy-button rules to global.css,
gated behind .code-block:hover / :focus-within on desktop so the button
stays invisible during normal reading and fades in over 150ms only when
the reader signals intent. <=767px viewports pin the button visible
because touch devices have no hover. prefers-reduced-motion: reduce
removes the opacity / color easing without changing the reveal logic.

Border and icon use the same dawn-300 / dawn-600 (light) and
night-600 / night-300 (dark) hairline tokens already used by callouts
and TOC indicators, so the chrome stays consistent with the rest of
the site's reading aids.

The button still has no click handler in this commit; clicking it
does nothing. The handler component lands next.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add the click handler component and mount it on both post detail routes

After this step, clicking the button copies the code's text to the clipboard, swaps the icon to a check for ~1.5 seconds, and updates the ARIA label to the locale-appropriate `복사됨` / `Copied` for screen readers.

**Files:**

- Create: `src/components/CodeCopyButton.astro`
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/pages/en/posts/[...slug].astro`

- [ ] **Step 1: Create the component**

Create `src/components/CodeCopyButton.astro`:

```astro
---
// CodeCopyButton.astro
//
// Mounts the click handler that powers <button class="code-copy-button">
// instances emitted by the rehypeCodeCopyButton plugin. The button's
// markup is built at compile time, so this component renders no DOM —
// only an inline script that attaches a single delegated click listener.
//
// The script is idempotent across multiple mounts via the
// window.__codeCopyInit guard, in line with the TOC scroll-spy and
// reading-progress patterns already used on this site.
//
// Behavior:
//   - On click, read the code's visible text via innerText so newlines
//     between Shiki <span class="line"> rows are preserved.
//   - Write to navigator.clipboard. If the API is missing or rejects,
//     swallow silently — the user can still select-and-copy manually.
//   - Swap the [data-state="idle"] icon for [data-state="copied"] and
//     replace the aria-label with the value from data-copied-label for
//     1500ms before reverting.
---

<script is:inline>
	(() => {
		if (window.__codeCopyInit) return;
		window.__codeCopyInit = true;

		const COPIED_DURATION_MS = 1500;

		const clipboard = navigator?.clipboard;
		if (!clipboard || typeof clipboard.writeText !== "function") return;

		document.addEventListener("click", async (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const button = target.closest(".code-copy-button");
			if (!(button instanceof HTMLButtonElement)) return;

			const wrapper = button.closest(".code-block");
			if (!wrapper) return;

			const code = wrapper.querySelector("pre code");
			if (!(code instanceof HTMLElement)) return;

			try {
				await clipboard.writeText(code.innerText);
			} catch {
				return;
			}

			const idle = button.querySelector('[data-state="idle"]');
			const copied = button.querySelector('[data-state="copied"]');
			const idleLabel = button.getAttribute("aria-label");
			const copiedLabel = button.getAttribute("data-copied-label");

			if (idle instanceof Element && copied instanceof Element) {
				idle.setAttribute("hidden", "");
				copied.removeAttribute("hidden");
			}
			if (copiedLabel) {
				button.setAttribute("aria-label", copiedLabel);
			}

			setTimeout(() => {
				if (idle instanceof Element && copied instanceof Element) {
					idle.removeAttribute("hidden");
					copied.setAttribute("hidden", "");
				}
				if (idleLabel) {
					button.setAttribute("aria-label", idleLabel);
				}
			}, COPIED_DURATION_MS);
		});
	})();
</script>
```

- [ ] **Step 2: Mount the component on the Korean post route**

Open `src/pages/posts/[...slug].astro`. Find the imports block at the top:

```astro
import { getRelativeLocaleUrl } from "astro:i18n";
import { getCollection, render } from "astro:content";
import Comments from "../../components/Comments.astro";
import PostHeader from "../../components/PostHeader.astro";
import PostReadingFlow from "../../components/PostReadingFlow.astro";
import PostSummary from "../../components/PostSummary.astro";
import ReadingProgress from "../../components/ReadingProgress.astro";
import TOC from "../../components/TOC.astro";
import Layout from "../../layouts/Layout.astro";
```

Add a new import alphabetized into the components group:

```astro
import CodeCopyButton from "../../components/CodeCopyButton.astro";
```

(Final alphabetical order of the components group: `CodeCopyButton`, `Comments`, `PostHeader`, `PostReadingFlow`, `PostSummary`, `ReadingProgress`, `TOC`.)

Then find the rendered article body inside the layout:

```astro
		<ReadingProgress />
		<article
			class="mx-auto max-w-5xl"
			data-pagefind-body
		>
```

Insert `<CodeCopyButton />` between `<ReadingProgress />` and `<article>`:

```astro
		<ReadingProgress />
		<CodeCopyButton />
		<article
			class="mx-auto max-w-5xl"
			data-pagefind-body
		>
```

The exact placement does not matter functionally because the component renders only a `<script is:inline>`, but mounting it next to the other inline-script reading aids keeps the file readable.

- [ ] **Step 3: Mount the component on the English post route**

Open `src/pages/en/posts/[...slug].astro`. Apply the same two changes:

1. Add the import in the components group. The relative path here goes up one more level:

```astro
import CodeCopyButton from "../../../components/CodeCopyButton.astro";
```

2. Insert `<CodeCopyButton />` directly after `<ReadingProgress />` in the body, mirroring the Korean route.

- [ ] **Step 4: Visually verify clicking copies the code (Korean post)**

Restart `npm run dev` if it is running so the new mount takes effect, then open `http://localhost:4321/posts/ethereum-keystore-encryption`.

Hover any fenced code block and click the copy button.

Expected:
- The clipboard icon is replaced by a check icon for ~1.5 seconds.
- After ~1.5 seconds the check icon is replaced by the clipboard icon again.
- Pasting into a text editor or terminal yields the exact code text shown in the block, with the original line breaks preserved.

Open the browser DevTools accessibility inspector and select the button.

Expected:
- During the idle state: `aria-label = "코드 복사"`.
- During the ~1.5 s after a successful click: `aria-label = "복사됨"`.
- After it reverts: `aria-label = "코드 복사"` again.

- [ ] **Step 5: Visually verify the English post**

Open `http://localhost:4321/en/posts/ethereum-keystore-encryption`.

Expected:
- Click behavior identical to the Korean post.
- ARIA label is `Copy code` in idle and `Copied` immediately after a click.

- [ ] **Step 6: Verify the no-clipboard graceful fallback (manual)**

In Chrome / Chromium DevTools, run this in the console of any post page:

```js
Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
```

Reload the page (so the inline script runs against the patched value). The script should bail out before attaching the click listener.

Click any copy button. Expected: the button is still visible (CSS is independent), but clicking it does nothing — the icon does not swap, the aria-label does not change, no console error fires. The page is otherwise fully usable.

Restore the page (close the tab) when done.

- [ ] **Step 7: Run the test suite**

Run: `npm test`

Expected: all tests still pass. The mount point change does not affect any current test fixture.

- [ ] **Step 8: Commit**

```bash
git add src/components/CodeCopyButton.astro src/pages/posts/[...slug].astro 'src/pages/en/posts/[...slug].astro'
git commit -m "$(cat <<'EOF'
feat: wire click-to-copy handler for code-block copy buttons

Adds src/components/CodeCopyButton.astro, an inline-script Astro
component that powers the .code-copy-button instances emitted by the
rehypeCodeCopyButton plugin. The script:

- Guards re-mount via window.__codeCopyInit (matches TOC and
  ReadingProgress mount style).
- Bails out cleanly when navigator.clipboard.writeText is missing.
- Reads the visible code text with innerText so newlines between
  Shiki <span class="line"> rows are preserved.
- Swaps the idle clipboard icon for the copied check icon and the
  aria-label for the locale-aware data-copied-label string for 1500ms,
  then reverts.

Mounted once on each post detail route (ko + en). Other routes
(/, /about, /posts, taxonomy pages) intentionally stay free of the
script because they do not render fenced code blocks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Build smoke check

The plugin behavior is fully covered by unit tests; the click handler is verified visually in Task 4. This task is the end-to-end check that the wired-up dist HTML actually contains the expected wrapper, button, and locale attributes — i.e. that the markdown → rehype → static HTML pipeline still works after Tasks 2–4 have all landed together.

**Files:** none modified. This is a verification gate; do not commit anything in this task.

- [ ] **Step 1: Build the site fresh**

Run: `npm run build`

Expected: build succeeds, pagefind index generates without error, no new warnings beyond the pre-task baseline.

- [ ] **Step 2: Verify the Korean dist output**

Run:

```bash
grep -c 'class="code-block"' dist/posts/ethereum-keystore-encryption/index.html
grep -c 'class="code-copy-button"' dist/posts/ethereum-keystore-encryption/index.html
grep -F 'aria-label="코드 복사"' dist/posts/ethereum-keystore-encryption/index.html | head -1
grep -F 'data-copied-label="복사됨"' dist/posts/ethereum-keystore-encryption/index.html | head -1
```

Expected:
- The `code-block` count is ≥ 4 (the post has multiple code blocks).
- The `code-copy-button` count matches the `code-block` count (one button per wrapper).
- The Korean ARIA labels appear at least once.
- The Korean copied-label data attribute appears at least once.

- [ ] **Step 3: Verify the English dist output**

Run:

```bash
grep -c 'class="code-block"' dist/en/posts/ethereum-keystore-encryption/index.html
grep -c 'class="code-copy-button"' dist/en/posts/ethereum-keystore-encryption/index.html
grep -F 'aria-label="Copy code"' dist/en/posts/ethereum-keystore-encryption/index.html | head -1
grep -F 'data-copied-label="Copied"' dist/en/posts/ethereum-keystore-encryption/index.html | head -1
```

Expected: same shape as Step 2 but with the English labels.

- [ ] **Step 4: Verify a post with a callout still gets the copy button on its inner code block**

The KeyStore series posts contain callouts; verify that any code block inside a callout (if present) was wrapped and that the callout structure stayed intact. If the existing post corpus does not have a code block inside a callout, this step is documentation-only — note the absence and move on. (Do not synthesize a test post for this; the unit test from Task 1 already covers the nesting case.)

Run:

```bash
grep -B1 -A3 'class="callout"' dist/posts/ethereum-keystore-encryption/index.html | head -20
```

Expected: any `<aside class="callout">` blocks in the output retain their structure (label paragraph, body paragraphs). If the corpus does not happen to contain a code block inside a callout, this step yields no positive evidence — record the absence in the task notes and rely on the Task 1 unit test for that case.

- [ ] **Step 5: Verify the home and archive pages have no copy button infrastructure**

Run:

```bash
grep -c 'class="code-copy-button"' dist/index.html
grep -c 'class="code-copy-button"' dist/posts/index.html
grep -c 'code-copy-init\|__codeCopyInit' dist/index.html
```

Expected: every count is `0`. The home page, archive, taxonomy pages, and `/about` do not render fenced code, and they should not carry the click-handler script either.

- [ ] **Step 6: Reconfirm `npm test` is green**

Run: `npm test`

Expected: full pass.

This task ends without a commit — verification only.

---

### Task 6: Update the documentation

Two documents change: `docs/spec-post-detail.md` gets a new "Code blocks" section, and `docs/spec-roadmap.md` records the landing under In-Post Reading Experience.

**Files:**

- Modify: `docs/spec-post-detail.md`
- Modify: `docs/spec-roadmap.md`

- [ ] **Step 1: Append the Code blocks section to `spec-post-detail.md`**

Open `docs/spec-post-detail.md`. Find the existing "## Figures in Post Bodies" section header. Locate the end of that section (the last bullet under "Implementation location"). Append, after the Figures section closes:

```markdown
## Code blocks in Post Bodies

- **Default rendering**:
  - Fenced code blocks (` ``` `) are highlighted by Shiki at build time using the dual-theme setup configured in `astro.config.mjs` (`shikiConfig.themes.light = "github-light"`, `shikiConfig.themes.dark = "tokyo-night"`). Tokens swap between the two themes via the `html.dark .astro-code` override in `src/styles/global.css`.
  - Inline code (single backticks) is styled by the `prose-code:*` utilities on `.prose-site` and is intentionally not paired with a copy button — too short to be useful.
- **Copy button**:
  - Every fenced code block in a post body ships with a small copy-to-clipboard button anchored to the wrapper's top-right corner.
  - **Visibility**: hover-only on desktop, always visible on viewports `<= 767px`. The fade in / out is a 150ms opacity transition that is removed under `prefers-reduced-motion: reduce`.
  - **Visual register**: 28×28px transparent button, 1px hairline border in `dawn-300` (light) / `night-600` (dark), 14px clipboard / check icon in `dawn-600` (light) / `night-300` (dark). The icon and border step one shade darker on the button's own hover / focus-visible.
  - **Feedback on copy**: the clipboard icon swaps to a check icon for 1500ms; the `aria-label` swaps from `코드 복사` / `Copy code` to `복사됨` / `Copied` for the same duration. No toast, no banner, no overlay.
  - **Failure mode**: if `navigator.clipboard.writeText` is unavailable or rejects, the button silently does nothing. Users can still select-and-copy code manually.
  - **i18n**: Korean / English ARIA labels are decided at build time from the post's locale folder (`src/content/blog/ko/...` vs `.../en/...`), the same convention `remarkAdmonition.ts` uses.
- **Implementation location**:
  - Build-time wrapping (`<pre class="astro-code">` → `<div class="code-block"><pre>…</pre><button class="code-copy-button">…</button></div>`) happens in `src/utils/rehypeCodeCopyButton.ts`, wired into `astro.config.mjs`'s `markdown.rehypePlugins`.
  - Click behavior lives in `src/components/CodeCopyButton.astro`, mounted on `src/pages/posts/[...slug].astro` and `src/pages/en/posts/[...slug].astro`.
  - Visual rules live in `src/styles/global.css` under the `.code-block` and `.code-copy-button` selectors.
- **Future code-block features (line numbers, file titles, line highlighting, diff highlighting) are not part of this section. They would extend the same rehype hook or compose alongside it without requiring a runtime DOM rewrite.**
```

- [ ] **Step 2: Update `spec-roadmap.md`**

Open `docs/spec-roadmap.md`. Find the "## Current State" subsection at the very top (before "## Priority Areas"). Append a new bullet to the bottom of that bulleted list:

```markdown
- Code-block copy button landed: every fenced code block in a post body carries a small copy-to-clipboard button (hover-only on desktop, always visible on mobile, hairline 28×28px) emitted at build time by `src/utils/rehypeCodeCopyButton.ts`. Locale-aware ARIA labels (`코드 복사` / `Copy code`, `복사됨` / `Copied`). The rehype-stage foundation now in place can carry future code-block features (line numbers, file titles, line highlights) without requiring runtime DOM rewrites. See `docs/spec-post-detail.md`.
```

The bullet goes at the **end** of Current State so the chronological landing order stays readable.

Then look at the "### 3. In-Post Reading Experience" section's "Current Status" sub-bullets. Append a new sub-bullet to the bottom of that list:

```markdown
  - Code-block copy button landed: see Current State above. The rehype hook (`src/utils/rehypeCodeCopyButton.ts`) is the natural extension point for future code-block features.
```

The "Next Likely Work" line of that section already says "Reactive only", so nothing else needs to change there. The "Decided Not To Add" list remains untouched.

- [ ] **Step 3: Verify the rendered docs read correctly**

Run: `npm run dev` (if not already running) and review the two changed docs in your editor or a markdown previewer. The new sections should read as part of the surrounding voice — not louder, not noisier.

- [ ] **Step 4: Run the test suite**

Run: `npm test`

Expected: all tests pass. The doc edits do not affect any test.

- [ ] **Step 5: Commit**

```bash
git add docs/spec-post-detail.md docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record code-block copy button in post-detail and roadmap specs

Adds a new "Code blocks in Post Bodies" section to spec-post-detail.md
covering default Shiki rendering, the copy button visibility model,
visual register, feedback / failure modes, locale handling, and the
implementation locations. Adds matching landing bullets to the Current
State and In-Post Reading Experience sections of spec-roadmap.md, with
an explicit pointer that the new rehype hook is the extension point
for any future code-block features.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

This section is for the plan author (you, future-Claude, or the engineer running this plan). Run through the checklist before opening the worktree.

### Spec coverage

| Spec requirement | Implementing task |
|---|---|
| New rehype plugin `src/utils/rehypeCodeCopyButton.ts` | Task 1 |
| Plugin wired into `astro.config.mjs` `markdown.rehypePlugins` | Task 2 |
| `CodeCopyButton.astro` with idempotent script + delegated click + clipboard fallback + 1500ms swap | Task 4 |
| Component mounted on both post detail routes | Task 4 (steps 2 + 3) |
| CSS for `.code-block`, `.code-copy-button`, hover-only desktop, always-on mobile, reduced-motion override | Task 3 |
| SVG icons (clipboard idle / check copied) at viewBox 24×24, stroke 1.8, render 14×14 | Task 1 (in plugin constants) |
| Locale detection mirrors `remarkAdmonition.ts` | Task 1 (`detectLocale`) |
| Empty `<pre>` skipped, non-Shiki `<pre>` ignored, idempotent re-runs | Task 1 (unit tests + implementation) |
| Code blocks inside callouts get the same treatment | Task 1 (unit test) + Task 5 (verify in dist) |
| Build smoke verifying wrapper + locale ARIA in dist HTML | Task 5 |
| `docs/spec-post-detail.md` "Code blocks" section | Task 6 |
| `docs/spec-roadmap.md` Current State + In-Post Reading Experience landing bullets | Task 6 |

No gaps.

### Placeholder scan

Search the plan for `TBD`, `TODO`, `fill in`, "implement later", "similar to Task N", or "appropriate error handling". None found.

### Type / name consistency

- `rehypeCodeCopyButton` (export name) — Tasks 1, 2, 6 all match.
- `code-block` (wrapper class) — Tasks 1, 3, 5 all match.
- `code-copy-button` (button class) — Tasks 1, 3, 4, 5 all match.
- `data-state="idle"` / `data-state="copied"` — Task 1 (plugin) and Task 4 (script reads these via `[data-state="..."]` selector) match.
- `data-copied-label` — Task 1 (plugin sets it) and Task 4 (script reads it via `getAttribute("data-copied-label")`) match.
- `window.__codeCopyInit` — Task 4 only; matches the spec's prescribed name.
- `aria-label` values `코드 복사` / `Copy code` / `복사됨` / `Copied` — Tasks 1, 4, 5, 6 all match.
- `viewBox 0 0 24 24`, `width="14"`, `height="14"`, `stroke-width="1.8"` — Task 1 plugin constants and Task 6 doc both match.

No drift.

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-05-06-code-copy-button.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task with two-stage review between tasks. Best for keeping each task's context tight and surfacing implementation drift early.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batching with checkpoints for review.

**Which approach would you like?**
