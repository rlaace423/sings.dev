# Post Image Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Medium-style click-to-zoom lightbox for every image inside post bodies, with a 250ms FLIP expand/collapse animation, mirrored figcaption, and four close triggers (Esc, backdrop, image click, scroll) plus an explicit close button.

**Architecture:** A single new Astro component, `src/components/PostImageLightbox.astro`, mounts on both post-detail routes. It renders a hidden lightbox shell (backdrop + image holder + caption + close button) and an inline activation script that finds every `<img>` inside `article .prose-site`, attaches click handlers, and runs the FLIP transform on open/close. No external library; no new asset-pipeline variant; original-resolution image served via the existing `srcset` Astro emits.

**Tech Stack:** Astro 6, Tailwind 4 (utility classes for static styles), one small block of vanilla CSS in `src/styles/global.css` for the runtime-set `data-zoomable` cursor, Node test runner with `experimental_AstroContainer` for structural tests.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `src/i18n/ui.ts` | Modify | Add `lightbox.label` and `lightbox.close` translation keys for ko + en. |
| `src/components/PostImageLightbox.astro` | Create | Lightbox shell markup + inline activation script (FLIP open/close + close triggers). |
| `src/pages/posts/[...slug].astro` | Modify | Mount `<PostImageLightbox lang="ko" />` after `</article>`. |
| `src/pages/en/posts/[...slug].astro` | Modify | Mount `<PostImageLightbox lang="en" />` after `</article>`. |
| `src/styles/global.css` | Modify | Add `.prose-site img[data-zoomable] { cursor: zoom-in; }` rule (runtime-set attribute, can't be a Tailwind utility class). |
| `tests/post-image-lightbox.test.mjs` | Create | Component-rendering test (shell ARIA + close button label + activation script guard) + file-content tests for page mounting. |
| `docs/spec-post-detail.md` | Modify | Add a new "Image lightbox" section after the Figures section. |
| `docs/spec-roadmap.md` | Modify | Add a Current State bullet for the lightbox. |
| `docs/superpowers/specs/2026-04-20-post-figures-design.md` | Modify | Append a small follow-up footer noting the "image lightbox / modal / zoom" out-of-scope item is now delivered. |

---

## Task 1: Add lightbox translation keys

**Files:**
- Modify: `src/i18n/ui.ts`

- [ ] **Step 1: Add the two translation keys to both locale blocks**

Open `src/i18n/ui.ts`. Inside the `ko` object, after the `"search.close": "검색 닫기",` line, add:

```ts
		"lightbox.label": "확대된 이미지",
		"lightbox.close": "확대 닫기",
```

Inside the `en` object, after the `"search.close": "Close search",` line, add:

```ts
		"lightbox.label": "Expanded image",
		"lightbox.close": "Close zoomed image",
```

The existing `TranslationKey` type is `keyof (typeof ui)[typeof defaultLocale]`, so the two new keys become valid translation keys automatically without further type changes.

- [ ] **Step 2: Run existing tests to confirm no regression**

Run: `npm test`

Expected: All existing tests pass (the suite runs `node --experimental-strip-types --test`).

- [ ] **Step 3: Commit**

```bash
git add src/i18n/ui.ts
git commit -m "$(cat <<'EOF'
feat(i18n): add lightbox label + close translation keys

Adds `lightbox.label` and `lightbox.close` for both ko and en, used
by the upcoming PostImageLightbox component for the dialog aria-label
and the explicit close button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create the PostImageLightbox component with its structural test

**Files:**
- Create: `tests/post-image-lightbox.test.mjs`
- Create: `src/components/PostImageLightbox.astro`

- [ ] **Step 1: Write the failing test**

Create `tests/post-image-lightbox.test.mjs` with the following content:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoLightboxUrl = new URL(
	"../src/components/PostImageLightbox.astro",
	import.meta.url,
);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderLightbox(props) {
	const source = await readFile(repoLightboxUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoLightboxUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "post-lightbox-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const componentPath = join(tempDir, "component.ts");

	try {
		await writeFile(
			runtimeStubPath,
			[
				`export * from ${JSON.stringify(astroRuntimeUrl)};`,
				"export const createMetadata = () => ({})",
				"",
			].join("\n"),
		);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		rewritten = rewritten.replaceAll("../i18n/ui", repoUiUrl);

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

test("PostImageLightbox renders a hidden dialog shell with the right ARIA", async () => {
	const rendered = await renderLightbox({ lang: "ko" });

	assert.match(rendered, /<div[^>]*data-post-lightbox/);
	assert.match(rendered, /aria-hidden="true"/);
	assert.match(rendered, /\binert\b/);
	assert.match(rendered, /class="[^"]*hidden/);
	assert.match(rendered, /role="dialog"/);
	assert.match(rendered, /aria-modal="true"/);
});

test("PostImageLightbox renders a backdrop button, an image holder, a caption, and a close button (ko labels)", async () => {
	const rendered = await renderLightbox({ lang: "ko" });

	assert.match(rendered, /<button[^>]*data-post-lightbox-backdrop/);
	assert.match(rendered, /<img[^>]*data-post-lightbox-image/);
	assert.match(rendered, /<figcaption[^>]*data-post-lightbox-caption/);
	assert.match(rendered, /<button[^>]*data-post-lightbox-close[^>]*aria-label="확대 닫기"/);
	assert.match(rendered, /aria-label="확대된 이미지"/);
});

test("PostImageLightbox uses the English labels when lang=en", async () => {
	const rendered = await renderLightbox({ lang: "en" });

	assert.match(
		rendered,
		/<button[^>]*data-post-lightbox-close[^>]*aria-label="Close zoomed image"/,
	);
	assert.match(rendered, /aria-label="Expanded image"/);
});

test("PostImageLightbox embeds the activation script behind a window guard", async () => {
	const rendered = await renderLightbox({ lang: "ko" });

	assert.match(rendered, /window\.__postImageLightboxInit/);
	assert.match(rendered, /article \.prose-site img/);
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `node --experimental-strip-types --test tests/post-image-lightbox.test.mjs`

Expected: All four tests fail because `src/components/PostImageLightbox.astro` does not exist (the dynamic import will throw).

- [ ] **Step 3: Create the component**

Create `src/components/PostImageLightbox.astro` with the following content:

```astro
---
import { defaultLocale, type Locale, isLocale, useTranslations } from "../i18n/ui";

interface Props {
	lang?: Locale;
}

const { lang: langProp = defaultLocale } = Astro.props;
const lang = isLocale(langProp) ? langProp : defaultLocale;
const t = useTranslations(lang);
---

<div
	data-post-lightbox
	aria-hidden="true"
	inert
	class="fixed inset-0 z-50 hidden"
>
	<button
		type="button"
		data-post-lightbox-backdrop
		tabindex="-1"
		aria-label={t("lightbox.close")}
		class="absolute inset-0 bg-dawn-100/95 backdrop-blur-sm dark:bg-night-900/95"
	></button>

	<div
		role="dialog"
		aria-modal="true"
		aria-label={t("lightbox.label")}
		class="relative flex h-full w-full items-center justify-center px-6"
	>
		<figure class="m-0 flex max-w-full flex-col items-center gap-3">
			<img
				data-post-lightbox-image
				alt=""
				class="max-h-[80vh] max-w-[90vw] origin-top-left object-contain cursor-zoom-out"
			/>
			<figcaption
				data-post-lightbox-caption
				class="hidden max-w-[90vw] text-center text-sm italic text-dawn-600 dark:text-night-300"
			></figcaption>
		</figure>

		<button
			type="button"
			data-post-lightbox-close
			aria-label={t("lightbox.close")}
			class="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-dawn-300 text-dawn-700 transition-colors hover:text-dawn-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dawn-100 dark:border-night-600 dark:text-night-200 dark:hover:text-night-50 dark:focus-visible:ring-night-500 dark:focus-visible:ring-offset-night-800"
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M18 6 6 18"></path>
				<path d="m6 6 12 12"></path>
			</svg>
		</button>
	</div>
</div>

<script is:inline>
	(() => {
		if (window.__postImageLightboxInit) return;
		window.__postImageLightboxInit = true;

		const shell = document.querySelector("[data-post-lightbox]");
		if (!(shell instanceof HTMLElement)) return;

		const backdrop = shell.querySelector("[data-post-lightbox-backdrop]");
		const dialog = shell.querySelector('[role="dialog"]');
		const lightboxImg = shell.querySelector("[data-post-lightbox-image]");
		const caption = shell.querySelector("[data-post-lightbox-caption]");
		const closeButton = shell.querySelector("[data-post-lightbox-close]");

		if (
			!(backdrop instanceof HTMLElement) ||
			!(dialog instanceof HTMLElement) ||
			!(lightboxImg instanceof HTMLImageElement) ||
			!(caption instanceof HTMLElement) ||
			!(closeButton instanceof HTMLButtonElement)
		) {
			return;
		}

		const TRANSITION_MS = 250;
		const SCROLL_KEYS = new Set([
			" ",
			"PageUp",
			"PageDown",
			"ArrowUp",
			"ArrowDown",
			"Home",
			"End",
		]);

		let activeImage = null;
		let isAnimating = false;

		const findCaption = (img) => {
			const figure = img.closest("figure");
			if (!figure) return "";
			const figcap = figure.querySelector("figcaption");
			return figcap ? figcap.textContent || "" : "";
		};

		const setShellOpen = (open) => {
			shell.classList.toggle("hidden", !open);
			shell.setAttribute("aria-hidden", open ? "false" : "true");
			if (open) {
				shell.removeAttribute("inert");
				shell.dataset.state = "open";
			} else {
				shell.setAttribute("inert", "");
				delete shell.dataset.state;
			}
		};

		const onKeyDown = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				closeLightbox();
				return;
			}
			if (SCROLL_KEYS.has(event.key)) {
				closeLightbox();
			}
		};

		const onScrollClose = () => closeLightbox();
		const onResizeClose = () => closeLightbox();

		const onDialogClick = (event) => {
			if (
				event.target === closeButton ||
				(event.target instanceof Node && closeButton.contains(event.target))
			) {
				return;
			}
			closeLightbox();
		};

		const addCloseListeners = () => {
			document.addEventListener("keydown", onKeyDown);
			window.addEventListener("wheel", onScrollClose, { passive: true });
			window.addEventListener("touchmove", onScrollClose, { passive: true });
			window.addEventListener("resize", onResizeClose);
			backdrop.addEventListener("click", closeLightbox);
			dialog.addEventListener("click", onDialogClick);
			closeButton.addEventListener("click", closeLightbox);
		};

		const removeCloseListeners = () => {
			document.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("wheel", onScrollClose);
			window.removeEventListener("touchmove", onScrollClose);
			window.removeEventListener("resize", onResizeClose);
			backdrop.removeEventListener("click", closeLightbox);
			dialog.removeEventListener("click", onDialogClick);
			closeButton.removeEventListener("click", closeLightbox);
		};

		function openLightbox(img) {
			if (isAnimating || activeImage) return;
			if (!img.complete || img.naturalWidth === 0) return;

			activeImage = img;
			isAnimating = true;

			lightboxImg.src = img.currentSrc || img.src;
			if (img.srcset) lightboxImg.srcset = img.srcset;
			else lightboxImg.removeAttribute("srcset");
			if (img.sizes) lightboxImg.sizes = img.sizes;
			else lightboxImg.removeAttribute("sizes");
			lightboxImg.alt = img.alt || "";

			const captionText = findCaption(img);
			if (captionText) {
				caption.textContent = captionText;
				caption.classList.remove("hidden");
			} else {
				caption.textContent = "";
				caption.classList.add("hidden");
			}

			setShellOpen(true);
			backdrop.style.opacity = "0";
			lightboxImg.style.transition = "none";
			lightboxImg.style.transform = "none";

			const startRect = img.getBoundingClientRect();
			const endRect = lightboxImg.getBoundingClientRect();
			const dx = startRect.left - endRect.left;
			const dy = startRect.top - endRect.top;
			const scale = endRect.width === 0 ? 1 : startRect.width / endRect.width;

			lightboxImg.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
			img.style.visibility = "hidden";

			void lightboxImg.offsetWidth;

			lightboxImg.style.transition = `transform ${TRANSITION_MS}ms ease-out`;
			backdrop.style.transition = `opacity ${TRANSITION_MS}ms ease-out`;
			lightboxImg.style.transform = "";
			backdrop.style.opacity = "";

			const onEnd = (event) => {
				if (event.propertyName !== "transform") return;
				lightboxImg.removeEventListener("transitionend", onEnd);
				lightboxImg.style.transition = "";
				isAnimating = false;
				closeButton.focus();
				addCloseListeners();
			};
			lightboxImg.addEventListener("transitionend", onEnd);
		}

		function closeLightbox() {
			if (!activeImage || isAnimating) return;
			isAnimating = true;
			removeCloseListeners();

			const img = activeImage;
			const startRect = img.getBoundingClientRect();
			const endRect = lightboxImg.getBoundingClientRect();
			const dx = startRect.left - endRect.left;
			const dy = startRect.top - endRect.top;
			const scale = endRect.width === 0 ? 1 : startRect.width / endRect.width;

			lightboxImg.style.transition = `transform ${TRANSITION_MS}ms ease-out`;
			backdrop.style.transition = `opacity ${TRANSITION_MS}ms ease-out`;
			lightboxImg.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
			backdrop.style.opacity = "0";

			const onEnd = (event) => {
				if (event.propertyName !== "transform") return;
				lightboxImg.removeEventListener("transitionend", onEnd);

				setShellOpen(false);
				lightboxImg.style.transition = "";
				lightboxImg.style.transform = "";
				backdrop.style.transition = "";
				backdrop.style.opacity = "";
				lightboxImg.removeAttribute("src");
				lightboxImg.removeAttribute("srcset");
				lightboxImg.removeAttribute("sizes");

				img.style.visibility = "";
				img.focus();

				activeImage = null;
				isAnimating = false;
			};
			lightboxImg.addEventListener("transitionend", onEnd);
		}

		const article = document.querySelector("article .prose-site");
		if (!article) return;

		const wireImage = (img) => {
			if (img.dataset.zoomable !== undefined) return;
			if (img.closest("[data-no-zoom]") || img.dataset.noZoom !== undefined) return;
			img.dataset.zoomable = "";
			img.setAttribute("tabindex", "0");
			img.addEventListener("click", () => openLightbox(img));
		};

		const images = article.querySelectorAll("img");
		images.forEach((img) => {
			if (img.complete && img.naturalWidth > 0) {
				wireImage(img);
			} else {
				img.addEventListener("load", () => wireImage(img), { once: true });
			}
		});
	})();
