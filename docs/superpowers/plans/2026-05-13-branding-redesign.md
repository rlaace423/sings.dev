# Branding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the microphone `SiteLogo` and `Singing Developer` nickname with a single `$ sings.dev` terminal-prompt wordmark + blinking cursor brand. Drop the nickname from header and footer entirely.

**Architecture:** A new `src/components/SiteBrand.astro` renders the wordmark (`$` prompt + `sings.dev` + blinking block cursor) using `font-mono` and a Tailwind amber accent. `Header.astro` swaps `SiteLogo` + the inline `sings.dev` span for `<SiteBrand />` and hides the primary nav text labels on sub-sm viewports. `Footer.astro` drops the `— Singing Developer` suffix. `SiteLogo.astro` and its test are deleted. Rendered specs (`spec-site-identity.md`, `spec-layout.md`) are updated last to describe the resulting state.

**Tech Stack:** Astro 6, Tailwind CSS v4, `node --test` (test runner with `--experimental-strip-types`).

**Design Spec:** `docs/superpowers/specs/2026-05-13-branding-redesign-design.md`

---

## File Structure

Created:
- `src/components/SiteBrand.astro` — wordmark + cursor (inline `<style>` for blink animation + `prefers-reduced-motion` fallback).
- `tests/site-brand.test.mjs` — source-pattern tests matching the same readFile + regex style as `header-layout.test.mjs` and `footer-signature.test.mjs`.

Modified:
- `src/components/Header.astro` — swap `SiteLogo` import + `<SiteLogo />` + inline `<span>sings.dev</span>` for `<SiteBrand />`; add `hidden sm:inline-block` to each primary-nav `<li>`.
- `src/components/Footer.astro` — drop `— Singing Developer`.
- `tests/header-layout.test.mjs` — rewrite the "SiteLogo mark next to the sings.dev text" test to assert `SiteBrand` instead.
- `tests/footer-signature.test.mjs` — update copyright-line regex.
- `docs/spec-site-identity.md` — rewrite Logo Direction, Author Nickname, Surfaces, Guardrails, What To Avoid sections.
- `docs/spec-layout.md` — rewrite Header `Left:` bullet and Footer signature line; add the sub-sm nav-text rule.

Deleted:
- `src/components/SiteLogo.astro`
- `tests/site-logo.test.mjs`

---

## Task 1: Create `SiteBrand` Component (TDD)

**Files:**
- Create: `tests/site-brand.test.mjs`
- Create: `src/components/SiteBrand.astro`

- [ ] **Step 1.1: Write the failing test**

Create `tests/site-brand.test.mjs` with this content:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const brandUrl = new URL("../src/components/SiteBrand.astro", import.meta.url);

test("SiteBrand renders the prompt, sings, .dev, and cursor in document order", async () => {
	const source = await readFile(brandUrl, "utf8");
	const dollar = source.indexOf(">$<");
	const sings = source.indexOf(">sings<");
	const tld = source.indexOf(">.dev<");
	const cursor = source.indexOf("brand-cursor");

	assert.ok(dollar > -1, "should render the $ prompt");
	assert.ok(sings > dollar, "sings should appear after $");
	assert.ok(tld > sings, ".dev should appear after sings");
	assert.ok(cursor > tld, "cursor should appear after .dev");
});

test("SiteBrand cursor span is aria-hidden", async () => {
	const source = await readFile(brandUrl, "utf8");
	assert.match(
		source,
		/class="[^"]*brand-cursor[^"]*"[^>]*aria-hidden="true"/,
		"the cursor span must carry aria-hidden so screen readers do not announce it",
	);
});

test("SiteBrand applies the amber accent on $, .dev, and the cursor", async () => {
	const source = await readFile(brandUrl, "utf8");
	const matches = source.match(/text-amber-700 dark:text-amber-300/g) ?? [];
	assert.ok(
		matches.length >= 3,
		`expected at least 3 amber-accent classes (for $, .dev, cursor); got ${matches.length}`,
	);
});

test("SiteBrand wrapper uses font-mono and whitespace-nowrap", async () => {
	const source = await readFile(brandUrl, "utf8");
	assert.match(source, /font-mono/, "wrapper must switch to the mono stack");
	assert.match(source, /whitespace-nowrap/, "wrapper must prevent the cursor wrapping to a second line");
});

