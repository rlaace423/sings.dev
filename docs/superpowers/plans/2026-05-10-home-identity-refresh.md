# Home Identity Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page's reused `/about` identity card with a slimmer, motto-led `HomeIdentity` block (tagline `h1` + name + short intro + icon-only socials), keeping `/about`'s full identity card on `/about` only.

**Architecture:** Introduce `src/components/HomeIdentity.astro` as a sibling to `AboutIdentity.astro`. Each component renders its own variant of the identity card; both components read identity data from the same `pages` content collection record (`ko/about`, `en/about`) so the home and `/about` cannot drift. The schema gains two new required fields (`tagline`, `homeSummary`) authored per locale in the existing `about.md` frontmatter.

**Tech Stack:** Astro 5 (content collections, container API), Tailwind CSS (existing tokens only), Node test runner (`node --test`), `@astrojs/compiler` for component-level test renders.

**Reference Spec:** `docs/superpowers/specs/2026-05-10-home-identity-refresh-design.md`

---

### Task 1: Reset Phase 1 working tree and lock in Categories block removal

**Context:** The working tree carries Phase 1 changes (now superseded by this plan): the Categories block has been deleted, but the home pages were rewired to reuse `AboutIdentity` and the spec docs were rewritten to describe that pattern. The deletions are still wanted — the modifications are not. Restore the modified files to baseline so this plan can rewrite them with the final design in clean steps, and commit the deletions as their own focused commit.

**Files:**
- Delete (already deleted in working tree): `src/components/HomeCategories.astro`, `tests/home-categories.test.mjs`, `docs/spec-home-categories.md`
- Discard Phase 1 modifications: `docs/spec-about.md`, `docs/spec-home-theme.md`, `docs/spec-roadmap.md`, `docs/spec-site-identity.md`, `src/pages/index.astro`, `src/pages/en/index.astro`
- Discard Phase 1 untracked: `tests/home-page.test.mjs`

- [ ] **Step 1: Restore Phase 1 modifications back to baseline**

Run:

```bash
git restore docs/spec-about.md docs/spec-home-theme.md docs/spec-roadmap.md docs/spec-site-identity.md src/pages/index.astro src/pages/en/index.astro
rm -f tests/home-page.test.mjs
```

Expected: `git status` now shows only three deletions (`HomeCategories.astro`, `home-categories.test.mjs`, `spec-home-categories.md`), no modifications, no untracked files.

- [ ] **Step 2: Verify the working tree is clean except for the three deletions**

Run: `git status --short`

Expected output (exact lines, in any order):

```
 D docs/spec-home-categories.md
 D src/components/HomeCategories.astro
 D tests/home-categories.test.mjs
```

- [ ] **Step 3: Stage the three deletions**

Run:

```bash
git add -- docs/spec-home-categories.md src/components/HomeCategories.astro tests/home-categories.test.mjs
git status --short
```

Expected: same three lines but now `D` is in the left column (staged), not the right.

- [ ] **Step 4: Commit**

Run:

```bash
git commit -m "$(cat <<'EOF'
refactor: drop home Categories block

The home page no longer carries a dedicated Categories block.
Category browsing lives on /posts and on category pages.
Removes the component, its tests, and the spec doc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds. `git log --oneline -2` shows the new `refactor: drop home Categories block` commit on top of `docs: add home identity refresh design spec`.

---

### Task 2: Extend `pages.identity` schema and update both `about.md` frontmatter records

**Context:** Add two required fields to the `pages.identity` Zod schema: `tagline` (the home `h1` motto) and `homeSummary` (the home's short two-sentence intro). Then populate them in both locales' `about.md` frontmatter, and at the same time update `name` to the new public-facing format and refresh `summary` (the longer `/about` paragraph) to the new copy. Schema and content land together so the build passes at the end of this task.

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/pages/ko/about.md`
- Modify: `src/content/pages/en/about.md`

- [ ] **Step 1: Read the current schema and confirm where the `identity` object is defined**

Run: `cat src/content.config.ts`

Expected: the file contains a `pages` collection with a Zod schema that includes an `identity: z.object({...}).optional()` block. Note the surrounding object so the next step inserts `tagline` and `homeSummary` consistently.

- [ ] **Step 2: Add `tagline` and `homeSummary` as required string fields inside `identity`**

In `src/content.config.ts`, inside the `identity` object, add two `z.string()` fields right after `name`:

```ts
identity: z
  .object({
    name: z.string(),
    tagline: z.string(),
    homeSummary: z.string(),
    summary: z.string(),
    photo: z.object({ src: z.string(), alt: z.string() }),
    socials: z.array(...).default([]),
    education: z.array(...).default([]),
    experience: z.array(...).default([]),
  })
  .optional(),
```

Replace `...` with whatever already exists in the current schema for those fields (do not change existing field shapes — only add `tagline` and `homeSummary`).

- [ ] **Step 3: Run the build to confirm it now fails because the existing frontmatter is missing the new fields**

Run: `npm run build`

Expected: build fails. The error message names `ko/about` (and likely `en/about`) and reports that `tagline` is required (or `homeSummary`). This is the failing-test signal that the schema change is in place.

- [ ] **Step 4: Update `src/content/pages/ko/about.md` frontmatter**

Open the file. Replace the existing `identity:` block so it looks like this (keep `photo`, `socials`, `education`, `experience` exactly as they are today; only `name`, `tagline`, `homeSummary`, `summary` change):

```yaml
identity:
  name: "김상호 (Sam Kim)"
  tagline: "도전과 성취를 즐깁니다."
  homeSummary: "소프트웨어는 흔들리지 않는 목적 위에 설 때 오래 버틴다고 생각합니다. 현재 핀테크 스타트업에서 Backend Lead로 일하고 있으며, 암호학·블록체인·TypeScript, 홈 랩(Home Lab) 인프라 구축, 최근에는 AI까지 두루 관심을 두고 있습니다."
  summary: "백엔드 아키텍처와 분산 시스템을 설계해 온 엔지니어입니다. 핀테크 스타트업에서 8년 동안 멀티체인 지갑 API와 TSS 기반 MPC 서명 시스템을 만들어 오면서, 흔들리지 않는 목적 위에 서 있어야 오래 유지할 수 있는 소프트웨어를 만들 수 있다고 생각합니다. 지금까지 제가 느끼고 배운 것을 이 블로그에 정리합니다."
  photo:
    # ... existing photo block, unchanged
  socials:
    # ... existing socials, unchanged
  education:
    # ... existing education, unchanged
  experience:
    # ... existing experience, unchanged
```

