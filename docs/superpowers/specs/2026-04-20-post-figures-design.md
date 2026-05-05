# Post Figures Design

**Date:** 2026-04-20

## Goal

Give the blog a first-class way to render images inside posts as captioned `<figure>` editorial units, primarily for UI screenshots (AWS console, terminal output, code-editor captures). The system must stay inside the site's quiet, text-first voice: authors write plain markdown, the renderer auto-promotes standalone images to figures, the visual treatment is a thin frame that reads as editorial rather than decorative, and dark-mode screenshots do not glare. This is the first delivery under roadmap item 3 ("In-Post Reading Experience"), covering the `Image captions and figure handling` sub-area only.

## Decision

- Promote any standalone markdown image (a paragraph whose sole child is an image) to a `<figure>` via a new custom remark plugin, `remarkPostFigure`. Inline images (images mixed with surrounding text in the same paragraph) stay as bare `<img>`.
- Treat the markdown image's alt text as both the `alt` attribute and the `<figcaption>` content. An empty alt (`![](./img.png)`) renders a bare decorative `<img alt="">` with no figure wrapping.
- Support two width variants via a URL fragment on the src: no fragment → column width (default), `#wide` → bleeds ~64px outside the prose column on `md:` and up, falls back to column width below `md:`.
- Keep authoring in plain `.md`. Do **not** introduce `@astrojs/mdx`. Do **not** introduce any new image or figure Astro component — the remark plugin emits plain HTML.
- Migrate every post from a single `slug.md` file to a `slug/index.md` directory so every post can co-locate its image assets and the repo structure stays consistent across all 22 posts. Slugs do not change; `slug.md` and `slug/index.md` must resolve to the same URL (verified in the implementation plan before any migration work).
- Visual treatment is "soft frame": 1px `stone-200` / `stone-800` border on the image, 6px border-radius, no shadow, no background tint. Caption is italic, `text-sm`, muted (`text-stone-500` / `text-stone-400`), center-aligned, 12px below the image.
- Dark mode does not invert, dim, or recolor the image — the frame alone handles contrast.
- Ship one new example post (ko + en) that acts as a coverage fixture for the figure system and also surfaces how code blocks, links, inline code, and blockquotes render today. The fixture does not expand this spec's scope beyond figures; it only gives reviewers a single page to judge everything at once.

## Why

- UI screenshots are the author's stated primary use case (AWS console captures for guide-style posts), so the system is optimized for that shape. Screenshots almost always want an explanatory caption, which is why `alt = caption` with auto-figure-promotion is the right default — it makes the common case the shortest thing to write.
- A light-themed AWS console screenshot dropped into a dark-mode page reads as a glaring bright rectangle without a frame. The 1px border inside the existing stone palette contains the screenshot in both themes without adding visible chrome, and it echoes the thin-stroke icon language already present (`SiteLogo`, search icon, theme toggle).
- Keeping `.md` and avoiding MDX preserves the site's current markdown authoring pipeline, which has zero plugins and no custom components. A single focused remark plugin is a smaller surface area than adopting MDX and writing a `<Figure>` component, and it degrades gracefully (any markdown tool that does not run our plugin still sees a valid markdown image).
- Using a URL fragment (`#wide`) for the width hint keeps Astro's asset pipeline happy: the fragment is stripped before the path is resolved, so relative paths continue to work with the content-collections image pipeline.
- Moving every post (not just the ones that will carry images) into `slug/index.md` folders keeps the structural rule simple: "a post is always a folder". Mixing flat-file posts and folder-form posts would force every contributor to remember two structures.
- An authentic example post — a short AWS IAM reference — is a more honest way to demonstrate the system than a synthetic "lorem ipsum" fixture, and it legitimately earns a spot in the archive.

## Scope

### In scope

