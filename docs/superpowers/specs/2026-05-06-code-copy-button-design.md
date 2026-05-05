# Code Block Copy Button Design

**Date:** 2026-05-06

## Goal

Add a small, quiet copy-to-clipboard button to fenced code blocks in post bodies so technical readers can grab snippets without manually selecting text. The feature must stay inside the site's calm, text-first voice: hover-only on desktop, hairline visual treatment, no toast or background tint, and no animation beyond a brief opacity fade. The work also lays a rehype-stage foundation that future code-block enhancements (line numbers, line highlights, file titles) can extend without rewriting the pipeline.

## Decision

- Insert the copy button at build time via a new in-house **rehype** plugin, `rehypeCodeCopyButton`, that wraps every `<pre class="astro-code">` Shiki emits inside a `<div class="code-block">` and appends a `<button class="code-copy-button">` sibling. Inline code (`<code>` outside `<pre>`) is never touched.
- Locale-aware ARIA labels are decided at build time from the markdown file path (`src/content/blog/ko/...` vs `.../en/...`), matching the convention already used by `remarkAdmonition.ts`. Korean: `aria-label="코드 복사"` / `data-copied-label="복사됨"`. English: `aria-label="Copy code"` / `data-copied-label="Copied"`.
- The click handler ships as a small Astro component, `CodeCopyButton.astro`, that mounts on both post detail routes (`src/pages/posts/[...slug].astro` and `src/pages/en/posts/[...slug].astro`). It uses a single delegated `click` listener on `document`, an idempotent `window.__codeCopyInit` guard (matching the TOC scroll-spy and ReadingProgress pattern), `navigator.clipboard.writeText` for the copy itself, and a 1500 ms icon swap (clipboard → check → clipboard) for feedback.
- Visual treatment is **hover-only on desktop**, **always visible on mobile**: the button sits absolutely-positioned at `top: 0.5rem; right: 0.5rem` of the wrapper, 28×28 px, transparent background, 1 px hairline border in `dawn-300` / `night-600`, with a 14 px icon in `dawn-600` / `night-300`. A 150 ms opacity transition smooths the appear / disappear so it doesn't pop. `prefers-reduced-motion: reduce` removes the transition.
- No toast, no banner, no "Copied!" floating message. Visual feedback is only the inline icon swap. If clipboard write fails (permission denied, no API), the failure is silent — the user can still select and copy manually.
- Code blocks inside callouts (`<aside class="callout">`) get the same treatment because the rehype walk does not special-case container parents. Empty `<pre>` elements (zero text content) are skipped.

## Why

- The site is a technical blog where readers regularly need to take code with them. A copy button is the kind of "calm reader aid" the editorial philosophy welcomes — it's invisible during reading, useful at the moment of need, and never asks for attention.
- A hover-only button keeps the default reading view exactly as it is today. Nothing about the typographic rhythm of a code block changes when the reader is just reading. The chrome only resolves when the cursor signals "I might want to act on this code." Mobile has no hover, so it falls back to always-visible — small, low-contrast, easy to ignore but reachable when wanted.
- A rehype plugin is the right pipeline stage because the button is **structural markup**, not a scroll-driven or state-driven effect. Putting it next to `remarkPostFigure` and `remarkAdmonition` keeps the "transform markdown into static HTML" work in one layer. The runtime script is reduced to "find buttons and attach a click handler" — no DOM mutation, no flicker, no first-paint shuffle. Choosing this layer also means future code-block features (line numbers, language labels, line highlighting) can extend the same plugin or compose alongside it without touching the runtime side.
- A separate runtime-only approach was rejected during brainstorming: the button itself is static, only its click is dynamic, so emitting the button at build time matches the family the site already uses for figures and callouts. It also avoids the brief flicker between first paint and JS-driven button injection on mobile (where the button is always visible and the flicker would be perceptible).
- Icon-only (clipboard / check) was chosen over text labels (`Copy` / `복사`) because the hover-only pattern rewards a tiny visual footprint, and the i18n surface stays smaller (only ARIA labels need locale handling, not visible text). Icon swap on success was chosen over a colored toast because the rest of the site treats feedback as in-place typographic / iconographic shifts (TOC active state, reading progress fill) rather than as floating overlays — a toast would read as portal-style chrome the editorial philosophy explicitly avoids.

## Scope

### In scope