The `name` flips from `Sam (김상호)` to `김상호 (Sam Kim)`. Both `summary` strings change to the new copy. `photo`, `socials`, `education`, `experience` stay byte-identical.

- [ ] **Step 5: Update `src/content/pages/en/about.md` frontmatter**

Same shape as Step 4 but with the English values:

```yaml
identity:
  name: "Sam Kim (Sangho Kim)"
  tagline: "I enjoy the climb and the summit."
  homeSummary: "I think software lasts longest when it stands on a purpose that doesn't waver. I'm currently a Backend Lead at a fintech startup, with broad interests across cryptography, blockchain, TypeScript, home lab infrastructure, and more recently AI."
  summary: "I'm a backend engineer who designs distributed systems. Over eight years at a fintech startup — building a multi-chain wallet API and a TSS-based MPC signing system — I've come to believe that software lasts only when it stands on a purpose that doesn't waver. This blog is where I keep what I've felt and learned along the way."
  photo:
    # ... existing photo, unchanged
  socials:
    # ... existing socials, unchanged
  education:
    # ... existing education, unchanged
  experience:
    # ... existing experience, unchanged
```

- [ ] **Step 6: Run the build to confirm the schema + frontmatter combination now succeeds**

Run: `npm run build`

Expected: build succeeds. `dist/` is regenerated with 65 (or more) pages. No schema errors.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/content.config.ts src/content/pages/ko/about.md src/content/pages/en/about.md
git commit -m "$(cat <<'EOF'
feat: extend pages.identity with tagline + homeSummary

Adds two required fields to the identity schema:
- tagline: the author motto, used as the home page h1
- homeSummary: the short home-page intro paragraph

Both KO and EN about.md records gain the new fields and refresh
the public-facing name format and the longer summary.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

---

### Task 3: Build `HomeIdentity.astro` component with TDD

**Context:** Add a new component that renders the home's identity card: tagline (`h1`), name (styled `<p>`), summary (styled `<p>`), and an icon-only socials `<ul>`. Each social `<a>` carries an `aria-label`; visible labels are dropped. Test the component in isolation using the same pattern as `tests/about-identity.test.mjs` (Astro compiler + experimental container + a `SocialIcon` stub).

**Files:**
- Create: `tests/home-identity.test.mjs`
- Create: `src/components/HomeIdentity.astro`

- [ ] **Step 1: Read the existing component-level test scaffolding pattern**

Run: `head -90 tests/about-identity.test.mjs`

Expected: confirm the test scaffolding pattern — `transform` from `@astrojs/compiler`, `experimental_AstroContainer as AstroContainer`, runtime stub at a temp dir, `SocialIcon` stub at a temp dir. The `HomeIdentity` test will reuse this exact scaffolding.

- [ ] **Step 2: Create `tests/home-identity.test.mjs` with failing tests**

Create the file with this content:

```js
// tests/home-identity.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoHomeIdentityUrl = new URL(
	"../src/components/HomeIdentity.astro",
	import.meta.url,
);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderHomeIdentity(props) {
	const source = await readFile(repoHomeIdentityUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoHomeIdentityUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "home-identity-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const socialIconStubPath = join(tempDir, "SocialIcon.ts");
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

		const socialIconStubSrc = [
			"---",
			"const { type } = Astro.props;",
			"---",
			'<span data-social-icon-stub={type} />',
			"",
		].join("\n");
		const socialIconStubCompiled = await transform(socialIconStubSrc, {
			filename: join(tempDir, "SocialIcon.astro"),
			internalURL: "astro/runtime/server/index.js",
		});
		await writeFile(
			socialIconStubPath,
			socialIconStubCompiled.code.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			),
		);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		rewritten = rewritten.replaceAll(
			"./SocialIcon.astro",
			pathToFileURL(socialIconStubPath).href,
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

const baseProps = () => ({
	lang: "ko",
	tagline: "도전과 성취를 즐깁니다.",
	name: "김상호 (Sam Kim)",
	summary: "백엔드와 인프라를 다룹니다.",
	socials: [
		{ type: "github", href: "https://github.com/example", label: "GitHub" },
		{ type: "email", href: "mailto:hello@example.com", label: "Email" },
		{ type: "linkedin", href: "https://linkedin.com/in/example", label: "LinkedIn" },
		{ type: "instagram", href: "https://instagram.com/example", label: "Instagram" },
	],
});

test("HomeIdentity renders the tagline as a top-level h1", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	assert.match(
		rendered,
		/<h1[^>]*data-home-tagline[^>]*>[\s\S]*도전과 성취를 즐깁니다\.[\s\S]*<\/h1>/,
	);
});

test("HomeIdentity renders the name in its own hook below h1, not as a heading", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	assert.match(
		rendered,
		/<p[^>]*data-home-author-name[^>]*>[\s\S]*김상호 \(Sam Kim\)[\s\S]*<\/p>/,
	);
});

test("HomeIdentity renders the summary in its own hook with the prose-comfort body size", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	assert.match(
		rendered,
		/<p[^>]*data-home-author-summary[^>]*class="[^"]*text-lg[^"]*leading-8[^"]*"[^>]*>[\s\S]*백엔드와 인프라를 다룹니다\./,
	);
});

test("HomeIdentity renders the tagline before the name, and the name before the summary", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	const taglineIndex = rendered.indexOf("data-home-tagline");
	const nameIndex = rendered.indexOf("data-home-author-name");
	const summaryIndex = rendered.indexOf("data-home-author-summary");
	assert.ok(
		taglineIndex >= 0 && nameIndex > taglineIndex && summaryIndex > nameIndex,
		"home identity order broken: tagline -> name -> summary",
	);
});

test("HomeIdentity renders one icon-only social link per entry, in order, with aria-label and no visible label text", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	const order = ["github", "email", "linkedin", "instagram"];
	const stubIndexes = order.map((type) =>
		rendered.indexOf(`data-social-icon-stub="${type}"`),
	);
	stubIndexes.forEach((index, i) => {
		assert.ok(index >= 0, `missing icon stub for ${order[i]}`);
	});
	for (let i = 1; i < stubIndexes.length; i++) {
		assert.ok(
			stubIndexes[i - 1] < stubIndexes[i],
			`social order broken between ${order[i - 1]} and ${order[i]}`,
		);
	}
	assert.match(rendered, /<a[^>]*href="https:\/\/github\.com\/example"[^>]*aria-label="GitHub"/);
	assert.match(rendered, /<a[^>]*href="mailto:hello@example.com"[^>]*aria-label="Email"/);
	assert.match(rendered, /<a[^>]*href="https:\/\/linkedin\.com\/in\/example"[^>]*aria-label="LinkedIn"/);
	assert.match(rendered, /<a[^>]*href="https:\/\/instagram\.com\/example"[^>]*aria-label="Instagram"/);
	assert.doesNotMatch(rendered, /<span[^>]*>\s*GitHub\s*<\/span>/);
});

test("HomeIdentity marks external social links rel=me noopener and leaves mailto bare", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	assert.match(rendered, /<a[^>]*href="https:\/\/github\.com\/example"[^>]*rel="me noopener"/);
	assert.match(rendered, /<a[^>]*href="https:\/\/linkedin\.com\/in\/example"[^>]*rel="me noopener"/);
	assert.match(rendered, /<a[^>]*href="https:\/\/instagram\.com\/example"[^>]*rel="me noopener"/);
	assert.doesNotMatch(rendered, /<a[^>]*href="mailto:hello@example.com"[^>]*rel=/);
});

test("HomeIdentity uses Korean ul aria-label for ko and English for en", async () => {
	const ko = await renderHomeIdentity({ ...baseProps(), lang: "ko" });
	const en = await renderHomeIdentity({ ...baseProps(), lang: "en" });
	assert.match(ko, /<ul[^>]*aria-label="연락처와 프로필"/);
	assert.match(en, /<ul[^>]*aria-label="Contact and profiles"/);
});

test("HomeIdentity omits the socials list entirely when the array is empty", async () => {
	const rendered = await renderHomeIdentity({ ...baseProps(), socials: [] });
	assert.doesNotMatch(rendered, /data-home-socials/);
	assert.doesNotMatch(rendered, /<ul[^>]*aria-label="연락처와 프로필"/);
});
```

