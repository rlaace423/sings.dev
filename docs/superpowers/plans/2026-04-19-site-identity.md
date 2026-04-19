# Site Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the author-identity pass on the site shell — add an SM58-style microphone SVG mark next to the `sings.dev` header text, swap the home hero eyebrow to an identity-plus-topics line, add a `Singing Developer` footer signature, and fix the mobile Korean header wrap bug that would otherwise worsen with the wider logo.

**Architecture:** Introduce a new `SiteLogo.astro` component that renders the microphone mark as inline SVG using `currentColor` so both themes work without separate assets. Update `Header.astro` to mount `SiteLogo` next to the existing text logo, add a `whitespace-nowrap` guard on the nav links (fixing the CJK mid-word split), and tighten mobile spacing so the icon + text + nav + controls all fit on a single row at iPhone-SE width. Swap the hero eyebrow text on both home pages and extend the footer copyright with the nickname signature. Author a new `spec-site-identity.md` SSOT and update `spec-layout.md`, `spec-home-theme.md`, and `spec-roadmap.md` so the docs reflect what shipped.

**Tech Stack:** Astro 6, Tailwind CSS (utilities including `whitespace-nowrap` and responsive `sm:` gap/size variants), inline SVG, `node --test` with `@astrojs/compiler` + `experimental_AstroContainer` for component render tests, `node --test` with plain `readFile` for file-level source assertions.

**Reference Spec:** `docs/superpowers/specs/2026-04-19-site-identity-design.md`.

---

## File Structure

### Create

- `src/components/SiteLogo.astro` — inline SVG component rendering the SM58-style microphone mark. Takes an optional `class` prop; defaults to `h-4 w-4 sm:h-5 sm:w-5`. Uses `currentColor`, carries `aria-hidden="true"` (the surrounding header link carries the accessible name).
- `tests/site-logo.test.mjs` — render tests for `SiteLogo.astro` (default class, class override, svg shape hooks, aria-hidden).
- `tests/footer-signature.test.mjs` — source-level assertion that the footer renders the `© {year} sings.dev — Singing Developer` signature.
- `docs/spec-site-identity.md` — SSOT capturing nickname origin, domain rationale, logo direction, and the ordered list of surfaces that carry author identity.

### Modify

- `src/components/Header.astro` — replace the text-only logo link with a `<a>` that contains `<SiteLogo />` followed by `<span>sings.dev</span>`; add `whitespace-nowrap` on each nav `<a>`; tighten control-cluster gap to `gap-2 sm:gap-3` and nav gap to `gap-4 sm:gap-5`.
- `tests/header-layout.test.mjs` — extend the existing file-read test with new regex assertions covering the SiteLogo wiring, the `whitespace-nowrap` nav guard, and the new mobile gap utilities. Preserve the existing two tests verbatim.
- `src/pages/index.astro` — change the hero `<p>` eyebrow text only.
- `src/pages/en/index.astro` — change the hero `<p>` eyebrow text only.
- `src/components/Footer.astro` — extend the copyright paragraph to `© {year} sings.dev — Singing Developer`.
- `docs/spec-layout.md` — Header section now mentions the text + microphone SVG logo and the Korean-safe nav guard; Footer section mentions the signature line.
- `docs/spec-home-theme.md` — the hero eyebrow bullet now describes the eyebrow as "identity + primary topic areas" rather than a topic list.
- `docs/spec-roadmap.md` — Identity `Current Status` block moves header + home eyebrow + footer signature into the landed list; `Next Likely Work` records that hero prose refinement remains.

---

## Tasks

### Task 1: Build `SiteLogo.astro` with TDD

**Files:**
- Create: `tests/site-logo.test.mjs`
- Create: `src/components/SiteLogo.astro`

- [ ] **Step 1: Write the failing tests**