test("SiteBrand cursor animation respects prefers-reduced-motion", async () => {
	const source = await readFile(brandUrl, "utf8");
	assert.match(source, /@keyframes\s+brand-cursor-blink/, "blink animation must be defined");
	assert.match(
		source,
		/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.brand-cursor[\s\S]*animation:\s*none/,
		"reduced-motion media query must pin the cursor visible",
	);
});
```

- [ ] **Step 1.2: Run the failing test**

Run: `node --experimental-strip-types --test tests/site-brand.test.mjs`

Expected: 5 failures with `ENOENT` (file not found) for `src/components/SiteBrand.astro`.

- [ ] **Step 1.3: Create `SiteBrand.astro`**

Create `src/components/SiteBrand.astro` with this content:

```astro
---
---

<span class="inline-flex items-baseline whitespace-nowrap font-mono">
	<span class="mr-2 text-amber-700 dark:text-amber-300">$</span>
	<span>sings</span>
	<span class="text-amber-700 dark:text-amber-300">.dev</span>
	<span class="brand-cursor ml-1 text-amber-700 dark:text-amber-300" aria-hidden="true"></span>
</span>

<style>
	.brand-cursor {
		display: inline-block;
		width: 0.55em;
		height: 1.05em;
		background: currentColor;
		vertical-align: -0.1em;
		animation: brand-cursor-blink 1s step-end infinite;
	}

	@keyframes brand-cursor-blink {
		50% { opacity: 0; }
	}

	@media (prefers-reduced-motion: reduce) {
		.brand-cursor {
			animation: none;
		}
	}
</style>
```

- [ ] **Step 1.4: Run the test, verify pass**

Run: `node --experimental-strip-types --test tests/site-brand.test.mjs`

Expected: 5 passing tests.

- [ ] **Step 1.5: Commit**

```bash
git add src/components/SiteBrand.astro tests/site-brand.test.mjs
git commit -m "$(cat <<'EOF'
feat: add SiteBrand component for the $ sings.dev wordmark