- [ ] **Step 3: Run the new test file and confirm it fails because the component does not exist**

Run: `node --test tests/home-identity.test.mjs 2>&1 | head -20`

Expected: tests fail with a module-resolution or compile error citing the missing `src/components/HomeIdentity.astro` file. This confirms the failing-test stage of TDD.

- [ ] **Step 4: Create `src/components/HomeIdentity.astro`**

Write the file with this content:

```astro
---
import SocialIcon, { type SocialType } from "./SocialIcon.astro";
import { defaultLocale, type Locale, isLocale } from "../i18n/ui";

interface SocialLink {
	type: SocialType;
	href: string;
	label?: string;
}

interface Props {
	lang?: Locale;
	tagline: string;
	name: string;
	summary: string;
	socials?: SocialLink[];
}

const {
	lang: langProp,
	tagline,
	name,
	summary,
	socials = [],
} = Astro.props;

const lang = isLocale(langProp) ? langProp : defaultLocale;
const socialsLabel = lang === "ko" ? "연락처와 프로필" : "Contact and profiles";
---

<section class="space-y-6">
	<h1
		data-home-tagline
		class="text-4xl font-semibold tracking-tight text-dawn-800 dark:text-night-50 sm:text-5xl"
	>
		{tagline}
	</h1>

	<p
		data-home-author-name
		class="text-2xl font-semibold tracking-tight text-dawn-800 dark:text-night-50"
	>
		{name}
	</p>

	<p
		data-home-author-summary
		class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200"
	>
		{summary}
	</p>

	{
		socials.length > 0 && (
			<ul
				data-home-socials
				aria-label={socialsLabel}
				class="flex flex-wrap gap-x-5 gap-y-3 text-sm text-dawn-700 dark:text-night-200"
			>
				{socials.map((item) => (
					<li>
						<a
							href={item.href}
							rel={item.type === "email" ? undefined : "me noopener"}
							aria-label={item.label ?? item.type}
							class="inline-flex items-center transition-colors hover:text-dawn-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dawn-100 dark:hover:text-night-50 dark:focus-visible:ring-night-500 dark:focus-visible:ring-offset-night-800"
						>
							<SocialIcon type={item.type} class="h-4 w-4" />
						</a>
					</li>
				))}
			</ul>
		)
	}
</section>
```

- [ ] **Step 5: Run the test file and confirm all tests pass**

Run: `node --test tests/home-identity.test.mjs 2>&1 | tail -25`

Expected: all 8 tests pass. The summary line at the end shows `# pass 8` and `# fail 0`.

If any test fails, fix the component (NOT the tests) until they pass. The most likely failure modes:
- `aria-label` attribute placed in the wrong position — adjust the markup so the regex matches
- Missing `data-home-tagline` / `data-home-author-name` / `data-home-author-summary` hooks — add them
- Visible `<span>` label inside the social `<a>` — remove it (icon-only is the contract)

- [ ] **Step 6: Commit**

Run:

```bash
git add src/components/HomeIdentity.astro tests/home-identity.test.mjs
git commit -m "$(cat <<'EOF'
feat: add HomeIdentity component for the home page

Renders the home identity card: tagline (h1), name, short
intro, and icon-only socials with aria-label. Reuses
SocialIcon.astro for the inline SVGs. AboutIdentity stays
untouched for /about.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

---

### Task 4: Wire `HomeIdentity` into both home pages and update the page-level test

**Context:** Replace the home pages' content with the final structure: read `identity.tagline`, `identity.name`, `identity.homeSummary`, `identity.socials` from the `pages` collection record, hand them to `HomeIdentity`, then render the existing Recent Posts section unchanged. Update the page-level `home-page.test.mjs` to assert the new structure (HomeIdentity stub recorded with the right props, no AboutIdentity, single `h2` Recent Posts heading). Both home pages and the test land in one commit so the tests track the page change.

**Files:**
- Modify (full rewrite): `src/pages/index.astro`
- Modify (full rewrite): `src/pages/en/index.astro`
- Create: `tests/home-page.test.mjs`

- [ ] **Step 1: Write the new page-level test file with failing assertions**

Create `tests/home-page.test.mjs`:

```js
// tests/home-page.test.mjs
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoBlogUrl = new URL("../src/utils/blog.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderHomePage(sourceUrl, { aboutEntry, posts }) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "home-page-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const i18nStubPath = join(tempDir, "astro-i18n-stub.ts");
	const contentStubPath = join(tempDir, "astro-content-stub.ts");
	const isEnglishPage = sourceUrl.pathname.includes("/src/pages/en/");
	const pageDirectory = isEnglishPage
		? join(tempDir, "src", "pages", "en")
		: join(tempDir, "src", "pages");
	const pagePath = join(pageDirectory, "page.ts");
	const layoutStubPath = join(tempDir, "src", "layouts", "Layout.ts");
	const homeIdentityStubPath = join(
		tempDir,
		"src",
		"components",
		"HomeIdentity.ts",
	);

	try {
		await mkdir(dirname(layoutStubPath), { recursive: true });
		await mkdir(dirname(homeIdentityStubPath), { recursive: true });
		await mkdir(pageDirectory, { recursive: true });
		await writeFile(
			runtimeStubPath,
			[
				`export * from ${JSON.stringify(astroRuntimeUrl)};`,
				"export const createMetadata = () => ({})",
				"",
			].join("\n"),
		);
		await writeFile(
			i18nStubPath,
			[
				"export const getRelativeLocaleUrl = (locale, path) => `/${locale}/${path}/`;",
				"",
			].join("\n"),
		);

		const layoutCompiled = await transform(
			[
				"---",
				"const { title = '', lang = 'en' } = Astro.props;",
				"---",
				'<div data-layout-title={title} data-layout-lang={lang}><slot /></div>',
				"",
			].join("\n"),
			{
				filename: join(tempDir, "LayoutStub.astro"),
				internalURL: "astro/runtime/server/index.js",
			},
		);
		await writeFile(
			layoutStubPath,
			layoutCompiled.code.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			),
		);

		const homeIdentityStubCompiled = await transform(
			[
				"---",
				"const { lang = 'ko', tagline = '', name = '', summary = '', socials = [] } = Astro.props;",
				"---",
				'<section',
				'  data-home-identity-stub',
				'  data-lang={lang}',
				'  data-tagline={tagline}',
				'  data-name={name}',
				'  data-summary={summary}',
				'  data-socials={socials.map((s) => `${s.type}:${s.href}:${s.label ?? ""}`).join("|")}',
				"/>",
				"",
			].join("\n"),
			{
				filename: join(tempDir, "HomeIdentityStub.astro"),
				internalURL: "astro/runtime/server/index.js",
			},
		);
		await writeFile(
			homeIdentityStubPath,
			homeIdentityStubCompiled.code.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			),
		);

		await writeFile(
			contentStubPath,
			[
				`const aboutEntries = JSON.parse(${JSON.stringify(JSON.stringify([aboutEntry]))});`,
				`const posts = JSON.parse(${JSON.stringify(JSON.stringify(posts))}).map((entry) => ({`,
				"  ...entry,",
				"  data: {",
				"    ...entry.data,",
				"    pubDate: new Date(entry.data.pubDate),",
				"  },",
				"}));",
				"export const getCollection = async (name, filter) => {",
				"  const source = name === 'pages' ? aboutEntries : posts;",
				"  return source.filter((entry) => (filter ? filter(entry) : true));",
				"};",
				"",
			].join("\n"),
		);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		rewritten = rewritten.replaceAll("astro:i18n", pathToFileURL(i18nStubPath).href);
		rewritten = rewritten.replaceAll(
			"astro:content",
			pathToFileURL(contentStubPath).href,
		);

		rewritten = rewritten.replaceAll("../../utils/blog", repoBlogUrl);
		rewritten = rewritten.replaceAll("../utils/blog", repoBlogUrl);

		for (const [find, replaceWith] of [
			["../layouts/Layout.astro", "../layouts/Layout.ts"],
			["../../layouts/Layout.astro", "../../layouts/Layout.ts"],
			["../components/HomeIdentity.astro", "../components/HomeIdentity.ts"],
			["../../components/HomeIdentity.astro", "../../components/HomeIdentity.ts"],
		]) {
			rewritten = rewritten.replaceAll(find, replaceWith);
		}

		await writeFile(pagePath, rewritten);

		const component = await import(pathToFileURL(pagePath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, {});
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

const samplePost = (id, pubDate, category) => ({
	id,
	slug: id.split("/").at(-1) ?? id,
	body: "",
	collection: "blog",
	data: {
		title: `Title for ${id}`,
		description: `Description for ${id}`,
		pubDate,
		category,
		tags: [],
	},
});

const aboutEntry = (lang) => ({
	id: `${lang}/about`,
	slug: "about",
	body: "",
	collection: "pages",
	data: {
		title: lang === "ko" ? "소개" : "About",
		description: "…",
		identity: {
			name: lang === "ko" ? "김상호 (Sam Kim)" : "Sam Kim (Sangho Kim)",
			tagline: lang === "ko" ? "도전과 성취를 즐깁니다." : "I enjoy the climb and the summit.",
			homeSummary: `home-summary-${lang}`,
			summary: `about-summary-${lang}`,
			photo: { src: "/avatar-placeholder.png", alt: `alt-${lang}` },
			socials: [
				{ type: "github", href: "https://github.com/x", label: "GitHub" },
				{ type: "email", href: "mailto:x@x", label: "Email" },
				{ type: "linkedin", href: "https://linkedin.com/in/x", label: "LinkedIn" },
				{ type: "instagram", href: "https://instagram.com/x", label: "Instagram" },
			],
			education: [{ school: "School A", degree: "Degree A" }],
			experience: [
				{
					company: "Co A",
					role: "Role A",
					start: "2023",
					end: lang === "ko" ? "현재" : "Present",
					description: "desc-a",
				},
			],
		},
	},
});

const koPosts = [
	samplePost("ko/one", "2026-04-10T00:00:00.000Z", "backend"),
	samplePost("ko/two", "2026-04-08T00:00:00.000Z", "infra"),
	samplePost("ko/three", "2026-04-05T00:00:00.000Z", "backend"),
];

const enPosts = [
	samplePost("en/one", "2026-04-11T00:00:00.000Z", "backend"),
	samplePost("en/two", "2026-04-06T00:00:00.000Z", "mpc"),
];

test("ko home page passes tagline, name, homeSummary, socials from ko/about into HomeIdentity", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/index.astro", import.meta.url),
		{ aboutEntry: aboutEntry("ko"), posts: koPosts },
	);
	assert.match(rendered, /data-home-identity-stub/);
	assert.match(rendered, /data-lang="ko"/);
	assert.match(rendered, /data-tagline="도전과 성취를 즐깁니다."/);
	assert.match(rendered, /data-name="김상호 \(Sam Kim\)"/);
	assert.match(rendered, /data-summary="home-summary-ko"/);
	assert.match(
		rendered,
		/data-socials="github:https:\/\/github\.com\/x:GitHub\|email:mailto:x@x:Email\|linkedin:https:\/\/linkedin\.com\/in\/x:LinkedIn\|instagram:https:\/\/instagram\.com\/x:Instagram"/,
	);
});