Create `tests/site-logo.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoLogoUrl = new URL("../src/components/SiteLogo.astro", import.meta.url);
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderLogo(props) {
	const source = await readFile(repoLogoUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoLogoUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "site-logo-"));
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

		const rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

test("SiteLogo renders an aria-hidden svg with a data-site-logo hook", async () => {
	const rendered = await renderLogo({});
	assert.match(rendered, /<svg[^>]*data-site-logo/);
	assert.match(rendered, /<svg[^>]*aria-hidden="true"/);
	assert.match(rendered, /<svg[^>]*viewBox="0 0 24 24"/);
	assert.match(rendered, /<svg[^>]*stroke="currentColor"/);
});

test("SiteLogo draws the vocal microphone silhouette (ellipse grille and rounded handle)", async () => {
	const rendered = await renderLogo({});
	assert.match(rendered, /<ellipse[^>]*cx="12"[^>]*cy="7\.5"[^>]*rx="5"[^>]*ry="5\.5"/);
	assert.match(rendered, /<rect[^>]*x="9"[^>]*y="13"[^>]*width="6"[^>]*height="9"[^>]*rx="2\.2"/);
	assert.match(rendered, /<line[^>]*x1="7\.5"[^>]*y1="6"[^>]*x2="16\.5"[^>]*y2="6"/);
	assert.match(rendered, /<line[^>]*x1="7\.5"[^>]*y1="9"[^>]*x2="16\.5"[^>]*y2="9"/);
});

test("SiteLogo uses the default responsive size when no class prop is given", async () => {
	const rendered = await renderLogo({});
	assert.match(rendered, /class="[^"]*h-4[^"]*w-4[^"]*sm:h-5[^"]*sm:w-5/);
});

test("SiteLogo replaces the default class when an explicit class prop is provided", async () => {
	const rendered = await renderLogo({ class: "h-6 w-6 text-sky-500" });
	assert.match(rendered, /class="[^"]*h-6 w-6 text-sky-500/);
	assert.doesNotMatch(rendered, /class="[^"]*h-4 w-4 sm:h-5 sm:w-5/);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- tests/site-logo.test.mjs`
Expected: failing tests because `src/components/SiteLogo.astro` does not exist yet.

- [ ] **Step 3: Implement `src/components/SiteLogo.astro`**

Create `src/components/SiteLogo.astro`:

```astro
---
interface Props {
	class?: string;
}

const { class: className = "h-4 w-4 sm:h-5 sm:w-5" } = Astro.props;
---

<svg
	data-site-logo
	class={className}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<ellipse cx="12" cy="7.5" rx="5" ry="5.5" />
	<line x1="7.5" y1="6" x2="16.5" y2="6" />
	<line x1="7.5" y1="9" x2="16.5" y2="9" />
	<rect x="9" y="13" width="6" height="9" rx="2.2" />
</svg>
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- tests/site-logo.test.mjs`
Expected: all four tests pass.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: suite pass count grows by 4 relative to the baseline (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/components/SiteLogo.astro tests/site-logo.test.mjs
git commit -m "$(cat <<'EOF'
feat: add SiteLogo component with SM58 microphone svg

Introduces a small SiteLogo component that renders an SM58-style
vocal microphone as inline SVG using currentColor so both light and
dark themes pick up the surrounding link color. The component carries
aria-hidden so the surrounding header link retains the accessible
name, and exposes an optional class prop for sizing overrides.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire `SiteLogo` into `Header.astro`, add the nav wrap guard, and tighten mobile gaps (with TDD at file-source level)

**Files:**
- Modify: `tests/header-layout.test.mjs`
- Modify: `src/components/Header.astro`

- [ ] **Step 1: Add the failing source-level assertions**

In `tests/header-layout.test.mjs`, preserve the existing two `test(...)` blocks exactly as they are and append this block at the end of the file:

```js
test("header uses the SiteLogo mark next to the sings.dev text and keeps the Korean-safe nav guard plus mobile gap tightening", async () => {
	const header = await readFile(new URL("../src/components/Header.astro", import.meta.url), "utf8");

	assert.match(header, /import SiteLogo from "\.\/SiteLogo\.astro";/);
	assert.match(header, /<SiteLogo \/>/);
	assert.match(header, /<span[^>]*>sings\.dev<\/span>/);
	const logoOpens = header.indexOf("<SiteLogo");
	const logoTextOpens = header.indexOf("<span>sings.dev</span>");
	assert.ok(
		logoOpens >= 0 && logoTextOpens > logoOpens,
		"SiteLogo should render before the sings.dev text span",
	);

	assert.match(header, /gap-2 sm:gap-3/);
	assert.match(header, /gap-4 sm:gap-5/);
	assert.match(header, /whitespace-nowrap/);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- tests/header-layout.test.mjs`
Expected: the existing two tests still pass; the new test fails because `Header.astro` has not been updated.

- [ ] **Step 3: Rewrite `src/components/Header.astro`**

Replace the entire contents of `src/components/Header.astro` with:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n";
import SiteLogo from "./SiteLogo.astro";
import {
	defaultLocale,
	type Locale,
	isLocale,
	labels,
	useTranslations,
} from "../i18n/ui";

interface Props {
	lang?: Locale;
}

const { lang: langProp } = Astro.props;
const lang = isLocale(langProp) ? langProp : defaultLocale;
const t = useTranslations(lang);
const currentLocale = isLocale(Astro.currentLocale) ? Astro.currentLocale : lang;
const targetLocale: Locale = currentLocale === "ko" ? "en" : "ko";
const pathname = Astro.url.pathname;
const pathWithoutLocale =
	currentLocale === defaultLocale
		? pathname
		: pathname.replace(new RegExp(`^/${currentLocale}(?=/|$)`), "") || "/";
const normalizedPath = pathWithoutLocale.replace(/^\/|\/$/g, "");

const navItems = [
	{ href: getRelativeLocaleUrl(lang, "posts"), label: t("nav.posts") },
	{ href: getRelativeLocaleUrl(lang, "about"), label: t("nav.about") },
];
const homeHref = getRelativeLocaleUrl(lang, "");
const switchHref = getRelativeLocaleUrl(targetLocale, normalizedPath);
---

<header
	data-smart-header
	class="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/80 backdrop-blur-md transition-transform duration-300 dark:border-stone-800 dark:bg-stone-950/80"
>
	<div class="mx-auto flex w-full max-w-4xl items-center justify-between gap-6 px-4 py-6 sm:px-6">
		<a
			href={homeHref}
			class="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-stone-950 transition-colors hover:text-stone-700 dark:text-stone-50 dark:hover:text-stone-300"
		>
			<SiteLogo />
			<span>sings.dev</span>
		</a>

		<div class="flex items-center gap-2 sm:gap-3">
			<nav aria-label="Primary">
				<ul class="flex items-center gap-4 text-sm text-stone-600 sm:gap-5 dark:text-stone-300">
					{
						navItems.map((item) => (
							<li>
								<a
									href={item.href}
									class="whitespace-nowrap transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
								>
									{item.label}
								</a>
							</li>
						))
					}
				</ul>
			</nav>

			<button
				type="button"
				data-search-open
				aria-haspopup="dialog"
				aria-controls="global-search-modal"
				aria-label={t("nav.search")}
				class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
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
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3.5-3.5" />
				</svg>
			</button>

			<a
				href={switchHref}
				class="inline-flex h-9 min-w-10 items-center justify-center rounded-full border border-stone-200 px-3 text-xs font-semibold tracking-[0.14em] text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
				aria-label={`Switch language to ${labels[targetLocale]}`}
			>
				{targetLocale.toUpperCase()}
			</a>

			<button
				type="button"
				data-theme-toggle
				aria-pressed="false"
				aria-label="Switch to dark mode"
				class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
			>
				<span class="sr-only" data-theme-label>Switch to dark mode</span>
				<svg
					class="h-4 w-4 dark:hidden"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
				</svg>
				<svg
					class="hidden h-4 w-4 dark:block"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2.5" />
					<path d="M12 19.5V22" />
					<path d="m4.93 4.93 1.77 1.77" />
					<path d="m17.3 17.3 1.77 1.77" />
					<path d="M2 12h2.5" />
					<path d="M19.5 12H22" />
					<path d="m4.93 19.07 1.77-1.77" />
					<path d="m17.3 6.7 1.77-1.77" />
				</svg>
			</button>
		</div>
	</div>
</header>

<script is:inline>
	(() => {
		const header = document.querySelector("[data-smart-header]");
		if (!(header instanceof HTMLElement)) return;

		const desktopQuery = window.matchMedia("(min-width: 768px)");
		let lastScrollY = window.scrollY;
		let ticking = false;

		const syncHeader = () => {
			if (desktopQuery.matches) {
				header.classList.remove("-translate-y-full");
				lastScrollY = window.scrollY;
				return;
			}

			const currentScrollY = window.scrollY;
			const scrollingDown = currentScrollY > lastScrollY;
			const passedHeader = currentScrollY > header.offsetHeight;

			if (scrollingDown && passedHeader) {
				header.classList.add("-translate-y-full");
			} else {
				header.classList.remove("-translate-y-full");
			}

			if (currentScrollY <= 0) {
				header.classList.remove("-translate-y-full");
			}

			lastScrollY = currentScrollY;
			ticking = false;
		};

		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			window.requestAnimationFrame(syncHeader);
		};

		const onViewportChange = () => {
			header.classList.remove("-translate-y-full");
			lastScrollY = window.scrollY;
		};

		window.addEventListener("scroll", onScroll, { passive: true });

		if (typeof desktopQuery.addEventListener === "function") {
			desktopQuery.addEventListener("change", onViewportChange);
		} else {
			desktopQuery.addListener(onViewportChange);
		}

		syncHeader();
	})();