- New rehype plugin `src/utils/rehypeCodeCopyButton.ts`, matching the existing `src/utils/` convention for non-component code (see `remarkAdmonition.ts`, `remarkPostFigure.ts`, `blog.ts`).
- Wire the new plugin into `astro.config.mjs` under a new `markdown.rehypePlugins` array. Existing `remarkPlugins` entries are preserved.
- New Astro component `src/components/CodeCopyButton.astro` containing the click-handler script. Mounted on both post detail routes:
  - `src/pages/posts/[...slug].astro`
  - `src/pages/en/posts/[...slug].astro`
- New CSS block in `src/styles/global.css` covering `.code-block` (wrapper) and `.code-copy-button` (button) selectors, including hover / focus / mobile rules and the `prefers-reduced-motion` override. Place the block near the existing `.prose-site pre code` reset since both relate to Shiki output.
- Two SVG icons inlined in the rehype plugin output: a clipboard glyph (idle state) and a check glyph (copied state). Stroke-only, 14×14 viewBox, 1.5 stroke width, `currentColor`, matching the thin-stroke icon language already used in `SiteLogo`, the search trigger, and the theme toggle.
- Tests:
  - `tests/rehype-code-copy-button.test.ts` — exercise the plugin against seven input cases (single `pre.astro-code`, multiple in one tree, empty `pre.astro-code`, non-Shiki bare `<pre>`, ko vs en locale labels, `pre.astro-code` nested inside `<aside class="callout">`, idempotent re-application).
  - Update `tests/post-detail-structure.test.mjs` with one assertion per locale that the rendered post detail page contains at least one `.code-copy-button` for a fixture post with code blocks.
- Documentation:
  - Update `docs/spec-post-detail.md` with a new "Code blocks" section describing the copy button's visibility rules, ARIA labels, and the rehype hook for future code-block features.
  - Update `docs/spec-roadmap.md` so In-Post Reading Experience records "Code block copy button" as landed and notes the rehype-stage foundation now exists for further code-block work.

### Out of scope

- Line numbers, line highlighting, code-block titles / file labels, diff highlighting, focused/blurred line dimming. The rehype plugin is **named for and limited to** the copy-button concern; future code-block features are explicitly deferred to their own specs.
- Adopting `rehype-pretty-code` or any other batteries-included code-block plugin. The current Shiki dual-theme setup (`github-light` / `tokyo-night`) is preserved as-is.
- Changing the Shiki configuration, the Shiki themes, the `.astro-code` wrapper class, or the `prose-site pre` color overrides.
- Copy buttons on inline `<code>`, on `<pre>` blocks that did not come from Shiki (e.g. a hypothetical raw-HTML embed), or on code samples shown anywhere outside post detail pages (the `/about` page, the home page, archive pages do not render fenced code today).
- A "Copy as Markdown" or "Copy with line numbers" button. Only the raw text content is copied.
- A toast, banner, or floating notification system. Out by editorial decision.
- Telemetry, analytics, or any tracking of copy events.
- Any change to existing posts' content, frontmatter, or URLs.

## Architecture

### Pipeline placement

```
markdown (.md)
    ↓ remark plugins (remarkAdmonition, remarkPostFigure)
mdast
    ↓ astro built-in (Shiki + mdast → hast)
hast (with <pre class="astro-code">…)
    ↓ rehype plugin (rehypeCodeCopyButton)            ← new
hast (with <div class="code-block"><pre>…</pre><button>…</button></div>)
    ↓ astro renderer
HTML
    ↓ browser
    ↓ CodeCopyButton.astro script attaches delegated click handler
```

The plugin runs at the **rehype** stage, not remark, because the input it cares about (the `<pre class="astro-code">` wrapper Shiki emits) does not exist in MDAST. By the time the hast tree reaches our plugin, Shiki has already produced its HTML structure and the existing remark plugins (`remarkAdmonition`, `remarkPostFigure`) have already run.

### Rehype plugin: `rehypeCodeCopyButton`

The plugin walks the hast tree (using `unist-util-visit`'s implicit pattern via the unified `visit`-style traversal — the codebase already relies on Astro's transitive unified deps). For every `element` node where:

- `node.tagName === "pre"`, AND
- `node.properties.className` includes `"astro-code"`, AND
- the recursive text content of `node` is non-empty,

…the plugin **replaces** the `<pre>` node with a wrapping `<div class="code-block">` whose children are:

1. The original `<pre>` node (unchanged).
2. A `<button class="code-copy-button" type="button" aria-label="…" data-copied-label="…">` containing two inline SVGs (idle clipboard, copied check).

`pre` elements that lack the `astro-code` class are left untouched — this protects any hypothetical inline `<pre>` HTML in posts and any `<pre>` produced by mechanisms other than Shiki.