test("ko home page renders identity stub before recent posts and drops the old hero / categories block", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/index.astro", import.meta.url),
		{ aboutEntry: aboutEntry("ko"), posts: koPosts },
	);
	const identityIndex = rendered.indexOf("data-home-identity-stub");
	const recentPostsIndex = rendered.indexOf('id="posts"');
	assert.ok(
		identityIndex >= 0 && recentPostsIndex > identityIndex,
		"identity stub must render before the recent posts section",
	);
	assert.doesNotMatch(rendered, /data-home-hero/);
	assert.doesNotMatch(rendered, /시스템의 구조를 씁니다\./);
	assert.doesNotMatch(rendered, /data-home-categories/);
	assert.doesNotMatch(rendered, /data-about-identity-stub/);
});

test("ko home page renders Recent Posts as a single h2 with the all-posts link, no eyebrow", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/index.astro", import.meta.url),
		{ aboutEntry: aboutEntry("ko"), posts: koPosts },
	);
	assert.match(
		rendered,
		/<h2[^>]*class="[^"]*text-2xl[^"]*"[^>]*>\s*최근 글\s*<\/h2>/,
	);
	const recentPostsBlock = rendered.slice(rendered.indexOf('id="posts"'));
	assert.doesNotMatch(
		recentPostsBlock,
		/<p[^>]*uppercase[^>]*tracking-\[0\.18em\][^>]*>[\s\S]*?최근 글[\s\S]*?<\/p>/,
	);
	assert.match(rendered, /href="\/ko\/posts\/"[^>]*>\s*모든 글\s*<\/a>/);
});

test("ko home page renders the recent posts list with locale-aware post links", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/index.astro", import.meta.url),
		{ aboutEntry: aboutEntry("ko"), posts: koPosts },
	);
	assert.match(rendered, /href="\/ko\/posts\/one\/"/);
	assert.match(rendered, /href="\/ko\/posts\/two\/"/);
	assert.match(rendered, /href="\/ko\/posts\/three\/"/);
});

test("en home page passes tagline, name, homeSummary, socials from en/about into HomeIdentity", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/en/index.astro", import.meta.url),
		{ aboutEntry: aboutEntry("en"), posts: enPosts },
	);
	assert.match(rendered, /data-home-identity-stub/);
	assert.match(rendered, /data-lang="en"/);
	assert.match(rendered, /data-tagline="I enjoy the climb and the summit."/);
	assert.match(rendered, /data-name="Sam Kim \(Sangho Kim\)"/);
	assert.match(rendered, /data-summary="home-summary-en"/);
});

test("en home page renders identity stub before recent posts and drops the old hero / categories block", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/en/index.astro", import.meta.url),
		{ aboutEntry: aboutEntry("en"), posts: enPosts },
	);
	const identityIndex = rendered.indexOf("data-home-identity-stub");
	const recentPostsIndex = rendered.indexOf('id="posts"');
	assert.ok(
		identityIndex >= 0 && recentPostsIndex > identityIndex,
		"identity stub must render before the recent posts section",
	);
	assert.doesNotMatch(rendered, /data-home-hero/);
	assert.doesNotMatch(rendered, /Notes on how systems hold together\./);
	assert.doesNotMatch(rendered, /data-home-categories/);
	assert.doesNotMatch(rendered, /data-about-identity-stub/);
});

test("en home page renders Recent Posts as a single h2 with the all-posts link, no eyebrow", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/en/index.astro", import.meta.url),
		{ aboutEntry: aboutEntry("en"), posts: enPosts },
	);
	assert.match(
		rendered,
		/<h2[^>]*class="[^"]*text-2xl[^"]*"[^>]*>\s*Recent Posts\s*<\/h2>/,
	);
	const recentPostsBlock = rendered.slice(rendered.indexOf('id="posts"'));
	assert.doesNotMatch(
		recentPostsBlock,
		/<p[^>]*uppercase[^>]*tracking-\[0\.18em\][^>]*>[\s\S]*?Latest writing[\s\S]*?<\/p>/,
	);
	assert.match(rendered, /href="\/en\/posts\/"[^>]*>\s*All posts\s*<\/a>/);
});

test("en home page renders the recent posts list with locale-aware post links", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/en/index.astro", import.meta.url),
		{ aboutEntry: aboutEntry("en"), posts: enPosts },
	);
	assert.match(rendered, /href="\/en\/posts\/one\/"/);
	assert.match(rendered, /href="\/en\/posts\/two\/"/);
});
```

- [ ] **Step 2: Run the new test file and confirm it fails because the home pages still use the old structure**

Run: `node --test tests/home-page.test.mjs 2>&1 | tail -25`

Expected: tests fail because `src/pages/index.astro` and `src/pages/en/index.astro` still match `main`'s baseline (eyebrow + tagline hero, HomeCategories import, etc.). Note that the page tests would also fail under the pre-existing Astro container module-resolution issue if the test infra isn't reaching the source files — verify the failures are content-related (assertion mismatches), not infrastructure. If they are infra-only, this step's expectation can be relaxed; the source-of-truth verification for this task is the build + dist HTML check in Task 6.

- [ ] **Step 3: Rewrite `src/pages/index.astro`**

Replace the file with:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n";
import { getCollection } from "astro:content";
import HomeIdentity from "../components/HomeIdentity.astro";
import Layout from "../layouts/Layout.astro";
import {
	getDisplayTitle,
	isVisiblePost,
	matchesLocale,
	sortPostsByDate,
	stripLocaleFromId,
} from "../utils/blog";

const [aboutPage] = await getCollection("pages", ({ id }) => id === "ko/about");

if (!aboutPage) {
	throw new Error("Missing ko/about page content.");
}

const identity = aboutPage.data.identity;

if (!identity) {
	throw new Error("Missing identity on ko/about page.");
}

const posts = await getCollection("blog", (post) => matchesLocale(post.id, "ko") && isVisiblePost(post));
const recentPosts = sortPostsByDate(posts).slice(0, 5);

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
---

<Layout
	title="홈 | sings.dev"
	description="백엔드 아키텍처, MPC 시스템, 인프라 라우팅에 대한 글을 모아 둔 공간입니다."
	lang="ko"
>
	<HomeIdentity
		lang="ko"
		tagline={identity.tagline}
		name={identity.name}
		summary={identity.homeSummary}
		socials={identity.socials}
	/>

	<section
		id="posts"
		data-home-recent-posts
		class="mt-16 space-y-4 border-t border-dawn-300 pt-10 dark:border-night-600"
	>
		<div class="flex items-end justify-between gap-4">
			<h2 class="text-2xl font-semibold tracking-tight text-dawn-800 dark:text-night-50">
				최근 글
			</h2>
			<a
				href={getRelativeLocaleUrl("ko", "posts")}
				class="text-sm text-dawn-700 transition-colors hover:text-dawn-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dawn-100 dark:text-night-200 dark:hover:text-night-50 dark:focus-visible:ring-night-500 dark:focus-visible:ring-offset-night-800"
			>
				모든 글
			</a>
		</div>

		<ul class="mt-6 divide-y divide-dawn-300 border-t border-dawn-300 dark:divide-night-600 dark:border-night-600">
			{
				recentPosts.map((post) => (
					<li class="py-8">
						<article class="space-y-3">
							<p class="text-sm text-dawn-600 dark:text-night-400">
								{formatDate(post.data.pubDate)}
							</p>
							<h3 class="text-2xl font-semibold tracking-tight text-dawn-800 dark:text-night-50">
								<a
									href={getRelativeLocaleUrl(
										"ko",
										`posts/${stripLocaleFromId(post.id)}`,
									)}
									class="transition-colors hover:text-dawn-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dawn-100 dark:hover:text-night-200 dark:focus-visible:ring-night-500 dark:focus-visible:ring-offset-night-800"
								>
									{getDisplayTitle(post)}
								</a>
							</h3>
							<p class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200">
								{post.data.description}
							</p>
						</article>
					</li>
				))
			}
		</ul>
	</section>
</Layout>
```

