# Post Image Lightbox Design

**Date:** 2026-05-06

## Goal

Let readers tap any image inside a post body to expand it to a fullscreen lightbox, then tap or press Esc to dismiss. The expand/collapse motion is a Medium-style FLIP animation — the source image smoothly grows from its in-prose position to a centered fullscreen position over ~250ms, with a backdrop fading in behind it. The treatment stays in the site's quiet, deliberate voice: short transition, no chrome beyond a thin close affordance, no novel UX vocabulary.

## Decision

- Add a single new component, `src/components/PostImageLightbox.astro`, mounted on both post-detail routes (`src/pages/posts/[...slug].astro` and `src/pages/en/posts/[...slug].astro`). The home page, archive, taxonomy pages, and `/about` do not opt in.
- The component renders a hidden lightbox shell (backdrop + image holder + caption + close button) plus an inline `<script>` that wires up every `<img>` inside `article .prose-site` on the current post.
- All images inside the post body are zoomable — both `<figure>`-wrapped captioned images and bare decorative `<img>` from `remarkPostFigure`. Authors do not have to opt in or out per image.
- A `data-no-zoom` attribute on an `<img>` (or its parent `<figure>`) opts that single image out. The codebase ships with no usage of this attribute today; it exists only as a forward-compatible escape hatch for posts where zoom would actively confuse the reader (e.g. tiny inline icons added by future markdown extensions).
- The lightbox displays the image at the same `src` as the source `<img>`. If Astro's markdown pipeline has attached `srcset` and `sizes` to the source image, those are copied to the lightbox image as well, so when the lightbox renders the image at near-viewport size the browser can fetch the largest available candidate. No new asset-pipeline variant is added; the lightbox uses whatever the source image already exposes.
- The expand and collapse animations are a FLIP transform on the lightbox image: capture the source rect, position the lightbox image at its final rect (centered, max `90vw × 80vh`, aspect-ratio preserved), apply an inverse `translate()` + `scale()` so it visually overlaps the source, force reflow, then transition the transform to identity. The source `<img>` is hidden during this animation via `visibility: hidden` so the reader sees one image moving, not two. Duration is 250ms with `ease-out`, matching the existing `.theme-transition` rhythm.
- The backdrop crossfades in and out alongside the FLIP transform with the same 250ms timing.
- Close triggers (any one closes the lightbox): `Esc` key, click on the backdrop, click anywhere inside the lightbox image area, click on the explicit close button (top-right small × icon, the same shape vocabulary as `SearchModal`'s close button), or any page scroll input (`wheel`, `touchmove`, `keydown` on scroll-relevant keys).
- If the source image's parent is `<figure>` and that figure has a `<figcaption>`, the caption text appears beneath the lightbox image in the same italic-centered-muted style used inside the prose. Bare decorative images render in the lightbox without any caption block at all.
- The lightbox shell is rendered with `role="dialog"`, `aria-modal="true"`, an `aria-label` driven by the `lightbox.label` translation key, and `aria-hidden="true"` + `inert` while closed. On open, the close button receives focus; on close, focus returns to the source `<img>` (focusable via `tabindex="0"` only while the script has wired it up).
- New translation keys: `lightbox.label` ("확대된 이미지" / "Expanded image"), `lightbox.close` ("확대 닫기" / "Close zoomed image").
- No new npm dependency. The lightbox is implemented in vanilla JS in a single inline script, idempotent across re-mounts via `window.__postImageLightboxInit`, in line with `SearchModal.astro`, `TOC.astro`, and `ReadingProgress.astro`.

## Why

- The reader explicitly referenced Medium's image-zoom interaction. Medium's hallmark is the smooth FLIP-style growth, not a hard modal cut, so a plain `display: block` modal would miss the brief. A short 250ms FLIP transform reads as the same gesture without making the site feel like it's borrowing animation tokens from somewhere louder than the rest of the prose.
- The site's existing motion vocabulary is restrained and deliberate (250ms theme fade, no scroll easing on `ReadingProgress`, no decorative fades on `TOC` active state). Reusing the same 250ms `ease-out` keeps the lightbox feeling like part of the same family rather than a third-party widget.
- Wiring zoom on every image (instead of a per-image opt-in) matches the author's stated preference: "구분하는 게 글 쓸 때 귀찮음." The escape hatch (`data-no-zoom`) exists for the case where the rule turns out to be wrong, not as a routine authoring decision.
- Showing the original-resolution `.webp` is honest: the source files in `src/content/blog/**` already exist at higher resolution than the rendered prose column, and Astro's `srcset` already produces the candidate the browser needs at the larger lightbox size. Building a separate "lightbox-only" image variant would be solving a problem the author has not had — current post images are all under 60KB. If a future post introduces a 5MB photo, that's a separate spec.
- Vanilla JS over a library (`medium-zoom`, `lightgallery`, etc.) is consistent with the rest of the site, which has zero runtime JS dependencies. The behavior fits in ~150 lines of inline script. A library would add weight, an opinionated DOM contract, and a configuration surface the site does not need.
- Caption-in-lightbox parallels Medium and matches the editorial intent of the existing `<figcaption>` — if a caption is meaningful at column width, it stays meaningful at fullscreen. Hiding it would make the lightbox feel divorced from the prose context.
- Scroll-to-close is a Medium behavior that prevents the reader's intended "I want to see what's below" gesture from being eaten by the open lightbox; it's the highest-confidence "I'm done with this image" signal short of an explicit dismiss.

## Scope

### In scope

- New component `src/components/PostImageLightbox.astro` containing the lightbox shell markup and the inline activation script.
- Mount the component once per post-detail layout: in `src/pages/posts/[...slug].astro` and `src/pages/en/posts/[...slug].astro`. Both pass the page's `lang` so the component renders the right `aria-label` and close-button label.
- Two new translation keys (`lightbox.label`, `lightbox.close`) in `src/i18n/ui.ts`, with both ko and en values.
- A small CSS block in `src/styles/global.css` for:
  - The hidden/visible states of the lightbox shell.
  - The `cursor: zoom-in` affordance on `.prose-site img` (and `cursor: zoom-out` once the lightbox is open).
  - The lightbox's caption typography, mirroring the existing `.prose-site figcaption` rules.
  - The 250ms `ease-out` transition on the lightbox image's `transform` and the backdrop's `opacity`.
- Tests:
  - `tests/post-image-lightbox.test.ts`: render a representative post-detail page (the existing KeyStore post is the natural fixture) through the same `experimental_AstroContainer` pattern used elsewhere; assert the lightbox shell is present, has the expected dialog ARIA, includes a close button labeled by the translation key, and that the post-detail HTML embeds the activation script (recognizable by the `window.__postImageLightboxInit` guard string). The runtime-only `data-zoomable` markers are not asserted from the server-rendered HTML — the script attaches them in the browser and the test layer does not run a browser.
  - `tests/post-detail-structure.test.mjs` (existing): stays green; if any selector-based assertion needs to learn about the new shell, update it without changing what the test is validating.
- Documentation:
  - Update `docs/spec-post-detail.md` with a new "Image lightbox" section.
  - Update `docs/spec-roadmap.md` to record this work as landed under the relevant in-post-experience item.

### Out of scope

- Opt-in per-image zoom (the rule is "every image in `.prose-site`"; the escape hatch is `data-no-zoom`, not a positive opt-in).
- Pinch zoom, pan, or any in-lightbox manipulation beyond viewing the image at its rendered fit.
- Galleries, multi-image navigation (prev/next arrows, swipe-to-next), thumbnails, or any UX that treats a post's images as a connected set.
- A separate "lightbox-only" image asset variant or any extension to Astro's image pipeline.
- Zoom on images outside `.prose-site`: the `/about` avatar, the home hero, the header logo, social icons, etc.
- Print-stylesheet behavior. The lightbox is a screen-only affordance.
- View Transitions API integration. The FLIP transform implementation is browser-API-portable across all evergreen browsers; reaching for `document.startViewTransition` would add a code path that needs a non-API fallback for Firefox anyway, for no visible gain.
- Visual regression testing or screenshot diffing of the FLIP animation. The interactive motion is verified manually; the test layer covers structure and ARIA only.

## Architecture

### Component shape

`src/components/PostImageLightbox.astro` accepts a single prop:

```astro
---
interface Props {
  lang?: Locale;
}
---
```

It renders two pieces inside a single Astro component file:

1. **Markup**: the hidden lightbox shell. Structure (Tailwind utility names indicative, exact tokens settled at implementation):
   ```html
   <div data-post-lightbox aria-hidden="true" inert class="fixed inset-0 z-50 hidden">
     <button data-post-lightbox-backdrop tabindex="-1" aria-label="..." class="absolute inset-0 bg-dawn-100/95 dark:bg-night-900/95 backdrop-blur-sm"></button>
     <div role="dialog" aria-modal="true" aria-label="..." class="relative flex h-full w-full items-center justify-center px-6">
       <figure data-post-lightbox-figure class="m-0 flex flex-col items-center gap-3">
         <img data-post-lightbox-image alt="" />
         <figcaption data-post-lightbox-caption class="hidden text-sm italic text-dawn-600 dark:text-night-300"></figcaption>
       </figure>
       <button data-post-lightbox-close aria-label="..." class="absolute top-4 right-4 ...">×</button>
     </div>
   </div>
   ```
   The `z-50` matches `SearchModal`. `inert` keeps the shell out of focus order while closed. The backdrop is the same pattern `SearchModal` uses (a `<button>` with `tabindex="-1"` so click semantics work without participating in keyboard focus).

2. **Script** (`<script is:inline>`): a single IIFE guarded by `window.__postImageLightboxInit`. Responsibilities:
   - Find every `article .prose-site img`. For each:
     - Skip if `data-no-zoom` is present on the image or any ancestor up to the article root.
     - Skip if `img.complete === false` and `img.naturalWidth === 0` (let it bind on `load`).
     - Mark with `data-zoomable=""`, set `cursor: zoom-in` via the CSS class `[data-zoomable]:cursor-zoom-in` (or equivalent).
     - Bind `click` handler.
   - On click → open: capture `getBoundingClientRect()` of the source image, populate the lightbox `<img>`'s `src`/`srcset`/`sizes`/`alt` from the source, populate `<figcaption>` text from the closest `<figure> > figcaption` if any (else hide the caption), reveal the shell (`hidden` removed, `inert` removed, `aria-hidden="false"`), compute the final rect of the lightbox image after layout, then run the FLIP transform.
   - On any close trigger → close: re-run the FLIP transform inverted, listen for the `transitionend` event on the transform, then re-hide the shell, restore the source image's visibility, return focus.

### FLIP animation detail

Open:

1. `const startRect = sourceImg.getBoundingClientRect()`.
2. Show the shell (`display: flex`, `opacity: 0` on the backdrop and the lightbox image).
3. Let layout settle. The lightbox image has its natural intrinsic dimensions and is constrained via CSS `max-width: 90vw; max-height: 80vh; object-fit: contain`. Its final rect is `endRect = lightboxImg.getBoundingClientRect()`.
4. Compute the inverse transform: `dx = startRect.left - endRect.left; dy = startRect.top - endRect.top; sx = startRect.width / endRect.width`. The y-scale equals the x-scale because aspect ratio is preserved; pick `sx` (or average of both) — the spec leaves this to implementation.
5. Apply `transform: translate(${dx}px, ${dy}px) scale(${sx})` and `transform-origin: top left` on the lightbox image. Hide the source image with `visibility: hidden`.
6. Set the backdrop `opacity` to 0.
7. Force reflow (`void lightboxImg.offsetWidth`).
8. Set `transition: transform 250ms ease-out` on the lightbox image and `transition: opacity 250ms ease-out` on the backdrop. Remove the transform (back to identity) and set backdrop `opacity` to 1.
9. On `transitionend` for `transform`, clear the `transition` so the next open starts clean.

Close (any close trigger calls the same routine):

1. Re-capture the source image's current bounding rect (`startRect`) — this handles the case where the page has scrolled while the lightbox was open.
2. Apply `transform: translate(${dx}px, ${dy}px) scale(${sx})` to the lightbox image with the same 250ms `ease-out` transition. Animate backdrop `opacity` back to 0.
3. On `transitionend` for `transform`: hide the shell (`hidden`, `inert`, `aria-hidden="true"`), reset the lightbox image's transform/transition/src, restore the source image's `visibility`, return focus to the source image.

If the user triggers another close while a close is already animating (double Esc, etc.), the second trigger is a no-op.

### Caption population

When the source image's `closest('figure')` exists and contains a `<figcaption>`, the lightbox caption shows that text — `textContent`, not `innerHTML`, so the prose's caption styling drives the lightbox caption look without re-parsing markup. When there is no `<figure>` parent, or no `<figcaption>` child, the lightbox caption stays `hidden`.

### Close trigger wiring

- **Esc**: a `keydown` listener on `document` while the lightbox is open. Listener is added on open, removed on close.
- **Backdrop click**: `click` handler on the backdrop button.
- **Lightbox image click**: `click` handler on the lightbox `<img>` (and on the surrounding `<figure>` if the click lands on the caption).
- **Close button click**: `click` handler on the explicit close `<button>`.
- **Scroll**: while open, listen for `wheel`, `touchmove`, and `keydown` (Space, PageUp, PageDown, ArrowUp, ArrowDown, Home, End). Any of these triggers close. Listeners are added on open and removed on close.

The image-click case overlaps with the figure-click case. The implementation centralizes "click anywhere inside the dialog except the explicit close button" into a single dialog-level `click` handler, with the close button stopping propagation. Otherwise the close button would also trigger the dialog handler and double-close.

### Mounting

`PostImageLightbox` is added to:

- `src/pages/posts/[...slug].astro` — pass `lang="ko"`.
- `src/pages/en/posts/[...slug].astro` — pass `lang="en"`.

It is mounted **outside** the `<article>` (sibling, not descendant) so it cannot inherit prose typography rules and cannot be filtered by `data-pagefind-body`. A natural placement is just before the closing `</Layout>` so it is the last in-page node.

### Translation keys

Added to `src/i18n/ui.ts`:

- `lightbox.label` — ko: "확대된 이미지", en: "Expanded image"
- `lightbox.close` — ko: "확대 닫기", en: "Close zoomed image"

The component reads them via the existing `useTranslations(lang)` helper.

### CSS additions

Appended to `src/styles/global.css`, in the same band as the existing figure rules:

```css
.prose-site img[data-zoomable] {
  cursor: zoom-in;
}

[data-post-lightbox] {
  /* hidden state is handled via the `hidden` attribute / Tailwind class */
}
[data-post-lightbox][data-state="open"] [data-post-lightbox-image] {
  cursor: zoom-out;
}
[data-post-lightbox-image] {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  transform-origin: top left;
}
[data-post-lightbox-caption] {
  /* mirrors `.prose-site figcaption` colors and typography */
  font-size: 0.875rem;
  font-style: italic;
  text-align: center;
  color: rgb(86 95 137 / 1); /* dawn-600 */
  max-width: 90vw;
}
:where(.dark) [data-post-lightbox-caption] {
  color: rgb(115 122 162 / 1); /* night-300 */
}
```

The `transition` properties are applied via JS at animation time rather than always-on, so the lightbox image does not animate stray layout shifts from theme toggles or window resizes when closed.

## Visual Treatment

- **Backdrop**: `bg-dawn-100/95` in light mode, `bg-night-900/95` in dark mode, with `backdrop-blur-sm`. More opaque than `SearchModal`'s `bg-black/55` on purpose — the goal is to isolate the image visually, not preserve a sense of the page underneath.
- **Lightbox image**: rendered at the source `<img>`'s native `src` (and `srcset` / `sizes` if present), constrained to `max-width: 90vw` and `max-height: 80vh`, `object-fit: contain`. No frame, no shadow, no border-radius. The clean image is the point.
- **Caption**: italic, `text-sm`, centered, color matches the in-prose `<figcaption>` (dawn-600 / night-300). Sits 12px below the image. Hidden when the source had no caption.
- **Close button**: small circular outlined button at the top-right corner, same shape vocabulary as `SearchModal`'s close button (1.8 stroke × icon, dawn-300 / night-600 border, dawn-700 / night-200 stroke). Tab-focusable.
- **Cursor**: `zoom-in` on every zoomable in-prose image, `zoom-out` on the lightbox image while open.
- **No animation on the close button**, no spinner, no progress indicator. The transition is the only motion.

## Constraints

- No new npm package. No new Astro integration. No new content collection.
- The lightbox script is inline-only in the Astro component, idempotent across re-mounts via the `window.__postImageLightboxInit` flag — same convention as `SearchModal`, `TOC`, `ReadingProgress`.
- The lightbox is a post-detail-only feature. It must not appear on the home page, archive, taxonomy pages, `/about`, or the 404 page.
- Existing image rendering rules (`remarkPostFigure`, the `figure` and `figcaption` styling, the `#wide` variant) are not changed. The lightbox layers on top of them.
- The lightbox must work for both locales without locale branching beyond the two translation keys.
- The 250ms duration is fixed by this spec; the easing is fixed at `ease-out`. Any future tuning is its own spec.
- The implementation must not block scroll on `<body>` when the lightbox is open (the lightbox is dismissed by scroll, so locking scroll would defeat that interaction). It also must not introduce a layout shift on open (no scrollbar gutter changes).
- The script must not throw if a post contains zero images — the component is mounted unconditionally on all post-detail pages.

## Verification Target

- `npm test` passes: existing tests stay green and the new `post-image-lightbox` test asserts shell ARIA, close button presence, and zoomable-marker propagation.
- `npm run build` succeeds; `pagefind` indexes the built site without error; the rendered lightbox shell does not pollute the search index (the dialog sits outside `data-pagefind-body`).
- Manual checks in `npm run dev` on the KeyStore post (both ko and en):
  - Each `.webp` figure responds to a click by smoothly expanding to fullscreen with the backdrop fading in over ~250ms.
  - Caption text from `<figcaption>` appears below the lightbox image, in the same italic-centered-muted style as the in-prose caption.
  - Esc, backdrop click, image click, close-button click, and scroll input each close the lightbox with the reverse animation.
  - Keyboard tab order while open lands on the close button first, returns to the source image after close.
  - Light/dark mode each render the backdrop and caption in the matching palette.
  - Window resize while the lightbox is open closes the lightbox (the simplest deterministic behavior, chosen during brainstorming). The reader can re-open the image at the new viewport size.
  - On a fixture post with zero images, no console errors are emitted.
- Visiting any non-post page (home, `/about`, `/posts`, taxonomy pages, 404) does not include the lightbox shell in the rendered HTML.

## Test Plan

- **`tests/post-image-lightbox.test.ts`** (new):
  - Use the same compile-and-render pattern as `tests/post-detail-structure.test.mjs` to render a post-detail route (KeyStore part 1 ko and en).
  - Assert: the rendered HTML contains exactly one `[data-post-lightbox]` shell per page; the shell has `role="dialog"`, `aria-modal="true"`, `aria-hidden="true"`, `inert`; the close button's `aria-label` matches the locale-appropriate translation; the activation script is embedded (recognizable by the `__postImageLightboxInit` guard string).
  - Negative assertions: rendering a non-post page (home, `/about`) does not include `[data-post-lightbox]`.
- **`tests/post-detail-structure.test.mjs`** (existing): stays green. Update only if a brittle selector assertion clashes with the new shell.
- **`tests/post-figures-showcase.test.ts`** (existing): stays green. The lightbox does not change the rendered figure markup, only adds activation markers.
- **Smoke**: `npm run build` succeeds; the built `dist/` includes the lightbox shell on a sample post page.

## Documentation

- **New section in `docs/spec-post-detail.md`** — "Image lightbox":
  - Behavior summary (every prose image is zoomable, FLIP animation, the four-plus-one close triggers, caption mirrored from `<figcaption>`).
  - Author-facing notes: no opt-in needed; `data-no-zoom` on a `<figure>` or `<img>` is the (rarely used) escape hatch.
  - Visual treatment summary (backdrop opacity, caption typography, no frame, close-button vocabulary).
- **Update `docs/spec-roadmap.md`** under item 3 ("In-Post Reading Experience"):
  - Move "Image lightbox / zoom" out of the deferred / out-of-scope list (the post-figures spec explicitly listed it as out of scope) and into Current State.
- **Update `docs/superpowers/specs/2026-04-20-post-figures-design.md`** — note in a small footer or follow-up section that the "image lightbox / modal / zoom" out-of-scope item from that spec is now delivered by this spec, with a date and link. The post-figures spec is historical, so the addition is informational only and does not rewrite that spec's body.

## Alternatives Considered

- **Plain modal with no FLIP animation** — rejected. The brief explicitly cited Medium, whose hallmark is the smooth grow-from-position. A hard cut to a centered modal misses that brief and would feel less curated than the rest of the site's motion (250ms theme fade, deliberate scroll-spy).
- **Pinch-zoom / pan inside the lightbox** — deferred. Adds a UX vocabulary (gestures, momentum, double-tap-to-zoom-further) that none of the current images need, and the right answer for a future photo-heavy post would still be a separate spec.
- **`medium-zoom` or another off-the-shelf library** — rejected. The behavior fits in ~150 lines of inline JS, and the site has zero runtime JS deps today. A library would introduce a config surface, a stylesheet to override, and an upgrade cadence the rest of the site does not need.
- **View Transitions API** (`document.startViewTransition`) — rejected. The browser-native API would shorten the JS slightly in supporting browsers but still needs a non-API fallback (Firefox at the time of writing). The portable FLIP path produces the same visible motion across all evergreen browsers in one code path.
- **Per-image opt-in (`data-zoom` to enable)** — rejected. The author asked specifically not to make image-by-image zoom decisions while writing. The `data-no-zoom` escape hatch flips the default in the right direction (off by exception, not on by exception).
- **Generate a separate "lightbox-only" larger image variant** — rejected. The current post images are small (under 60KB each, max 1400px wide). Astro's existing `srcset` already exposes the full-resolution candidate. Adding a second pipeline variant solves a problem the author has not encountered.
- **Lock body scroll while the lightbox is open** — rejected. Scroll is one of the close triggers, so locking scroll would defeat that interaction. Letting the scroll input close the lightbox first and then proceed naturally is the better trade-off.
- **Show captions only as a toggle / hidden behind a hover** — rejected. Captions in the prose are part of the editorial reading; the lightbox is a magnification, not a different view. Mirroring the caption keeps the lightbox honest about what the image is.