Renders the new brand wordmark — a $ prompt, sings.dev wordmark, and a
blinking block cursor — in mono with the amber-700/amber-300 accent.
Blink uses step-end on/off at 1Hz and respects prefers-reduced-motion.
Source-pattern tests follow the existing header-layout + footer-signature
style (readFile + regex).
EOF
)"
```

---

## Task 2: Wire `SiteBrand` into `Header.astro` and Hide Mobile Nav Text

**Files:**
- Modify: `tests/header-layout.test.mjs:28-44`
- Modify: `src/components/Header.astro:1-10` (import block) and `:36-65` (header markup)

- [ ] **Step 2.1: Update the header-layout test**

In `tests/header-layout.test.mjs`, replace the third test block (the one starting `test("header uses the SiteLogo mark next to the sings.dev text and keeps the Korean-safe nav guard plus mobile gap tightening", ...`) with:

```javascript
test("header uses the SiteBrand wordmark, hides primary nav text on sub-sm, and keeps the Korean-safe nav guard plus mobile gap tightening", async () => {
	const header = await readFile(new URL("../src/components/Header.astro", import.meta.url), "utf8");

	assert.match(header, /import SiteBrand from "\.\/SiteBrand\.astro";/);
	assert.match(header, /<SiteBrand \/>/);

	assert.doesNotMatch(header, /import SiteLogo from/, "SiteLogo import must be gone");
	assert.doesNotMatch(header, /<SiteLogo /, "<SiteLogo /> must be gone");
	assert.doesNotMatch(
		header,
		/<span[^>]*>sings\.dev<\/span>/,
		"the inline sings.dev <span> must be gone — the brand component owns the wordmark now",
	);

	assert.match(
		header,
		/navItems\.map[\s\S]*<li class="hidden sm:inline-block">/,
		"each primary-nav <li> must hide on sub-sm via hidden sm:inline-block",
	);

	assert.match(header, /gap-2 sm:gap-3/);
	assert.match(header, /gap-4 sm:gap-5/);
	assert.match(header, /whitespace-nowrap/);
});
```

The regex confirms that `navItems.map` (which appears earlier in the file) comes before the `<li class="hidden sm:inline-block">` opening tag inside the map callback. Both fragments are required.

- [ ] **Step 2.2: Run the failing test**

Run: `node --experimental-strip-types --test tests/header-layout.test.mjs`

Expected: the new third test fails (header still imports SiteLogo and still renders the inline span). Other tests in the file should still pass.

- [ ] **Step 2.3: Update the `Header.astro` import**

In `src/components/Header.astro`, replace this line:

```astro
import SiteLogo from "./SiteLogo.astro";
```

with:

```astro
import SiteBrand from "./SiteBrand.astro";
```

- [ ] **Step 2.4: Replace the brand markup inside the home-link anchor**

In `src/components/Header.astro`, find the home-link anchor block:

```astro
<a
	href={homeHref}
	class="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-dawn-800 transition-colors hover:text-dawn-700 dark:text-night-50 dark:hover:text-night-200"
>
	<SiteLogo />
	<span>sings.dev</span>
</a>
```

Replace with:

```astro
<a
	href={homeHref}
	class="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-dawn-800 transition-colors hover:text-dawn-700 dark:text-night-50 dark:hover:text-night-200"
>
	<SiteBrand />
</a>
```

Only the inner two lines change. The anchor's classes, `href`, and surrounding attributes stay as-is so focus rings and hover colors keep working.

- [ ] **Step 2.5: Add `hidden sm:inline-block` to each primary-nav `<li>`**

In `src/components/Header.astro`, find the nav list block:

```astro
<nav aria-label="Primary">
	<ul class="flex items-center gap-4 sm:gap-5 text-sm text-dawn-700 dark:text-night-200">
		{
			navItems.map((item) => (
				<li>
					<a
						href={item.href}
						class="whitespace-nowrap transition-colors hover:text-dawn-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dawn-100 dark:hover:text-night-50 dark:focus-visible:ring-night-500 dark:focus-visible:ring-offset-night-800"
					>
						{item.label}
					</a>
				</li>
			))
		}
	</ul>
</nav>
```

Change the `<li>` opening tag to add the responsive hide class:

```astro
<li class="hidden sm:inline-block">
```

Everything else inside the `<nav>` stays the same.

- [ ] **Step 2.6: Run the header-layout test, verify pass**

Run: `node --experimental-strip-types --test tests/header-layout.test.mjs`

Expected: all 4 tests pass.

- [ ] **Step 2.7: Run the full test suite as a regression check**

Run: `npm test`

Expected: every test passes except `tests/site-logo.test.mjs` (it still passes for now — it reads `src/components/SiteLogo.astro` which still exists; the deletion happens in Task 4).

- [ ] **Step 2.8: Verify visually in the dev server**

Start the dev server: `npm run dev`. Open the printed local URL.

Confirm:
- Header shows `$ sings.dev▌` (mono, amber `$` and `.dev`, blinking cursor).
- No microphone icon next to it.
- At desktop width: `포스트` and `소개` show in the right-side nav.
- Narrow the browser window below `sm` (640px). `포스트` and `소개` disappear; search/EN/theme buttons remain.
- Toggle to light mode (sun/moon button). The brand amber shifts to the darker `amber-700`; cursor still blinks.
- Open DevTools → emulate `prefers-reduced-motion: reduce` (Rendering panel). Cursor stops blinking, stays visible.

If any of the above is off, stop and reconcile against the spec before committing.

- [ ] **Step 2.9: Commit**

```bash
git add src/components/Header.astro tests/header-layout.test.mjs
git commit -m "$(cat <<'EOF'
feat: swap header microphone logo for the SiteBrand wordmark

Drops the SiteLogo import and the inline sings.dev span from the header
in favour of <SiteBrand />. Primary nav <li>s gain hidden sm:inline-block
so 포스트/소개 hide on sub-sm; mobile readers reach /posts and /about via
the home page's existing entries. Header-layout test rewritten to assert
the new shape.
EOF
)"
```

---

## Task 3: Drop `— Singing Developer` from the Footer

**Files:**
- Modify: `tests/footer-signature.test.mjs`
- Modify: `src/components/Footer.astro:6`

- [ ] **Step 3.1: Update the footer-signature test**

Replace the entire contents of `tests/footer-signature.test.mjs` with:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("footer renders the sings.dev signature next to the copyright year", async () => {
	const footer = await readFile(
		new URL("../src/components/Footer.astro", import.meta.url),
		"utf8",
	);

	assert.match(footer, /const year = new Date\(\)\.getFullYear\(\);/);
	assert.match(footer, /&copy; \{year\} sings\.dev/);
	assert.doesNotMatch(
		footer,
		/Singing Developer/,
		"the Singing Developer nickname must not appear in the footer anymore",
	);
});
```