- [ ] **Step 4: Rewrite `src/pages/en/index.astro`**

Replace the file with the English equivalent (same structure, English copy and locale):

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n";
import { getCollection } from "astro:content";
import HomeIdentity from "../../components/HomeIdentity.astro";
import Layout from "../../layouts/Layout.astro";
import {
	getDisplayTitle,
	isVisiblePost,
	matchesLocale,
	sortPostsByDate,
	stripLocaleFromId,
} from "../../utils/blog";

const [aboutPage] = await getCollection("pages", ({ id }) => id === "en/about");

if (!aboutPage) {
	throw new Error("Missing en/about page content.");
}

const identity = aboutPage.data.identity;

if (!identity) {
	throw new Error("Missing identity on en/about page.");
}

const posts = await getCollection("blog", (post) => matchesLocale(post.id, "en") && isVisiblePost(post));
const recentPosts = sortPostsByDate(posts).slice(0, 5);

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
---

<Layout
	title="Home | sings.dev"
	description="Notes on backend architecture, MPC systems, and infrastructure routing."
	lang="en"
>
	<HomeIdentity
		lang="en"
		tagline={identity.tagline}
		name={identity.name}
		summary={identity.homeSummary}
		socials={identity.socials}
	/>

	<section
		id="posts"
		data-home-recent-posts
		class="mt-16 space-y-4 border-t border-dawn-300 pt-10 dark:border-night-600"
	>
		<div class="flex items-end justify-between gap-4">
			<h2 class="text-2xl font-semibold tracking-tight text-dawn-800 dark:text-night-50">
				Recent Posts
			</h2>
			<a
				href={getRelativeLocaleUrl("en", "posts")}
				class="text-sm text-dawn-700 transition-colors hover:text-dawn-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dawn-100 dark:text-night-200 dark:hover:text-night-50 dark:focus-visible:ring-night-500 dark:focus-visible:ring-offset-night-800"
			>
				All posts
			</a>
		</div>

		<ul class="mt-6 divide-y divide-dawn-300 border-t border-dawn-300 dark:divide-night-600 dark:border-night-600">
			{
				recentPosts.map((post) => (
					<li class="py-8">
						<article class="space-y-3">
							<p class="text-sm text-dawn-600 dark:text-night-400">
								{formatDate(post.data.pubDate)}
							</p>
							<h3 class="text-2xl font-semibold tracking-tight text-dawn-800 dark:text-night-50">
								<a
									href={getRelativeLocaleUrl(
										"en",
										`posts/${stripLocaleFromId(post.id)}`,
									)}
									class="transition-colors hover:text-dawn-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dawn-100 dark:hover:text-night-200 dark:focus-visible:ring-night-500 dark:focus-visible:ring-offset-night-800"
								>
									{getDisplayTitle(post)}
								</a>
							</h3>
							<p class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200">
								{post.data.description}
							</p>
						</article>
					</li>
				))
			}
		</ul>
	</section>
</Layout>
```

- [ ] **Step 5: Build and confirm both home pages compile**

Run: `npm run build 2>&1 | tail -10`

Expected: build succeeds. The summary line shows "X page(s) built". If the build fails, the most likely cause is a Zod schema mismatch between the page's read of `identity.homeSummary` and the about.md frontmatter from Task 2 — re-check the frontmatter field names.

- [ ] **Step 6: Verify rendered home HTML by greping the dist output**

Run:

```bash
grep -E "data-home-tagline|data-home-author-name|data-home-author-summary|aria-label=\"GitHub\"" dist/index.html | head -5
grep -E "data-home-tagline|data-home-author-name|data-home-author-summary|aria-label=\"GitHub\"" dist/en/index.html | head -5
```

Expected: both files emit the four hooks. The KO file shows `도전과 성취를 즐깁니다.` and `김상호 (Sam Kim)`; the EN file shows `I enjoy the climb and the summit.` and `Sam Kim (Sangho Kim)`. Neither file shows `data-home-categories`, `data-home-hero`, or labelled social spans like `<span>GitHub</span>`.

- [ ] **Step 7: Confirm `/about` still renders the full identity card unchanged**

Run:

```bash
grep -E "data-about-name|data-about-education|data-about-experience" dist/about/index.html | head -3
grep -E "data-about-name|data-about-education|data-about-experience" dist/en/about/index.html | head -3
```

Expected: both `/about` HTML files still emit `data-about-name`, `data-about-education`, `data-about-experience`. The KO `/about` shows `김상호 (Sam Kim)` as the `h1`; the EN one shows `Sam Kim (Sangho Kim)`.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/pages/index.astro src/pages/en/index.astro tests/home-page.test.mjs
git commit -m "$(cat <<'EOF'
feat: switch home pages to HomeIdentity

Both KO and EN home pages now lead with the new HomeIdentity card
(tagline h1 + name + short intro + icon socials) sourced from the
existing pages collection record. The Recent Posts section stays
on a single h2.

The page-level test asserts the new HomeIdentity stub gets the
tagline, name, summary, and socials; the previous AboutIdentity
reuse path is gone.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

---

### Task 5: Update spec docs to describe the new home identity

**Context:** Update the four ongoing spec docs (`spec-site-identity.md`, `spec-home-theme.md`, `spec-about.md`, `spec-roadmap.md`) so they describe the final state after this iteration. The design spec at `docs/superpowers/specs/2026-05-10-home-identity-refresh-design.md` stays as-is — it captures the decision; these ongoing specs document the current resulting state.

**Files:**
- Modify: `docs/spec-site-identity.md`
- Modify: `docs/spec-home-theme.md`
- Modify: `docs/spec-about.md`
- Modify: `docs/spec-roadmap.md`

- [ ] **Step 1: Update `docs/spec-site-identity.md` — Surfaces Carrying Author Identity (item 2)**

Find the bullet that currently describes the home page identity surface (item 2 under "Surfaces Carrying Author Identity"). Replace it with:

```markdown
  2. Home page introduction — the home page leads with a motto-led identity block rendered by `src/components/HomeIdentity.astro`: `tagline` as the `h1` (the author motto), the name as a smaller `<p>`, the short `homeSummary` paragraph, and an icon-only socials row. The identity data is read from the same `pages` collection record (`ko/about`, `en/about`) that powers `/about` so the home and `/about` cannot drift. The home does not show the photo, education, or experience — those stay on `/about`. The nickname intentionally does not appear in the motto — the domain wordmark in the header and the footer signature already carry it. See `docs/spec-home-theme.md`.