Locale detection mirrors `remarkAdmonition.ts`'s `detectLocale` exactly: read `vfile.path`, return `"en"` if the path contains `/blog/en/`, otherwise return `"ko"` (covers both the `ko` posts and any future locale that has not been explicitly added — which is the same fallback policy `remarkAdmonition` uses). The matched locale picks the label pair:

| Locale | `aria-label` | `data-copied-label` |
|---|---|---|
| `ko` | `코드 복사` | `복사됨` |
| `en` | `Copy code` | `Copied` |

The plugin must be **idempotent** against re-runs on the same tree: if a `<pre class="astro-code">` is already inside a `<div class="code-block">` parent, skip it. This is a defensive safety so that accidentally listing the plugin twice in `rehypePlugins`, or having an upstream tool pre-apply a similar wrapping, does not double-emit buttons.

The two SVG icons are emitted as hast subtrees (not as raw HTML strings) so the rehype output stays a clean hast tree. Both SVGs share the wrapper `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`. The idle SVG is `data-state="idle"`. The copied SVG is `data-state="copied" hidden` so it is invisible until the script unhides it.

### Astro config

`astro.config.mjs` gains a `rehypePlugins` entry alongside the existing `remarkPlugins`:

```js
markdown: {
  remarkPlugins: [remarkPostFigure, remarkAdmonition],
  rehypePlugins: [rehypeCodeCopyButton],
  shikiConfig: { /* unchanged */ },
}
```

No other Astro config fields change. No new dependency is added.

### Click handler: `CodeCopyButton.astro`

The component renders an inline `<script>` (no Astro template body) that:

1. Bails early if `window.__codeCopyInit === true`. Otherwise sets the flag.
2. Bails early if `navigator?.clipboard?.writeText` is not a function. (Older browsers / insecure contexts simply get no copy behavior; the buttons remain inert. The site stays usable because manual select-and-copy still works.)
3. Attaches a single delegated `click` listener to `document`. Inside the listener:
   - `event.target.closest('.code-copy-button')` — bail if no match.
   - `button.closest('.code-block')?.querySelector('pre code')` — bail if not found.
   - `text = code.innerText` (using `innerText`, not `textContent`, so visible newlines between Shiki `<span class="line">` rows are preserved).
   - `await navigator.clipboard.writeText(text)`.
   - On success: hide the idle SVG (`[data-state="idle"]`), unhide the copied SVG (`[data-state="copied"]`), swap `aria-label` to the value of `data-copied-label`. After 1500 ms, reverse the swap.
   - On failure: catch and ignore. No UI change. (Future work could add a console.warn if needed; this spec stays silent to avoid log noise on shared infra.)

The script is mounted via `<CodeCopyButton />` placed once inside each post detail route's main template (location does not matter because the `<script is:inline>` tag is hoisted to `<head>` by Astro's bundler in dev and to a single module in build). The component file is ~30 lines.

### Wrapper markup

```html
<div class="code-block">
  <pre class="astro-code shiki" style="…"><code>…</code></pre>
  <button
    class="code-copy-button"
    type="button"
    aria-label="코드 복사"
    data-copied-label="복사됨"
  >
    <svg data-state="idle" viewBox="0 0 16 16" width="14" height="14" …>…</svg>
    <svg data-state="copied" viewBox="0 0 16 16" width="14" height="14" hidden …>…</svg>
  </button>
</div>
```

### Styling

CSS lives in `src/styles/global.css`, appended after the existing `.prose-site pre code` reset. The block is intentionally self-contained — it does not lean on `prose-*` utilities because the button is structural chrome, not prose content.