- [ ] **Step 3.2: Run the failing test**

Run: `node --experimental-strip-types --test tests/footer-signature.test.mjs`

Expected: `doesNotMatch` assertion fails because the footer source still contains `Singing Developer`.

- [ ] **Step 3.3: Update `Footer.astro`**

In `src/components/Footer.astro`, replace line 6:

```astro
<p>&copy; {year} sings.dev — Singing Developer</p>
```

with:

```astro
<p>&copy; {year} sings.dev</p>
```

The surrounding `<footer>` element and `const year = …` line stay unchanged.

- [ ] **Step 3.4: Run the test, verify pass**

Run: `node --experimental-strip-types --test tests/footer-signature.test.mjs`

Expected: the single test passes.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/Footer.astro tests/footer-signature.test.mjs
git commit -m "$(cat <<'EOF'
feat: drop Singing Developer suffix from the footer signature

The nickname stops being a visible asset; sings.dev alone carries the
signature. Test updated to forbid the old suffix.
EOF
)"
```

---

## Task 4: Delete `SiteLogo` Component and Its Test

**Files:**
- Delete: `src/components/SiteLogo.astro`
- Delete: `tests/site-logo.test.mjs`

- [ ] **Step 4.1: Confirm no remaining references**

Run each of these and check the output:

```bash
grep -rn "SiteLogo" src/
grep -rn "data-site-logo" src/
```

Expected: both commands produce no matches. (The `Header.astro` import was removed in Task 2; `data-site-logo` is only set by `SiteLogo.astro` itself, which is about to go.)

If either prints a hit, stop and reconcile — the leftover reference must be cleaned before deletion.

- [ ] **Step 4.2: Delete the test file**

Run:

```bash
rm tests/site-logo.test.mjs
```

- [ ] **Step 4.3: Delete the component**

Run:

```bash
rm src/components/SiteLogo.astro
```

- [ ] **Step 4.4: Run the full test suite**

Run: `npm test`

Expected: every test passes. The `tests/site-logo.test.mjs` file is gone so its tests no longer run; nothing else should fail because no source still imports `SiteLogo`.

- [ ] **Step 4.5: Sanity-check the dev server one more time**

Run: `npm run dev`. Confirm the home page still renders, the header brand still appears, no console errors about a missing `SiteLogo.astro` (it shouldn't be referenced anywhere).

- [ ] **Step 4.6: Commit**

```bash
git add -A src/components/SiteLogo.astro tests/site-logo.test.mjs
git commit -m "$(cat <<'EOF'
chore: remove SiteLogo component and its test

The microphone mark is retired; SiteBrand owns the header wordmark now.
Nothing else in the codebase still references SiteLogo.
EOF
)"
```

Note: `git add -A` is used here so the deletions are staged. If `git status` after the rm shows the deletions as `deleted:` and you prefer `git rm`, that works equivalently.

---

## Task 5: Update Rendered Spec Documents

The design spec captured the *decision*; these are the rendered specs that document the *resulting state*. Per the project's convention (see how `2026-05-10-home-identity-refresh-design.md` calls out spec updates), this happens as part of the implementation, not a separate doc-only pass.

**Files:**
- Modify: `docs/spec-site-identity.md`
- Modify: `docs/spec-layout.md`

- [ ] **Step 5.1: Update `docs/spec-site-identity.md`**

Replace the entire contents of `docs/spec-site-identity.md` with:

```markdown
# Spec: Site Identity

- **Goal**: Keep the site's author identity documented so future work on the header, home, footer, and any future logo iterations all align with the same story.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. Identity stays quiet; the domain carries the brand. `/about` carries the structured author surface (see `docs/spec-about.md`); this spec covers the identity signals that live in the site shell itself.
- **Author Nickname (historical context only)**:
  - Korean: `노래하는 개발자`. English: `Singing Developer`.
  - The domain `sings.dev` derives from this nickname.
  - The nickname is **not** a user-visible asset on any page. The header, home, footer, and `/about` page never display it.