```

- [ ] **Step 2: Update `docs/spec-site-identity.md` — Guardrails**

Find the Guardrails section. Replace the existing two home-related guardrails (about identity card stops at socials, shared `pages` record) with:

```markdown
  - The home and `/about` read identity data from the same `pages` collection record (`ko/about`, `en/about`); do not duplicate the identity strings in another collection or hard-code them on the home page.
  - The motto lives at `identity.tagline` and renders only on the home. Do not introduce a separate slogan/byline surface.
  - The home identity stops at socials. Photo, education, and experience stay on `/about` only — that hierarchy is what keeps the home from drifting into resume-site / personal-landing-page energy.
  - Socials on the home render as icon-only links with `aria-label`; socials on `/about` render with visible text labels. `SocialIcon.astro` is the shared SVG source for both variants.
```

- [ ] **Step 3: Update `docs/spec-home-theme.md` — Home Page Structure**

Replace the entire `**Home Page Structure**:` block with:

```markdown
- **Home Page Structure**:
  - Korean home page: `src/pages/index.astro`
  - English home page: `src/pages/en/index.astro`
  - Each locale fetches recent posts from its matching content folder only.
  - The page should orient a reader gently and quickly, with the writing remaining more important than any introductory treatment.
  - Each home page contains, in order:
    - A motto-led identity block rendered by `src/components/HomeIdentity.astro`: `tagline` as `h1`, name as a styled `<p>` one step smaller, the short `homeSummary` paragraph, and an icon-only socials row. The identity data is read from the same `pages` collection record (`ko/about`, `en/about`) that powers `/about`. See `docs/spec-site-identity.md`.
    - A recent posts section showing the latest 3 to 5 posts under a single `h2` heading (`최근 글` / `Recent Posts`) with an inline "all posts" link aligned to the right.
  - The home page does not carry a Categories block. Category browsing lives on `/posts` and on the category pages themselves; the home stays focused on identity and the latest writing.
  - The home page does not show the photo. The photo is the `/about` page's signature; duplicating it on the home pulls the home toward "personal landing page" energy.
  - Reuse the same quiet, text-first list style as the archive page.
  - Recent-post titles on the home page should use the same shared assembled display-title helper as the archive and taxonomy lists.
```

- [ ] **Step 4: Update `docs/spec-about.md` — Page Role**

Replace the Page Role bullet that mentions the home/about identity sharing with:

```markdown
- **Page Role**:
  - `/about` is the canonical home of the full biographical record (name, photo, summary, socials, education, experience). The home page reuses the same `pages` collection record but projects only the motto, name, short `homeSummary`, and socials through `HomeIdentity.astro`; education, experience, the photo, and the longer `summary` stay on `/about` only.
  - The home and `/about` cannot drift because both read the same `pages` record.
  - It should feel like a quiet editorial about-page, not like a portfolio template or a LinkedIn export.
  - The home page, archive, and post detail remain the primary "quiet, text-first" surfaces.
```

Then in the Content Schema section, after the existing `identity.summary` description, insert two new bullets:

```markdown
  - `identity.tagline` (string, required): the author's motto, rendered as the home page `h1`. Editorial copy in the author's voice, not a brand slogan. Does not appear on `/about`.
  - `identity.homeSummary` (string, required): the short two-sentence intro shown on the home below the name. Distinct from `summary`, which stays the longer reflective paragraph on `/about`.
```

Update the `identity.name` bullet so the example matches the new format:

Find: `Use the same Sam (김상호) / Sam (Sangho Kim) form as the home hero eyebrow so identity reads consistently across surfaces.`

Replace with: `Use the public-facing name format (KO: 김상호 (Sam Kim), EN: Sam Kim (Sangho Kim)). The home and /about render the same value, so it changes once in the pages collection.`

- [ ] **Step 5: Update `docs/spec-roadmap.md` — Current State**

Replace the line that currently begins `- The home page now leads with the same identity card as /about` (added in this branch) with:

```markdown
- The home page now leads with a motto-led `HomeIdentity` card (tagline `h1` + name + short `homeSummary` + icon-only socials), rendered by `src/components/HomeIdentity.astro` and sourced from the existing `pages` collection record. The full identity card (photo, longer summary, education, experience) stays on `/about` only. Category browsing lives on `/posts` and on category pages.
```

Replace the line that currently begins `- Home introduction refresh landed:` (added in this branch) with:

```markdown
- Home identity refresh landed: the home now uses a dedicated `HomeIdentity.astro` component leading with the author motto (`도전과 성취를 즐깁니다.` / `I enjoy the climb and the summit.`) as the `h1`, followed by the name, a short two-sentence `homeSummary`, and an icon-only socials row. The earlier eyebrow + tagline hero and the dedicated Categories block are both gone; the page reads as identity card → recent posts. The Recent Posts heading stays as a single `h2`. See `docs/superpowers/specs/2026-05-10-home-identity-refresh-design.md`, `docs/spec-home-theme.md`, and `docs/spec-site-identity.md`.
```

In the `### 2. Identity` section under "Current Status", replace the bullet that begins `- The home page now leads` (the version added in this branch) with the same wording as the first replacement above (the Current State copy), so the two sections stay consistent.