</script>
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `node --experimental-strip-types --test tests/post-image-lightbox.test.mjs`

Expected: All four tests pass.

- [ ] **Step 5: Run the full test suite to confirm no regression**

Run: `npm test`

Expected: All tests pass, including pre-existing ones.

- [ ] **Step 6: Commit**

```bash
git add src/components/PostImageLightbox.astro tests/post-image-lightbox.test.mjs
git commit -m "$(cat <<'EOF'
feat: PostImageLightbox component with FLIP open/close behavior

Renders a hidden dialog shell (backdrop + image holder + figcaption +
explicit close button) and wires every <img> inside article.prose-site
with a click handler that opens a Medium-style 250ms FLIP zoom. Esc,
backdrop click, image click, scroll input (wheel/touch/scroll-keys),
window resize, and the close button each dismiss the lightbox.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Mount the component on both post-detail pages

**Files:**
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/pages/en/posts/[...slug].astro`
- Modify: `tests/post-image-lightbox.test.mjs` (add page-mount file-content checks)

- [ ] **Step 1: Add the page-mount file-content tests (failing)**

Append to the bottom of `tests/post-image-lightbox.test.mjs`:

```js
test("ko post-detail page imports and mounts PostImageLightbox", async () => {
	const source = await readFile(
		new URL("../src/pages/posts/[...slug].astro", import.meta.url),
		"utf8",
	);
	assert.match(source, /import PostImageLightbox from "\.\.\/\.\.\/components\/PostImageLightbox\.astro";/);
	assert.match(source, /<PostImageLightbox lang="ko" \/>/);
});

test("en post-detail page imports and mounts PostImageLightbox", async () => {
	const source = await readFile(
		new URL("../src/pages/en/posts/[...slug].astro", import.meta.url),
		"utf8",
	);
	assert.match(source, /import PostImageLightbox from "\.\.\/\.\.\/\.\.\/components\/PostImageLightbox\.astro";/);
	assert.match(source, /<PostImageLightbox lang="en" \/>/);
});
```