</script>
```

- [ ] **Step 4: Run the header-layout test file and confirm all three tests pass**

Run: `npm test -- tests/header-layout.test.mjs`
Expected: all three tests pass.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: no regressions. Pass count increases by 1 (the new header assertion).

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.astro tests/header-layout.test.mjs
git commit -m "$(cat <<'EOF'
feat: mount SiteLogo mark in the header and fix Korean mobile wrap

Swaps the text-only header logo for a SiteLogo mark beside the
sings.dev text, adds whitespace-nowrap on each nav link so Korean
labels like 포스트 cannot split mid-word on narrow viewports, and
tightens the mobile gap tokens on the nav and control cluster so the
new mark fits on a single row at iPhone-SE width.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Swap the home hero eyebrow on both home pages

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/en/index.astro`

- [ ] **Step 1: Update the Korean home hero eyebrow**

In `src/pages/index.astro`, find the hero eyebrow paragraph inside the `<section data-home-hero>` block:

Current:

```astro
<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
	Backend architecture, MPC systems, and infrastructure routing
</p>
```

Replace with:

```astro
<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
	Singing Developer — Backend · MPC · Infrastructure
</p>
```

Leave the rest of the hero (`<h1>` and the two `<p>` paragraphs below it) untouched.

- [ ] **Step 2: Update the English home hero eyebrow**

In `src/pages/en/index.astro`, find the same eyebrow paragraph inside `<section data-home-hero>` and replace it with the identical new copy:

```astro
<p class="text-sm uppercase tracking-[0.18em] text-stone-500 dark:text-stone-500">
	Singing Developer — Backend · MPC · Infrastructure
</p>
```

Leave the rest of the hero untouched.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests still pass. `tests/home-notice.test.mjs` pins the hero H1 and the Medium legacy notice, not the eyebrow, so it remains green.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/pages/en/index.astro
git commit -m "$(cat <<'EOF'
feat: repurpose home hero eyebrow as identity + topic areas

Replaces the topical eyebrow copy on both locale home pages with
"Singing Developer — Backend · MPC · Infrastructure" so the nickname
gets a persistent seat above the hero headline without altering the
H1 or body paragraphs, which will be revised in a later pass.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Update the footer with the Singing Developer signature

**Files:**
- Create: `tests/footer-signature.test.mjs`
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Write the failing test**

Create `tests/footer-signature.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("footer renders the Singing Developer signature next to the copyright year", async () => {
	const footer = await readFile(
		new URL("../src/components/Footer.astro", import.meta.url),
		"utf8",
	);

	assert.match(footer, /const year = new Date\(\)\.getFullYear\(\);/);
	assert.match(footer, /&copy; \{year\} sings\.dev — Singing Developer/);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- tests/footer-signature.test.mjs`
Expected: failing test because the current footer only contains `© {year} sings.dev` without the signature.

- [ ] **Step 3: Update `src/components/Footer.astro`**

Replace the entire contents of `src/components/Footer.astro` with:

```astro
---
const year = new Date().getFullYear();
---

<footer class="border-t border-stone-200 py-6 text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
	<p>&copy; {year} sings.dev — Singing Developer</p>
</footer>
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- tests/footer-signature.test.mjs`
Expected: the test passes.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests pass; pass count grows by 1.

- [ ] **Step 6: Commit**