- **Brand Mark**:
  - The brand is a terminal-prompt wordmark — `$ sings.dev` followed by a blinking block cursor — rendered in `font-mono` with a Tailwind amber accent (`text-amber-700` light, `text-amber-300` dark) on `$`, `.dev`, and the cursor.
  - Implementation lives in `src/components/SiteBrand.astro`. The component is self-contained and includes the cursor-blink CSS plus a `prefers-reduced-motion: reduce` fallback that pins the cursor visible.
  - The amber accent is brand-only. No other surface (links, buttons, decorations) uses amber.
- **Surfaces Carrying Author Identity**:
  1. Header — `SiteBrand` rendered inside the home-link anchor. No other text in that anchor; the wordmark *is* the brand.
  2. Home page introduction — the motto-led identity block rendered by `src/components/HomeIdentity.astro`: `tagline` as the `h1` (the author motto, e.g. `도전과 성취를 즐깁니다.` / `I enjoy the climb and the summit.`), the name as a smaller `<p>`, the short `homeSummary` paragraph, and an icon-only socials row. The identity data is read from the same `pages` collection record (`ko/about`, `en/about`) that powers `/about` so the home and `/about` cannot drift. The home does not show the photo, education, or experience — those stay on `/about`. The nickname does not appear in the motto. See `docs/spec-home-theme.md`.
  3. `/about` page — full identity record: name, photo, summary, socials, education, experience. See `docs/spec-about.md`.
  4. Footer copyright line — `© <year> sings.dev`. Single token plus the year, no trailing descriptor.
- **Guardrails**:
  - The brand is one line. No subtitle, no eyebrow, no slogan, no nickname re-introduction.
  - The home and `/about` read identity data from the same `pages` collection record (`ko/about`, `en/about`); do not duplicate the identity strings in another collection or hard-code them on the home page.
  - The motto lives at `identity.tagline` and renders only on the home. Do not introduce a separate slogan / byline surface, and do not show the motto on `/about`.
  - The home identity stops at socials. Photo, education, and experience stay on `/about` only — that hierarchy is what keeps the home from drifting into resume-site / personal-landing-page energy.
  - Socials on the home render as icon-only links with `aria-label`; socials on `/about` render with visible text labels. `SocialIcon.astro` is the shared SVG source for both variants.
  - The header brand stays a single line at every viewport via `whitespace-nowrap`. On sub-sm, the primary nav links (`포스트` / `소개`) hide via `hidden sm:inline-block` so the brand keeps its room; `/posts` and `/about` remain reachable through the home page's existing entries (`$ whoami?` and `모든 글`).
  - The amber accent is brand-only. Do not extend `text-amber-*` to links, buttons, headings, or any non-brand surface.
  - The cursor blinks at 1Hz with `step-end` timing and respects `prefers-reduced-motion: reduce`. Do not speed it up, fade it, or color-cycle it.
- **What To Avoid**:
  - Reintroducing the SM58-style microphone, a condenser stand microphone, a musical-note motif, or any iconography that competes with the editorial wordmark.
  - Reintroducing the `Singing Developer` / `노래하는 개발자` nickname as visible copy — header, home, footer, `/about`, alt text, OG description, anywhere.
  - Wrapping the brand wordmark in inline-code styling (background tint + rounded rectangle). The bare wordmark was chosen during brainstorming; do not bring back the wrap without reopening the design.
  - Replacing the cursor `<span>` with a unicode `▌` character. The styled span renders consistently across mono font fallbacks.
  - Any per-post author block on post detail pages. Author identity stays implicit through the site shell.
  - Any non-text decoration alongside the footer signature.
  - Any branding-style treatment ("™", slogan, tagline bar).
```

- [ ] **Step 5.2: Update `docs/spec-layout.md` — Header section**

In `docs/spec-layout.md`, find the **Header** section (starts at the `- **Header**:` bullet near the bottom of the file). Replace the `- Left:` bullet:

```markdown
  - Left: a single link combining the `SiteLogo` microphone SVG mark and the `sings.dev` text, pointing at the locale-aware home page. See `docs/spec-site-identity.md`.
```

with:

```markdown
  - Left: a single link rendering the `SiteBrand` wordmark, pointing at the locale-aware home page. `SiteBrand` carries the entire brand (the `$ ` prompt, `sings.dev` wordmark, and blinking cursor); no separate logo mark or extra text sits in the anchor. See `docs/spec-site-identity.md`.
```

Then find the `- Every nav link uses` bullet:

```markdown
  - Every nav link uses `whitespace-nowrap` so Korean labels cannot split mid-word when the header compresses on narrow viewports. Nav and control gaps use `gap-4 sm:gap-5` and `gap-2 sm:gap-3` respectively to keep the logo, nav, and controls on a single row down to iPhone-SE width.