- New remark plugin at `src/utils/remarkPostFigure.ts`, matching the existing `src/utils/` convention for non-component code (see `src/utils/blog.ts`).
- Plug the new plugin into `astro.config.mjs` under `markdown.remarkPlugins`.
- Figure styling: a small block in `src/styles/global.css` covering `.prose figure`, `.prose figcaption`, and `.prose figure[data-width="wide"]`. Tailwind's `prose-*:` utilities cannot express the `data-width` attribute selector, so a CSS block is unavoidable.
- Migrate all 22 existing posts under `src/content/blog/{ko,en}/` from `slug.md` to `slug/index.md`. Contents of each post are unchanged.
- New example post `src/content/blog/ko/iam-policy-checklist/index.md` and `src/content/blog/en/iam-policy-checklist/index.md` with matching mock screenshot assets colocated in the same folder. The exact slug may be refined during implementation; this spec uses `iam-policy-checklist` as the canonical slug.
- Tests:
  - `tests/remark-post-figure.test.ts` — exercise the plugin's four input cases (standalone captioned image, standalone wide image, standalone empty-alt image, inline image inside a paragraph) against their expected HTML.
  - `tests/post-figures-showcase.test.ts` — render the example post through Astro and assert that all four figure cases, the three code-block languages, the inline link, and the blockquote appear in the expected output shape.
  - Keep `tests/post-detail-structure.test.mjs` green under the new `slug/index.md` layout; adjust only if a path-based assertion breaks.
- Documentation:
  - Update `docs/spec-post-detail.md` with a new "Figures" section describing the authoring syntax, width variants, and visual treatment.
  - Update `docs/spec-roadmap.md` so item 3's "Image captions and figure handling" bullet moves into Current State; the remaining sub-areas (structure cues, optional summary aids, long-post guidance) stay pending.

### Out of scope

- `<a>`, code block, inline `<code>`, and blockquote prose overrides. The example post includes all of these, but this spec does not change their styling. Any tuning found necessary after viewing the rendered post becomes a separate follow-up spec.
- Syntax-highlighting theme work. The site currently uses Astro's default single-theme Shiki configuration. Viewing code blocks in the example post may reveal this needs a dual-theme setup, but that becomes its own spec.
- `@astrojs/mdx`, `<Figure>` components, multi-image galleries, image lightbox / modal / zoom, lazy-load tuning, visual regression testing, EXIF handling, figure numbering, cross-references.
- Full-bleed (viewport-width) image variant. Only `column` and `wide` are supported; adding a third variant later is an additive change.
- Any change to `/about`, the home page, the header, the footer, or any non-post route.
- Any change to the content collection schema beyond what the directory migration requires.

## Architecture

### Content layout

Every post lives as a folder whose entry is `index.md`. Images for that post live as siblings of `index.md` in the same folder.

Before:
```
src/content/blog/ko/series-a-part-one.md
src/content/blog/en/series-a-part-one.md
```

After:
```
src/content/blog/ko/series-a-part-one/index.md
src/content/blog/en/series-a-part-one/index.md
src/content/blog/ko/iam-policy-checklist/index.md
src/content/blog/ko/iam-policy-checklist/iam-policies-list.png
src/content/blog/ko/iam-policy-checklist/iam-create-policy.png
src/content/blog/en/iam-policy-checklist/index.md
src/content/blog/en/iam-policy-checklist/iam-policies-list.png
src/content/blog/en/iam-policy-checklist/iam-create-policy.png
```

The content-collection glob (`pattern: "**/*.md"`) already matches both layouts. The implementation plan must verify, before migrating any post, that Astro generates the same slug (`series-a-part-one`) for both `series-a-part-one.md` and `series-a-part-one/index.md`. If it does not, the migration is paused and the spec is revisited.

### Authoring syntax

Authors write plain markdown. The remark plugin interprets four cases:

| Source markdown | Output HTML | Notes |
|---|---|---|
| `![Step 2: IAM 콘솔에서 새 정책 생성 폼을 연 모습](./iam-create.png)` alone on its own line | `<figure><img src="…" alt="Step 2: IAM 콘솔에서 새 정책 생성 폼을 연 모습"><figcaption>Step 2: IAM 콘솔에서 새 정책 생성 폼을 연 모습</figcaption></figure>` | Column width (default). |
| `![전체 콘솔 화면](./console-overview.png#wide)` alone on its own line | `<figure data-width="wide"><img src="…" alt="전체 콘솔 화면"><figcaption>전체 콘솔 화면</figcaption></figure>` | Wide variant. The `#wide` fragment is stripped before the src is emitted. |
| `![](./decorative.png)` alone on its own line | `<img src="…" alt="">` | Empty alt → no figure wrapping, no figcaption. Decorative. |
| A paragraph containing an image and surrounding text, e.g. `여기 ![inline](./small.png) 보시면` | `<p>여기 <img src="…" alt="inline"> 보시면</p>` | The plugin never promotes inline images. |

Authors do not import any component and do not use MDX. The markdown source stays readable in any viewer that does not run our remark plugin (those viewers will just see a normal image with the caption as alt text).

### Remark plugin: `remarkPostFigure`

The plugin walks the MDAST tree and, for every `paragraph` node whose children are exactly one `image` node (ignoring whitespace text nodes), applies one of the following rewrites based on the image's alt text:

- **Alt non-empty, no `#wide` fragment**: replace the paragraph with `<figure><img src="<stripped-src>" alt="<alt>"><figcaption><alt></figcaption></figure>`.
- **Alt non-empty, `#wide` fragment present**: same as above, but the root becomes `<figure data-width="wide">` and the `#wide` fragment is stripped from the emitted `src`.
- **Alt empty**: replace the paragraph with a bare `<img src="<stripped-src>" alt="">`. The image is NOT wrapped in a figure because an empty alt signals a decorative image.

Inline images (images that share a paragraph with other content) are left untouched; the plugin only acts on the standalone-image paragraph pattern. A `#wide` fragment on an inline image has no meaning and is not stripped — authors should place `#wide` only on standalone images.

The plugin runs at the remark stage (on the MDAST) and emits either raw-HTML nodes or the equivalent MDAST subtree that Astro's downstream pipeline will render to the same HTML. The exact node-type choice is an implementation-plan detail; the spec pins only the output HTML shape and the input-to-output mapping above.

### Astro config

`astro.config.mjs` gains a `markdown` block:

```js
markdown: {
  remarkPlugins: [remarkPostFigure],
}
```

No other Astro config fields change. No new integration is added.

### Styling

Figure styles live in `src/styles/global.css`, appended after the existing `@plugin "@tailwindcss/typography"` line. The block targets `.prose` descendants so the figure styles only apply inside rendered post bodies.

```css
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

Exact Tailwind utility mapping and final values may shift slightly during implementation, but the shape (margins, border, radius, italic centered caption, md+ wide bleed) is fixed by this spec.

Images that are NOT standalone (inline in a paragraph) receive no figure treatment and keep the default `prose` image rules. A follow-up spec can revisit inline-image styling if it becomes a problem.

### Content migration

Each of the 22 posts is migrated in two steps that happen together:

1. `git mv src/content/blog/<locale>/<slug>.md src/content/blog/<locale>/<slug>/index.md`.
2. Verify the post still renders under the same URL (`/posts/<slug>` in ko, `/en/posts/<slug>` in en).

The migration is a pure file move; post frontmatter and body content are untouched. Git recognizes the rename so blame history is preserved.

### Example post: `iam-policy-checklist`

The post is a short practical reference titled along the lines of "IAM 정책 만들 때 챙길 세 가지" in ko / "Three things to check when creating an IAM policy" in en. The body is around three sections and intentionally uses every feature that the fixture is meant to cover:

- **Figure cases** (all four):
  - A captioned column figure showing "policies list" mock screenshot.
  - A captioned wide figure showing "full IAM console" mock screenshot with `#wide`.
  - A decorative image (empty alt) — for example a small spacer or icon — that must render as a bare `<img>`.
  - An inline image inside a paragraph (for example, a small "click" cursor icon mid-sentence) that must NOT be promoted to a figure.
