# Header Full-Bleed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the header background and bottom border full-bleed while keeping the header contents aligned to the existing centered site container.

**Architecture:** Keep the existing page width rules for content, but split the header shell from the page shell. `Layout.astro` will render the header as a sibling of the centered content wrapper, and `Header.astro` will introduce its own inner `max-w-4xl` container for alignment.

**Tech Stack:** Astro, Tailwind CSS, Node.js built-in test runner

---

### Task 1: Lock in the intended structure with a regression test

**Files:**
- Create: `tests/header-layout.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("layout renders the header outside the centered site shell", async () => {
  const layout = await readFile(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8");
  const headerIndex = layout.indexOf("<Header lang={lang} />");
  const shellIndex = layout.indexOf("max-w-4xl");

  assert.notEqual(headerIndex, -1);
  assert.notEqual(shellIndex, -1);
  assert.ok(headerIndex < shellIndex);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="layout renders the header outside the centered site shell"`
Expected: FAIL because the current layout nests the header inside the centered wrapper.

- [ ] **Step 3: Add the companion header container test**

```js
test("header keeps its controls inside an inner centered container", async () => {
  const header = await readFile(new URL("../src/components/Header.astro", import.meta.url), "utf8");

  assert.match(
    header,
    /<div class="mx-auto flex w-full max-w-4xl[^"]*px-4[^"]*sm:px-6/,
  );
});
```

- [ ] **Step 4: Run the targeted test file again**

Run: `npm test -- tests/header-layout.test.mjs`
Expected: FAIL because `Header.astro` does not yet have the inner centered wrapper.

### Task 2: Implement the full-bleed header shell

**Files:**
- Modify: `src/layouts/Layout.astro`
- Modify: `src/components/Header.astro`
- Test: `tests/header-layout.test.mjs`

- [ ] **Step 1: Move the header outside the centered page shell**

```astro
<body class="flex min-h-screen flex-col ...">
  <Header lang={lang} />
  <div class="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 sm:px-6">
    <main class="flex-1 py-12 sm:py-16">
      <div class={contentClass}>
        <slot />
      </div>
    </main>
    <Footer />
  </div>
</body>
```

- [ ] **Step 2: Add an inner centered container inside the header**

```astro
<header class="sticky top-0 z-40 border-b ...">
  <div class="mx-auto flex w-full max-w-4xl items-center justify-between gap-6 px-4 py-6 sm:px-6">
    ...
  </div>
</header>
```

- [ ] **Step 3: Run the regression test**

Run: `npm test -- tests/header-layout.test.mjs`
Expected: PASS

### Task 3: Update product docs

**Files:**
- Modify: `docs/spec-layout.md`
- Modify: `docs/spec-home-theme.md`

- [ ] **Step 1: Add the new global layout rule**

```md
- Render the sticky header chrome full-bleed across the viewport.
- Keep header contents inside the same centered `max-w-4xl` container used by the rest of the site shell.
```

- [ ] **Step 2: Clarify the visual intent in the home/theme spec**

```md
- The header background and bottom border should span the full viewport width while the navigation and controls remain aligned to the centered content container.
```

- [ ] **Step 3: Sanity-check the wording against the implemented structure**

Run: `rg -n "full-bleed|max-w-4xl|header background" docs/spec-layout.md docs/spec-home-theme.md`
Expected: Matching lines describe the same structure the code now uses.

### Task 4: Verify the change end to end

**Files:**
- Verify: `tests/header-layout.test.mjs`
- Verify: `src/layouts/Layout.astro`
- Verify: `src/components/Header.astro`
- Verify: `docs/spec-layout.md`
- Verify: `docs/spec-home-theme.md`

- [ ] **Step 1: Run the regression test suite**

Run: `npm test -- tests/header-layout.test.mjs`
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Review the final diff**

Run: `git diff -- src/layouts/Layout.astro src/components/Header.astro docs/spec-layout.md docs/spec-home-theme.md package.json tests/header-layout.test.mjs`
Expected: Only the intended header shell, docs, and test changes appear.