```css
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
  transition: opacity 150ms ease, color 150ms ease, border-color 150ms ease;
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

Exact pixel values may shift slightly during implementation based on visual review; the shape (top-right absolute, 28 px square, hairline, hover-only on desktop, always-on on mobile, 150 ms opacity transition, reduced-motion override) is fixed by this spec.

## Visual Treatment

- **Default reading state, desktop**: code blocks render exactly as today. The copy button is fully transparent and not focusable.
- **Hover (or any focus-within), desktop**: the button fades to full opacity over 150 ms in the top-right corner of the code block. The icon is a small clipboard glyph in `dawn-600` / `night-300`, sitting inside a 1 px hairline `dawn-300` / `night-600` border.
- **Hover on the button itself**: the icon and border shift one shade darker (`dawn-700` / `night-50` and `dawn-600` / `night-300`). No background fill, no shadow, no scale.
- **Focus-visible on the button**: same shift as hover. No browser default focus ring (`outline: none`) — the border-color change carries the focus indication. (Keyboard users still get the focus-within fade-in for the wrapper, plus the darker button border, so focus is never invisible.)
- **Click → success**: the clipboard glyph instantly swaps to a check glyph (no fade between icons; the swap is a hidden-attribute toggle). After 1500 ms the check swaps back to the clipboard.
- **Click → failure**: no visual change. The user is unaware the button was even clicked. They can still manually select and copy.
- **Mobile (`max-width: 767px`)**: the button is always at full opacity. Same colors, same border, same icon. Tapping triggers the same icon-swap feedback.
- **Reduced motion**: opacity / color transitions are removed. The button still appears on hover and the icon still swaps on click; only the easing is dropped.
- **Inside a callout**: same treatment. A `<pre class="astro-code">` nested inside `<aside class="callout">` is wrapped and gets a button just like a top-level code block.

## Constraints

- No new npm packages. The plugin is authored against Astro's already-resident unified / hast transitive deps.
- No client JavaScript outside the post detail routes. The `CodeCopyButton` component must not be mounted globally.
- No change to the Shiki dual-theme configuration in `astro.config.mjs`.
- No change to the `<pre class="astro-code">` color overrides in `global.css` (`html.dark .astro-code` and `.prose-site pre code` blocks). The wrapper `<div>` adds no new background and no new padding; the visual register of code blocks in non-hover state must look identical to today's pixel output.
- No copy-button telemetry, no event logging, no analytics hooks.
- The plugin must work for both locales without any locale-specific code beyond the label-table lookup. One plugin, one CSS block, both locales.
- The script must remain idempotent across re-mounts (`window.__codeCopyInit` guard). This is required because Astro view transitions can re-execute inline scripts on navigation.
- The script must not throw on browsers without `navigator.clipboard`. It silently no-ops.

## Verification Target

- `npm test` passes: all existing tests stay green, plus the new `rehype-code-copy-button` unit tests and the new assertions inside `post-detail-structure`.
- `npm run build` succeeds without warnings new to this change.
- Visiting any existing post with code blocks (e.g. `/posts/ethereum-keystore-encryption`, `/posts/iam-policy-checklist`) under `npm run dev`:
  - Hovering a code block on desktop fades a 28 px square button into the top-right corner.
  - Clicking the button copies the exact code text to the clipboard (verifiable by pasting into a terminal or text editor).
  - The clipboard icon swaps to a check icon for ~1.5 s, then reverts.
  - Tabbing to a code block focuses inside the wrapper (focus-within) and reveals the button without a mouse hover.
  - The button is invisible when the cursor leaves the code block.
- Visiting the same posts on a mobile viewport (≤767 px wide):
  - The button is visible at full opacity in the top-right corner of every code block.
  - Tapping it copies the code and swaps the icon for ~1.5 s.
- Visiting the English counterpart of any of these posts:
  - The button's `aria-label` is `Copy code` and the post-copy ARIA label is `Copied`. (Verifiable via DevTools accessibility tree.)
- A code block placed inside a `> [!NOTE]` callout receives the same wrapper and button.
- Empty fenced code blocks (zero-text) — none in the current post corpus, but constructed in unit tests — are not wrapped.
- Visiting a code block in dark mode: the button border stays a hairline `night-600`, the icon is `night-300`. No theme-bleed and no glaring contrast.
- `prefers-reduced-motion: reduce` (set via DevTools) removes the fade-in transition; the button still appears on hover, just instantly.
- The Shiki output (token colors, line layout) is pixel-identical in screenshots before and after this change at the non-hover baseline.
- `docs/spec-post-detail.md` now includes the "Code blocks" section.
- `docs/spec-roadmap.md` records the copy button as landed and mentions the rehype foundation.

## Test Plan

- **`tests/rehype-code-copy-button.test.ts`** (new): exercise the plugin against constructed hast inputs.
  - **Single Shiki block**: input has one `<pre class="astro-code">` with non-empty children. Output is a `<div class="code-block">` containing the original `<pre>` and a `<button class="code-copy-button">` with the ko-locale aria-label.
  - **Multiple blocks**: two `<pre class="astro-code">` siblings. Both get wrapped independently, each with its own button.
  - **Empty block**: `<pre class="astro-code">` whose recursive text is empty. Output is the original `<pre>` unchanged, no wrapper, no button.
  - **Non-Shiki `<pre>`**: `<pre>` without the `astro-code` class. Output is unchanged, no wrapper, no button.
  - **Locale split**: input run with `vfile.path = ".../blog/en/post/index.md"` produces `aria-label="Copy code"` and `data-copied-label="Copied"`. With `.../blog/ko/...` it produces the Korean labels. With no locale segment, falls back to ko (matching `remarkAdmonition`'s default).
  - **Inside callout**: a hast tree where `<pre class="astro-code">` is nested inside `<aside class="callout">`. The plugin still wraps it and produces a button. The `<aside>` itself is unchanged in structure.
  - **Idempotency**: running the plugin twice on the same hast tree produces the same output as running it once.
- **`tests/post-detail-structure.test.mjs`** (existing, extended): add two assertions — one for ko, one for en — that compile a fixture post containing code blocks and assert at least one `.code-copy-button` element exists in the rendered output. The fixture posts (`ethereum-keystore-encryption`, `iam-policy-checklist`) already have code blocks so no new content is needed.
- **Smoke**: `npm run build` succeeds. `pagefind --site dist` re-indexes without error. The built dist HTML for a sample post contains the `.code-block` wrapper.

## Documentation

- **New section in `docs/spec-post-detail.md`** — "Code blocks" — covering:
  - Default rendering: Shiki dual-theme via `astro.config.mjs`'s `shikiConfig` (unchanged).
  - Copy button behavior: hover-only on desktop, always visible on mobile, icon-only with idle / copied states, locale-aware ARIA, no toast.
  - Implementation hook: rehype plugin at `src/utils/rehypeCodeCopyButton.ts`. Future code-block features (line numbers, titles, etc.) extend or compose alongside this plugin.
  - Visual rules location: `src/styles/global.css` under `.code-block` and `.code-copy-button`.
- **Update `docs/spec-roadmap.md`** under item 3 ("In-Post Reading Experience"):
  - Add a Current State bullet noting the copy button has landed and that the rehype-stage foundation now exists for additional code-block features.
  - The roadmap remains in reactive-only mode otherwise; this spec does not unblock or schedule any further code-block work.

## Alternatives Considered

- **Pure runtime DOM mutation script** (no rehype plugin) — rejected during brainstorming. The button itself is static markup, only the click is dynamic; emitting it at build time matches the family used for figures and callouts. A runtime-only approach also produces a perceptible flicker on mobile (where the button is always-on) between first paint and JS execution.
- **Hybrid: rehype wraps `<pre>` only, runtime injects the button** — rejected. The wrapper alone has no value; once we're at the rehype stage, emitting the full button structure is the same complexity as emitting just the wrapper. Splitting halves of the same concern across two layers makes future code-block work harder.
- **Adopt `rehype-pretty-code`** — rejected for now. It would replace the existing Shiki configuration, force a particular UX for the copy button that may not match the site's hairline aesthetic, and add a dependency for a feature a ~50-line custom plugin handles directly. The library remains a viable migration path **if** the site eventually wants line numbers, line highlighting, file labels, and diff support together — at that point a single dependency replacing several custom plugins becomes the better trade.
- **Always-visible button (no hover gating)** — rejected. The editorial philosophy explicitly favors quiet, text-first UI; persistent chrome on every code block reads as portal-like. The hover-only pattern keeps the default reading view unchanged and reveals the button only when the user signals intent.
- **Text label (`Copy` / `복사`) instead of icon** — rejected. The hover-only pattern rewards a small visual footprint, and a text label expands the i18n surface (visible label needs translation, font-rendering review, RTL implications later). Icon swap (clipboard → check) for feedback is also more compact than swapping text labels (`Copy` → `Copied`).
- **Toast / floating "Copied!" banner** — rejected. The site's feedback vocabulary (TOC active state, reading progress fill) is in-place typographic / iconographic, not floating overlays. A toast would read as portal-style chrome and would appear above the page header — exactly the kind of element the editorial philosophy lists under "Avoid".
- **Show the language label in the corner alongside (or instead of) the copy button** — deferred. The site does not currently surface code-fence language metadata, and adding it is its own design question (visibility rules, label format, where it sits relative to the copy button). It is a natural extension of the rehype foundation when the time comes.
- **Telemetry on copy events** — rejected. The site does not run analytics today; there is no infrastructure to send events to and no editorial reason to start.
- **Bypass `navigator.clipboard` entirely with a `document.execCommand("copy")` fallback** — rejected. `execCommand` is deprecated; modern browsers all expose `navigator.clipboard` in secure contexts. The site is HTTPS in production and dev runs on `localhost` (also a secure context). The marginal coverage gain is not worth shipping a deprecated API.