- [ ] **Step 2: Run the test, confirm the new tests fail**

Run: `node --experimental-strip-types --test tests/post-image-lightbox.test.mjs`

Expected: The four pre-existing tests still pass; the two new tests fail because the pages do not yet import or mount `PostImageLightbox`.

- [ ] **Step 3: Add the import and mount to the ko page**

Open `src/pages/posts/[...slug].astro`. In the import block (around lines 2-21), add this import alongside the existing component imports (alphabetically: between `PostHeader` and `PostReadingFlow`):

```astro
import PostImageLightbox from "../../components/PostImageLightbox.astro";
```

In the JSX body, add the lightbox mount as the last child of `<Layout>`, immediately after the `</article>` closing tag:

```astro
		</article>

		<PostImageLightbox lang="ko" />
	</Layout>
```

For clarity, the relevant tail of the file changes from:

```astro
		</article>
	</Layout>
```

to:

```astro
		</article>

		<PostImageLightbox lang="ko" />
	</Layout>
```

- [ ] **Step 4: Add the import and mount to the en page**

Open `src/pages/en/posts/[...slug].astro`. Add the import (alphabetically alongside the others):

```astro
import PostImageLightbox from "../../../components/PostImageLightbox.astro";
```

Add the mount as the last child of `<Layout>`, immediately after the `</article>` closing tag, with `lang="en"`:

```astro
		</article>

		<PostImageLightbox lang="en" />
	</Layout>
```

- [ ] **Step 5: Run the test, confirm all six tests pass**

Run: `node --experimental-strip-types --test tests/post-image-lightbox.test.mjs`

Expected: All six tests pass.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`

Expected: All tests pass.

- [ ] **Step 7: Manual smoke check via dev server**

Start the dev server: `npm run dev`

Open the KeyStore post in both locales:
- http://localhost:4321/posts/ethereum-keystore-encryption/
- http://localhost:4321/en/posts/ethereum-keystore-encryption/

For each locale, verify by hand:
1. The cursor over each in-prose image shows nothing yet (CSS not applied — that's Task 4).
2. Clicking any in-prose image opens the lightbox: backdrop fades in, the image smoothly grows from its in-prose position to a centered fullscreen position over ~250ms.
3. The figure caption appears below the lightbox image, italic and centered.
4. Each of the close triggers dismisses the lightbox with the reverse animation:
   - Press Esc.
   - Click the backdrop.
   - Click anywhere inside the lightbox image area (but not the close button).
   - Click the explicit × close button at top-right.
   - Scroll with the mouse wheel.
   - Scroll with arrow keys / Page Down.
   - Touch-scroll on a touch device (or simulate via DevTools).
   - Resize the window.
5. After close, focus returns to the source image.
6. Toggle dark mode while the lightbox is open: backdrop and caption color update without breaking the open state.
7. Open a non-post page (e.g. `/`, `/about`, `/posts`): no lightbox shell is in the DOM (verify in DevTools Elements panel — search for `data-post-lightbox`).
8. Open a post that has no images: no console errors. (Most posts in the repo have no images; pick any non-keystore post.)

If any check fails, fix the underlying issue in `src/components/PostImageLightbox.astro` and re-verify before committing.

- [ ] **Step 8: Commit**

```bash
git add src/pages/posts/[...slug].astro src/pages/en/posts/[...slug].astro tests/post-image-lightbox.test.mjs
git commit -m "$(cat <<'EOF'
feat: mount PostImageLightbox on both post-detail routes