In the same section, replace the bullet about the home hero finalisation with:

```markdown
  - Home identity is finalised at: motto `h1` (from `identity.tagline`) + name (from `identity.name`) + short intro (from `identity.homeSummary`) + icon-only socials. The home no longer shows the photo or any resume-flavored content; those stay scoped to `/about`.
```

- [ ] **Step 6: Build to confirm spec docs do not break anything**

Run: `npm run build 2>&1 | tail -5`

Expected: build still succeeds; the spec docs are markdown files outside the build pipeline, but running the build is the cheapest way to confirm no docs path was misnamed in any code change. The output should match Task 4's "X page(s) built" line exactly.

- [ ] **Step 7: Commit**

Run:

```bash
git add docs/spec-site-identity.md docs/spec-home-theme.md docs/spec-about.md docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: update specs for the new HomeIdentity home page

Aligns spec-site-identity, spec-home-theme, spec-about, and
spec-roadmap with the final home design: HomeIdentity card with
tagline h1 + name + homeSummary + icon-only socials, no photo,
no education or experience on the home. The pages.identity
schema gains tagline and homeSummary as required fields.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds.

---

### Task 6: Final verification

**Context:** Run the full build, sanity-check the rendered HTML for both locales, and confirm `/about` is unchanged. The pre-existing `npm test` infra is broken at the Astro container level on this branch (documented in earlier sessions); the source-of-truth verification is the build + dist HTML grep, plus a single-file run of the new component test.

**Files:** none (read-only verification)

- [ ] **Step 1: Run a clean build**

Run: `rm -rf dist && npm run build 2>&1 | tail -5`

Expected: "X page(s) built" with no errors. X should match the count from earlier builds (around 65).

- [ ] **Step 2: Spot-check the KO home rendered HTML**

Run:

```bash
grep -oE "data-home-tagline|data-home-author-name|data-home-author-summary|data-home-socials|aria-label=\"(GitHub|연락처와 프로필)\"" dist/index.html | sort -u
```

Expected output (in any order, no extras):

```
aria-label="GitHub"
aria-label="연락처와 프로필"
data-home-author-name
data-home-author-summary
data-home-socials
data-home-tagline
```

- [ ] **Step 3: Spot-check the EN home rendered HTML**

Run:

```bash
grep -oE "data-home-tagline|data-home-author-name|data-home-author-summary|data-home-socials|aria-label=\"(GitHub|Contact and profiles)\"" dist/en/index.html | sort -u
```

Expected output:

```
aria-label="Contact and profiles"
aria-label="GitHub"
data-home-author-name
data-home-author-summary
data-home-socials
data-home-tagline
```

- [ ] **Step 4: Spot-check `/about` is unchanged in shape**

Run:

```bash
grep -oE "data-about-name|data-about-summary|data-about-education|data-about-experience|<span>GitHub</span>" dist/about/index.html | sort -u
```

Expected output:

```
<span>GitHub</span>
data-about-education
data-about-experience
data-about-name
data-about-summary
```

The presence of the visible `<span>GitHub</span>` confirms `/about` keeps the labeled-social variant.

- [ ] **Step 5: Run only the new component test**

Run: `node --test tests/home-identity.test.mjs 2>&1 | tail -10`

Expected: `# pass 8`, `# fail 0`. (Other tests in the suite may still fail under the pre-existing container-resolution issue; that is independent of this change.)

- [ ] **Step 6: Inspect the final commit graph**

Run: `git log --oneline -8`

Expected, top to bottom:

```
<hash> docs: update specs for the new HomeIdentity home page
<hash> feat: switch home pages to HomeIdentity
<hash> feat: add HomeIdentity component for the home page
<hash> feat: extend pages.identity with tagline + homeSummary
<hash> refactor: drop home Categories block
<hash> docs: add home identity refresh design spec
<hash> docs: align design spec wide-figure math with the SSOT
<hash> docs: fix TOC overhang math in spec-post-detail wide-figure note
```

The first six commits above are the ones added on this branch.

- [ ] **Step 7: Confirm working tree is clean**

Run: `git status`

Expected: `working tree clean`. No uncommitted modifications, no untracked files.

---

## Self-Review

**Spec coverage check:**
- Page Structure / Home — Task 4 (HomeIdentity wired in, Recent Posts as single h2) ✓
- Page Structure / About — left structurally unchanged; Task 2 updates name + summary copy, Task 5 documents the schema additions ✓
- Components / HomeIdentity — Task 3 ✓
- Components / AboutIdentity — Task 5 docs confirm no functional change ✓
- Data Schema — Task 2 (schema + frontmatter together) ✓
- Content Changes (KO + EN) — Task 2 ✓
- Typography (existing tokens only) — Task 3 component uses the documented tokens ✓
- Accessibility (aria-label on icon-only socials, aria-hidden on SVG, ul aria-label) — Task 3 component + tests ✓
- Editorial Guardrails — Task 5 spec docs ✓
- Editorial Pairing Across Surfaces — Task 2 frontmatter copy realises this; Task 5 spec doc captures the rationale ✓
- Tests — Task 3 (component) + Task 4 (page-level) ✓
- Migration Notes (Phase 1 absorption) — Task 1 ✓
- Spec Documents to Update — Task 5 covers all four ✓
- What to Avoid — Task 5 spec docs encode each item ✓

**Placeholder scan:** none — every task contains the actual file content, exact commands, and concrete expected outputs.

**Type / name consistency:**
- `HomeIdentity` props: `lang`, `tagline`, `name`, `summary`, `socials` — same in component, in tests, and in both home pages.
- Frontmatter field names: `tagline`, `homeSummary`, `summary`, `name`, `photo`, `socials`, `education`, `experience` — same in schema (Task 2 Step 2), in KO frontmatter (Task 2 Step 4), in EN frontmatter (Task 2 Step 5), and in page reads (Task 4 Steps 3 & 4).
- Test data hooks: `data-home-tagline`, `data-home-author-name`, `data-home-author-summary`, `data-home-socials`, `data-home-identity-stub`, `data-home-recent-posts` — used consistently in component, component tests, and page tests.