```

Replace with:

```markdown
  - Every nav link uses `whitespace-nowrap` so Korean labels cannot split mid-word when the header compresses on narrow viewports. Nav and control gaps use `gap-4 sm:gap-5` and `gap-2 sm:gap-3` respectively to keep the brand, nav, and controls on a single row down to iPhone-SE width.
  - On sub-sm viewports, each primary-nav `<li>` carries `hidden sm:inline-block` so the `포스트` / `소개` text labels hide and the brand keeps its room. The right-side control cluster (search, locale switcher, theme toggle) stays on every viewport. Mobile readers reach `/posts` and `/about` via the home page's `$ whoami?` link and `모든 글` link.
```

- [ ] **Step 5.3: Update `docs/spec-layout.md` — Footer section**

In `docs/spec-layout.md`, find the **Footer** section:

```markdown
- **Footer**:
  - Keep a simple single-line signature at the bottom reading `© <year> sings.dev — Singing Developer`. No additional links, icons, or rows.
```

Replace with:

```markdown
- **Footer**:
  - Keep a simple single-line signature at the bottom reading `© <year> sings.dev`. No additional links, icons, or rows. The author nickname does not appear here.
```

- [ ] **Step 5.4: Sanity-check the two spec files**

Run:

```bash
grep -n "SiteLogo\|microphone\|Singing Developer" docs/spec-site-identity.md docs/spec-layout.md
```

Expected: no matches. If anything prints, the corresponding spec still has stale wording — re-read the section and fix.

- [ ] **Step 5.5: Commit**

```bash
git add docs/spec-site-identity.md docs/spec-layout.md
git commit -m "$(cat <<'EOF'
docs: align site-identity and layout specs with the SiteBrand redesign

Spec-site-identity is rewritten to describe the wordmark + cursor brand,
the amber-only-on-brand rule, and the no-nickname-anywhere rule. Spec-
layout's Header section gains the sub-sm nav-text rule, and the Footer
signature line drops the Singing Developer suffix.
EOF
)"
```

---

## Final Verification

After Task 5 commits, run a last full check:

- [ ] **Step F.1: Run the full test suite**

Run: `npm test`

Expected: every test passes. Sanity-confirm `tests/site-logo.test.mjs` did not somehow reappear and that `tests/site-brand.test.mjs`, the updated `header-layout.test.mjs`, and the updated `footer-signature.test.mjs` all pass.

- [ ] **Step F.2: Visual smoke test**

Run: `npm run dev`. In the browser:

1. Home page (desktop, dark mode): header shows `$ sings.dev▌`, amber on `$`/`.dev`/cursor, blinking. Footer shows `© <year> sings.dev`.
2. Toggle light mode: amber shifts to the darker variant. Cursor keeps blinking.
3. Narrow to mobile: `포스트` / `소개` hide; brand stays a single line; search/EN/theme remain.
4. DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: cursor freezes visible.
5. Navigate to `/posts` and `/about`: header and footer match the home page.

- [ ] **Step F.3: Final cleanup grep**

The code surfaces (src/, tests/) must contain none of the old identifiers. The docs may legitimately reference the nickname and the microphone as historical context (rewritten `spec-site-identity.md`) or as cautionary text (What To Avoid sections), so docs are excluded from this grep.

Run:

```bash
grep -rn "SiteLogo\|data-site-logo" src/ tests/
grep -rn "Singing Developer\|microphone" src/ tests/
```

Expected: both commands print nothing.

If either prints a hit, fix it before declaring done.

---

## Notes on Test Style

The new `tests/site-brand.test.mjs` deliberately uses the same `readFile` + regex pattern as `tests/header-layout.test.mjs` and `tests/footer-signature.test.mjs` rather than the `experimental_AstroContainer` pattern that `tests/site-logo.test.mjs` used. The source-pattern tests are simpler, faster, and let us assert exact class strings and ordering without compiling `.astro` files. The `SiteBrand` component is a pure template (no frontmatter logic), so source-pattern tests cover its behavior exhaustively.

If a future change adds props or runtime logic to `SiteBrand`, a runtime-rendering test using `experimental_AstroContainer` becomes appropriate — but only once there is runtime logic to test.