Adds the lightbox shell + activation script to ko and en post-detail
pages. The lightbox sits outside the <article data-pagefind-body> so it
does not pollute the search index. Other surfaces (home, archive,
taxonomy, /about, 404) intentionally do not mount it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add the runtime cursor CSS

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Append the cursor rule to global.css**

Open `src/styles/global.css`. Append the following block at the end of the file:

```css
/*
 * Image lightbox affordance.
 * The activation script in `PostImageLightbox.astro` adds `data-zoomable`
 * to every <img> inside `article .prose-site` after wiring its click
 * handler. Because this attribute is set at runtime (not at build time),
 * Tailwind's JIT cannot generate a utility class for it from the source
 * — a small CSS rule is the simplest way to express the cursor affordance.
 * Decorative images (no <figcaption>) and captioned figures share the
 * same affordance: every prose-body image is zoomable.
 */
.prose-site img[data-zoomable] {
	cursor: zoom-in;
}
```

- [ ] **Step 2: Manual smoke check**

Restart the dev server if needed: `npm run dev`

Visit the KeyStore post (`/posts/ethereum-keystore-encryption/`). Verify:
1. Hovering over any in-prose image shows the `zoom-in` cursor.
2. Click an image to open the lightbox. Hovering over the lightbox image shows the `zoom-out` cursor (this comes from the `cursor-zoom-out` Tailwind class set in the component markup, no CSS change needed).
3. After closing, hover over a different in-prose image — `zoom-in` cursor is back.