- **Code blocks** in three languages:
  - `json` — an IAM policy document.
  - `bash` — an `aws iam create-policy` CLI command.
  - `typescript` — a CDK or SDK usage snippet long enough to trigger horizontal scroll on narrow viewports.
- **Inline code**: a few `resource names` and `service identifiers` in running prose.
- **Links**: one external link to the AWS documentation, one internal cross-link to any existing post.
- **Blockquote**: one short tip-style quote, for visual calibration of the existing blockquote override.

The mock screenshot PNGs that ship in the folder are simple placeholder images (stone-palette rectangles with AWS-console-like labels) rather than real AWS captures. The author may later swap them for real screenshots; the fixture only needs images that exercise the rendering pipeline.

## Visual Treatment

- **Column figure, light mode**: image with a 1px `stone-200` border and 6px radius, centered in the prose column. Caption sits 12px below the image in italic `stone-500` text, centered.
- **Column figure, dark mode**: image border becomes 1px `stone-800`; caption becomes italic `stone-400`. Image content is NOT inverted or dimmed.
- **Wide figure**: identical framing, but the figure extends `md:-mx-16` outside the prose column at `md:` and up, giving wider content (AWS console overviews) more breathing room. Below `md:`, the figure falls back to column width.
- **Decorative image**: bare `<img>` with no frame, no caption, no extra margin beyond what `prose` already provides. The image reads as a small inline-feeling asset even when it sits on its own line.
- **Inline image**: whatever the current `prose` defaults do. This spec does not change that.
- **Caption typography**: italic, `text-sm` (~14px), center-aligned, stone-500 / stone-400. Line height is prose-default so multi-line captions read reasonably.

A mockup of the light and dark V2 treatments was reviewed during brainstorming; the approved version is the "soft frame" variant with center-aligned italic caption.

## Constraints

- No new npm packages for figures. The remark plugin is authored in-house against the existing `remark`/`unist-util-visit` transitive deps that ship with Astro's markdown pipeline.
- No new runtime JavaScript on the client. Everything is compile-time (remark + CSS).
- No change to existing posts' URLs, frontmatter shape, or body content.
- No change to existing in-prose overrides for `<a>`, code blocks, inline code, or blockquotes.
- The figure system must work for both locales without any locale-specific branching — one plugin, one CSS block, both locales.
- Any migration commit must not conflate file moves with content edits. Migration is a pure rename; figure feature work is separate.

## Verification Target

- `npm test` passes: all existing tests remain green, plus the new `remark-post-figure` unit tests and the new `post-figures-showcase` integration test.
- Visiting the ko and en versions of the example post in a running `npm run dev` shows:
  - A captioned column figure with a visible thin frame in both themes.
  - A captioned wide figure that bleeds outside the prose column on desktop and sits inside the column on mobile.
  - A decorative empty-alt image with no caption and no frame.
  - An inline image inside a paragraph that did not get promoted to a figure.
  - Three code blocks in `json`, `bash`, `typescript` rendering with the project's existing Shiki defaults and prose-pre overrides.
  - At least one inline link, at least one block quote, and a handful of inline code spans.
- Visiting every other existing post (ko + en) at its original URL shows the same post body as before the directory migration.
- In dark mode on any post with a figure, the screenshot does not appear as a glaring bright rectangle at the body/page boundary; the frame contains it.
- `docs/spec-post-detail.md` now includes the Figures section describing authoring syntax, width variants, and styling.
- `docs/spec-roadmap.md` now records "Image captions and figure handling" as landed under item 3.

## Test Plan