```bash
git add src/components/Footer.astro tests/footer-signature.test.mjs
git commit -m "$(cat <<'EOF'
feat: add Singing Developer footer signature

Extends the footer copyright line with the author nickname so every
public page carries a quiet Singing Developer signature alongside the
site name, without adding any new links, icons, or rows.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Documentation updates

**Files:**
- Create: `docs/spec-site-identity.md`
- Modify: `docs/spec-layout.md`
- Modify: `docs/spec-home-theme.md`
- Modify: `docs/spec-roadmap.md`

This task ships as four separate commits, one per file.

---

#### Sub-task 5a: Create `docs/spec-site-identity.md`

- [ ] **Step 1: Write the file**

Create `docs/spec-site-identity.md` with exactly this content:

```markdown
# Spec: Site Identity

- **Goal**: Keep the site's author identity documented so future work on the header, home, footer, and any future logo iterations all align with the same story.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. Identity should stay quiet; the nickname is context, not branding. `/about` carries the structured author surface (see `docs/spec-about.md`); this spec covers the identity signals that live in the site shell itself.
- **Author Nickname**:
  - Korean: `노래하는 개발자`.
  - English: `Singing Developer`.
  - The domain `sings.dev` derives from this nickname.
- **Logo Direction**:
  - The mark is a simplified SM58-style handheld vocal microphone drawn as inline SVG.
  - Implementation lives in `src/components/SiteLogo.astro` and uses `currentColor` so both light and dark themes work without theme-specific assets.
  - The mark stays monochrome and thin-stroke to match the existing header icons (search, theme toggle, `SocialIcon`).
- **Surfaces Carrying Author Identity**:
  1. Header logo link — `SiteLogo` mark immediately to the left of the `sings.dev` text.
  2. Home page hero eyebrow — identity-plus-topics line (`Singing Developer — Backend · MPC · Infrastructure`); exact wording may be revised in later hero-prose passes.
  3. `/about` page — structured summary, photo, socials, experience. See `docs/spec-about.md`.
  4. Footer copyright line — `© <year> sings.dev — Singing Developer`.
- **Guardrails**:
  - The nickname shows up as context, not as hero copy. No page should lead with the nickname alone.
  - Do not introduce an extra header row, tagline, or subtitle for the nickname.
  - Do not restore any per-post author block; author identity on post detail pages stays implicit through the site shell.
  - The header keeps both the mark and the `sings.dev` text together on every viewport. If mobile space ever gets too tight, tighten spacing before dropping the text.
- **What To Avoid**:
  - A condenser stand microphone, a musical-note motif, or any icon that competes with the blog's editorial tone.
  - Any non-text decoration alongside the footer signature.
  - Any branding-style treatment ("™", slogan, tagline bar).
```

- [ ] **Step 2: Commit Sub-task 5a**

```bash
git add docs/spec-site-identity.md
git commit -m "$(cat <<'EOF'
docs: add site identity spec

Adds the SSOT describing the author nickname origin, the SM58-style
logo direction, and the ordered list of site-shell surfaces that
carry author identity (header mark, home hero eyebrow, /about page,
footer signature) alongside the guardrails that keep identity quiet.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

#### Sub-task 5b: Update `docs/spec-layout.md`

- [ ] **Step 1: Update the Header Left bullet to mention the SiteLogo mark**

Find this bullet inside the `**Header**:` section of `docs/spec-layout.md`:

```markdown
  - Left: text logo linking to the locale-aware home page.
```

Replace with:

```markdown
  - Left: a single link combining the `SiteLogo` microphone SVG mark and the `sings.dev` text, pointing at the locale-aware home page. See `docs/spec-site-identity.md`.
```

- [ ] **Step 2: Append a Korean-safe bullet inside the same `**Header**:` block**

Find this bullet in the `**Header**:` section:

```markdown
  - Korean UI labels are `포스트`, `소개`; English UI labels are `Posts`, `About`.
```

Immediately after it, insert this new bullet (keeping indentation consistent with the surrounding bullets):

```markdown
  - Every nav link uses `whitespace-nowrap` so Korean labels cannot split mid-word when the header compresses on narrow viewports. Nav and control gaps use `gap-4 sm:gap-5` and `gap-2 sm:gap-3` respectively to keep the logo, nav, and controls on a single row down to iPhone-SE width.
```

- [ ] **Step 3: Update the Footer block to mention the signature**

Find this block near the bottom of `docs/spec-layout.md`:

```markdown
- **Footer**:
  - Keep a simple copyright line at the bottom.
```

Replace with:

```markdown
- **Footer**:
  - Keep a simple single-line signature at the bottom reading `© <year> sings.dev — Singing Developer`. No additional links, icons, or rows.
```

- [ ] **Step 4: Commit Sub-task 5b**

```bash
git add docs/spec-layout.md
git commit -m "$(cat <<'EOF'
docs: reflect SiteLogo, Korean-safe nav, and footer signature in layout spec

Updates the Header and Footer descriptions in the layout SSOT so they
match what ships: a SiteLogo mark + sings.dev text, a whitespace-nowrap
nav guard with mobile-specific gap tokens, and a footer signature that
carries the Singing Developer nickname.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

#### Sub-task 5c: Update `docs/spec-home-theme.md`

- [ ] **Step 1: Change the hero description so the eyebrow is explicitly an identity-plus-topics line**

Find the `Each home page contains, in order:` bullet list inside the `**Home Page Structure**:` block of `docs/spec-home-theme.md`. Replace the first inner bullet:

Old:

```markdown
    - A short hero/introduction section.
```

New:

```markdown
    - A short hero/introduction section. The hero eyebrow reads as an identity + primary topic areas line (e.g., `Singing Developer — Backend · MPC · Infrastructure`); the exact copy may be refined in future hero passes. See `docs/spec-site-identity.md`.
```

Keep the other two bullets (`Categories block` and `recent posts section`) exactly as they are.

- [ ] **Step 2: Commit Sub-task 5c**

```bash
git add docs/spec-home-theme.md
git commit -m "$(cat <<'EOF'
docs: record the hero eyebrow's identity-forward role

Clarifies in the home-theme spec that the hero eyebrow now reads as
an identity + primary topic areas line instead of a topic list, and
cross-references the site-identity SSOT so the exact wording stays
editable without forcing a spec update.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

#### Sub-task 5d: Update `docs/spec-roadmap.md`

- [ ] **Step 1: Extend the Identity `Current Status` block**

Find this block inside `### 2. Identity` in `docs/spec-roadmap.md`:

Old:

```markdown
- **Current Status**:
  - `/about` has landed as a structured identity + job-search surface with photo, summary, socials, and experience (see `docs/spec-about.md`).
  - Home hero and Header identity treatment are not yet revised.
```

Replace with:

```markdown
- **Current Status**:
  - `/about` has landed as a structured identity + job-search surface with photo, summary, socials, and experience (see `docs/spec-about.md`).
  - The header now carries the `SiteLogo` microphone mark next to the `sings.dev` text, and the footer carries a `Singing Developer` signature (see `docs/spec-site-identity.md`).
  - The home hero eyebrow has been repurposed as an identity + primary topic areas line; hero headline and body prose refinement is still outstanding.
```

- [ ] **Step 2: Append a bullet to the `## Current State` block at the top of the file**

At the end of the `## Current State` bullet list, append this new bullet (after the existing "The home page now has a quiet Categories browse entry point…" bullet):

```markdown
- Site-shell identity pass is in place: `SiteLogo` mark in the header, identity-forward hero eyebrow on the home pages, and a `Singing Developer` signature in the footer.
```

- [ ] **Step 3: Commit Sub-task 5d**

```bash
git add docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record site-shell identity pass in roadmap

Updates the Identity priority section so the header, home hero
eyebrow, and footer signature are marked landed, and notes that hero
headline and body prose refinement remains as the next Identity step.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Run the full test suite once more**

Run: `npm test`
Expected: docs-only changes; full suite stays green.

---

## Self-Review Checklist (for the executor)

Before declaring the plan complete:

1. Run `npm test` and confirm every test passes.
2. Spot-check `/`, `/en/`, `/about`, and `/posts` in `npm run dev` to confirm the microphone mark appears next to `sings.dev` in the header in both themes.
3. Shrink the browser to iPhone-SE width (~375px) and confirm the Korean nav (`포스트`, `소개`) does not wrap and that everything stays on a single row.
4. Confirm the home hero eyebrow reads `Singing Developer — Backend · MPC · Infrastructure` on both locale home pages.
5. Confirm the footer reads `© <current year> sings.dev — Singing Developer` on every public page.
6. Re-read `docs/spec-site-identity.md`, `docs/spec-layout.md`, `docs/spec-home-theme.md`, and `docs/spec-roadmap.md` and confirm they describe what actually shipped.