- [ ] **Step 3: Run the test suite**

Run: `npm test`

Expected: All tests still pass (the CSS change does not affect any test).

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "$(cat <<'EOF'
feat(styles): zoom-in cursor for in-prose images

Adds a single CSS rule that applies `cursor: zoom-in` whenever the
PostImageLightbox activation script has marked an image as zoomable
at runtime. Tailwind cannot generate a class for a runtime-set
attribute, so a small global.css block carries the affordance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update specs and roadmap

**Files:**
- Modify: `docs/spec-post-detail.md`
- Modify: `docs/spec-roadmap.md`
- Modify: `docs/superpowers/specs/2026-04-20-post-figures-design.md`

- [ ] **Step 1: Add the Image Lightbox section to spec-post-detail.md**

Open `docs/spec-post-detail.md`. After the existing "Figures in Post Bodies" section (which ends around line 116 with the `Post ID normalization for folder-form posts...` bullet), append the following new section:

```markdown
## Image Lightbox

- **Behavior**:
  - Every `<img>` inside `article .prose-site` on a post-detail page is zoomable. Authors do not opt in per image.
  - `data-no-zoom` on a `<figure>` or an `<img>` is the (rarely needed) escape hatch for opting a single image out.
  - Clicking a zoomable image opens a centered fullscreen lightbox via a 250ms `ease-out` FLIP transform. The backdrop fades in over the same window.
  - Five close triggers: Esc, backdrop click, click anywhere on the lightbox image area, click on the explicit × close button at the top-right, any scroll input (`wheel`, `touchmove`, scroll-related keys), or window resize. Each runs the reverse animation.
  - If the source image's parent `<figure>` carries a `<figcaption>`, the lightbox shows that caption beneath the image in the same italic-centered-muted style as the in-prose caption. Decorative images (empty `alt`, no `<figure>`) render in the lightbox without a caption block.
  - Focus management: on open, focus moves to the close button; on close, focus returns to the source image.
- **Visual treatment**:
  - Backdrop: `dawn-100/95` (light) / `night-900/95` (dark) with `backdrop-blur-sm`. More opaque than the search modal on purpose — the image is the focus.
  - Lightbox image: rendered at the source `<img>`'s `src` and `srcset` (the browser fetches the largest candidate the source already exposes), capped at `90vw × 80vh` with `object-fit: contain`. No frame, no shadow, no border-radius.
  - Cursor: `zoom-in` on every in-prose `<img>` once the activation script has marked it; `zoom-out` on the lightbox image while open.
- **Implementation location**:
  - Component: `src/components/PostImageLightbox.astro` (markup + inline activation script). Mounted on `src/pages/posts/[...slug].astro` and `src/pages/en/posts/[...slug].astro`, just after `</article>`.
  - Translation keys: `lightbox.label` and `lightbox.close` in `src/i18n/ui.ts`.
  - Cursor rule: `.prose-site img[data-zoomable]` in `src/styles/global.css`.
- **Out of scope**: per-image opt-in, pinch zoom or pan, multi-image gallery navigation, a separate "lightbox-only" image asset variant. See `docs/superpowers/specs/2026-05-06-post-image-lightbox-design.md` for the full design.
```