- **`tests/remark-post-figure.test.ts`** (new): construct small markdown inputs covering the four cases, run them through the plugin, and assert the resulting HTML matches the expected structure. Match by string regex where the output is stable (presence of `<figure>`, presence/absence of `<figcaption>`, presence/absence of `data-width="wide"`, fragment stripped from `src`, inline image left inside `<p>`).
- **`tests/post-figures-showcase.test.ts`** (new): use the same `@astrojs/compiler` + `experimental_AstroContainer` pattern already in the repo (see `tests/post-detail-structure.test.mjs`) to compile and render the example post's `[...slug]` route. Assert: four figure cases present in the correct shapes, three code-block `<pre>` elements with language classes, one blockquote, one `<a href>` pointing outside the site, and one `<a href>` pointing to another post's URL.
- **`tests/post-detail-structure.test.mjs`** (existing): must stay green. If any file-path assertion inside it breaks because of the directory migration, update to the new layout; do not change what the test is validating.
- **Smoke**: `npm run build` succeeds; `pagefind --site dist` re-indexes without error; the newly built site includes the example post in both locales' sitemaps.

## Documentation

- **New section in `docs/spec-post-detail.md`** — "Figures" — covering:
  - Authoring convention (`![caption](./img.png)` → figure; `![caption](./img.png#wide)` → wide figure; `![](./img.png)` → bare decorative image; inline images untouched).
  - Visual treatment summary (soft frame, italic centered caption, no image recoloring in dark mode).
  - File layout rule (images live next to `index.md` in the post's folder).
- **Update `docs/spec-roadmap.md`** under item 3 ("In-Post Reading Experience"):
  - Move "Image captions and figure handling" out of Next Likely Work and into Current State.
  - Preserve the remaining sub-areas (structure cues, optional summary aids, long-post guidance) as still-pending.

## Alternatives Considered

- **Adopt `@astrojs/mdx` and a `<Figure>` component** — rejected: the site has zero MDX today, adopting it adds a full integration for a single feature that a 40-line remark plugin can handle. MDX also introduces import/component-reference friction for every future post.
- **Use markdown title slot for caption (`![alt](src "caption")`)** — rejected during brainstorming: marginally more semantically correct (alt and caption diverge in role), but the title syntax is under-discovered and forces authors to write two texts per image. For a screenshot-heavy blog the alt-as-caption shortcut wins on authoring ergonomics; the semantic nicety can be added later as an override if needed.
- **Promote every image, including inline, to a figure** — rejected: inline images exist specifically to sit next to prose, and wrapping them in `<figure>` would introduce block-level breaks mid-sentence.
- **Convert only the posts that need images into folders** — rejected per the brainstorming discussion: mixing flat-file posts and folder-form posts would force contributors to memorize two structures and would make tooling assume both shapes forever.
- **Support a third `full-bleed` width variant** — deferred: for a text-first screenshot-focused blog, viewport-wide images would dominate the layout and fight the editorial voice. Easy to add later if needed.
- **Invert or dim light-theme screenshots in dark mode** — rejected: inverting a screenshot lies about what the real UI looks like, and dimming makes text inside the screenshot unreadable. The frame does the necessary contrast work without falsifying the image.
- **Pull in an existing remark figure-caption plugin** (e.g. `remark-figure-caption`, `@microflash/remark-figure-caption`) — considered. Rejected in favor of a small in-house plugin because (a) the four cases we care about fit in a short, auditable file; (b) we want precise control over the `#wide` fragment parsing rule; (c) avoiding one more external dependency is consistent with the rest of the repo.

---

## Follow-up: Image lightbox (2026-05-06)

The "image lightbox / modal / zoom" item listed under Out of Scope of this spec was delivered on 2026-05-06 by `docs/superpowers/specs/2026-05-06-post-image-lightbox-design.md`. The lightbox layers on top of this spec's figure system without changing the rendered figure markup; the activation script only adds runtime markers (`data-zoomable`) and click handlers to the existing `<img>` elements.