- [ ] **Step 2: Add a Current State bullet to spec-roadmap.md**

Open `docs/spec-roadmap.md`. In the "Current State" list (lines 11-29), append a new bullet at the end:

```markdown
- Post-body image lightbox landed: every `<img>` inside `article .prose-site` on a post-detail page expands into a centered fullscreen view via a 250ms FLIP zoom, with caption mirrored from `<figcaption>` and five close triggers (Esc, backdrop, image click, scroll input, resize) plus an explicit × button. Mounted only on `[...slug].astro`. See `docs/spec-post-detail.md` and `docs/superpowers/specs/2026-05-06-post-image-lightbox-design.md`.
```

In the "## 3. In-Post Reading Experience" → "Current Status" sub-list (lines 74-79), append a new bullet at the end of the list:

```markdown
  - Post-body image lightbox landed: in-prose images zoom into a centered fullscreen lightbox via a 250ms FLIP transform; caption mirrored from `<figcaption>`; five close triggers plus a × button. See `docs/spec-post-detail.md`.
```

- [ ] **Step 3: Add the follow-up footer to the post-figures spec**

Open `docs/superpowers/specs/2026-04-20-post-figures-design.md`. At the very end of the file (after the last "Alternatives Considered" bullet), append:

```markdown

---

## Follow-up: Image lightbox (2026-05-06)

The "image lightbox / modal / zoom" item listed under Out of Scope of this spec was delivered on 2026-05-06 by `docs/superpowers/specs/2026-05-06-post-image-lightbox-design.md`. The lightbox layers on top of this spec's figure system without changing the rendered figure markup; the activation script only adds runtime markers (`data-zoomable`) and click handlers to the existing `<img>` elements.
```

- [ ] **Step 4: Run tests one more time**

Run: `npm test`

Expected: All tests pass. (Doc-only changes do not affect any test.)

- [ ] **Step 5: Commit**

```bash
git add docs/spec-post-detail.md docs/spec-roadmap.md docs/superpowers/specs/2026-04-20-post-figures-design.md
git commit -m "$(cat <<'EOF'
docs: record post-image lightbox in post-detail spec + roadmap

Adds an Image Lightbox section to the post-detail spec describing
behavior, visual treatment, and implementation location; adds a
Current State bullet on the blog evolution roadmap; appends a
follow-up footer on the post-figures spec noting that its
out-of-scope lightbox item is now delivered.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Done check

After all five tasks are committed:

- [ ] `npm test` is green.
- [ ] `npm run build` succeeds and `pagefind` reindexes without error: `npm run build`.
- [ ] Manual smoke check on the KeyStore post (ko + en) confirms the eight verifications listed in Task 3 Step 7.
- [ ] No new npm dependency was added: `git diff main -- package.json package-lock.json` shows no changes.
- [ ] The branch's commit log shows five focused commits in order: i18n keys → component + test → page mount → cursor CSS → docs.
