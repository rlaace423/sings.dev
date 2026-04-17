# /about Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/about` into a lightweight resume-flavored identity page with a small photo, a short summary, a row of social-link icons, and a typography-driven work history — serving both the blog's identity story and a concrete job-search surface — without drifting the rest of the site toward a portfolio/portal look.

**Architecture:** Extend the existing `pages` content collection schema with an optional `identity` object so the about entry carries structured frontmatter (summary, photo, socials, experience) alongside its markdown body. Render a new `AboutIdentity.astro` block at the top of `/about` using a compact, typography-first layout, and ship a small `SocialIcon.astro` component with inline SVGs for the four platforms. Both KO and EN about pages consume the same components in parallel. A dummy placeholder PNG is shipped under `public/` and swapped later by the author.

**Tech Stack:** Astro content collections (Zod schema), Astro components with Tailwind utility classes, inline SVGs, `sharp` (already a transitive Astro dep) for generating the placeholder PNG, `node --test` with `@astrojs/compiler` + `experimental_AstroContainer` for component tests.

---

## File Structure

### Create

- `public/avatar-placeholder.png` — 512×512 stone-200 (`#e7e5e4`) placeholder avatar.
- `src/components/SocialIcon.astro` — inline-SVG icon renderer. Takes `type: "github" | "email" | "linkedin" | "instagram"` plus optional `class`. Returns a single `<svg>` with an `aria-hidden` attribute; accessible labeling is the responsibility of the wrapping `<a>` link.
- `src/components/AboutIdentity.astro` — structured identity block rendering photo + summary, a `<ul>` of social links, and an ordered experience list. Props: `lang`, `summary`, `photo { src, alt }`, `socials[]`, `experience[]`.
- `tests/social-icon.test.mjs` — verifies SVG content, stable hooks, and per-type shape for all four icon types.
- `tests/about-identity.test.mjs` — verifies AboutIdentity rendering and that both `/about` pages wire the new structure through the page components.
- `docs/spec-about.md` — SSOT describing the page's purpose (job-search surface within a quiet blog), the schema, the structural order, and the editorial guardrails that keep it aligned with `spec-editorial-philosophy.md`.

### Modify

- `src/content/config.ts` — extend `pages` schema with optional `identity` (zod object).
- `src/content/pages/ko/about.md` — add identity frontmatter with placeholder experience; refresh body copy to fit after the experience list.
- `src/content/pages/en/about.md` — mirror the KO frontmatter changes in English.
- `src/pages/about.astro` — import and render `AboutIdentity` above the existing `<Content />` block.
- `src/pages/en/about.astro` — same for the EN locale.
- `docs/spec-roadmap.md` — update the Identity priority status to reflect `/about` as the first landed step.

---

## Tasks

### Task 1: Extend the `pages` collection schema with an optional `identity` object

**Files:**
- Modify: `src/content/config.ts`

- [ ] **Step 1: Update the `pages` schema**

Replace the `pages` collection definition with the version below. The `identity` object is fully optional so the existing `ko/about.md` / `en/about.md` continue to validate while the new frontmatter is being authored.

```ts
const pages = defineCollection({
	loader: glob({ base: "./src/content/pages", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		identity: z
			.object({
				summary: z.string(),
				photo: z.object({
					src: z.string(),
					alt: z.string(),
				}),
				socials: z
					.array(
						z.object({
							type: z.enum(["github", "email", "linkedin", "instagram"]),
							href: z.string(),
							label: z.string().optional(),
						}),
					)
					.default([]),
				experience: z
					.array(
						z.object({
							company: z.string(),
							role: z.string(),
							start: z.string(),
							end: z.string(),
							description: z.string(),
						}),
					)
					.default([]),
			})
			.optional(),
	}),
});
```

- [ ] **Step 2: Verify content still type-checks**

Run: `npm run astro -- check`
Expected: no new errors. The two existing `about.md` files parse because `identity` is optional.

- [ ] **Step 3: Commit**

```bash
git add src/content/config.ts
git commit -m "$(cat <<'EOF'
feat: add optional identity schema to pages collection

Adds an optional identity object to the pages collection so about-style
entries can carry structured frontmatter (summary, photo, socials,
experience) alongside the existing markdown body, without affecting any
other page.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Ship the placeholder avatar PNG

**Files:**
- Create: `public/avatar-placeholder.png`

- [ ] **Step 1: Generate the placeholder PNG via sharp**

Run (from repo root):

```bash
node --input-type=module -e "import sharp from 'sharp'; await sharp({create:{width:512,height:512,channels:3,background:{r:231,g:229,b:228}}}).png().toFile('public/avatar-placeholder.png');"
```

Expected: no output; file created.

- [ ] **Step 2: Verify file exists and is a valid PNG**

Run: `file public/avatar-placeholder.png`
Expected: `public/avatar-placeholder.png: PNG image data, 512 x 512, 8-bit/color RGB, non-interlaced`

- [ ] **Step 3: Commit**

```bash
git add public/avatar-placeholder.png
git commit -m "$(cat <<'EOF'
chore: add placeholder avatar png for /about

Ships a neutral stone-toned 512x512 placeholder avatar under public/ so
the about page can render a real <img> until a real portrait replaces
the file.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Build `SocialIcon.astro` with test-first inline SVGs

**Files:**
- Create: `tests/social-icon.test.mjs`
- Create: `src/components/SocialIcon.astro`

- [ ] **Step 1: Write the failing test**

```js
// tests/social-icon.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoIconUrl = new URL("../src/components/SocialIcon.astro", import.meta.url);
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderIcon(props) {
	const source = await readFile(repoIconUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoIconUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "social-icon-"));
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

test("SocialIcon renders an svg with a data-social-icon hook for every supported type", async () => {
	for (const type of ["github", "email", "linkedin", "instagram"]) {
		const rendered = await renderIcon({ type });
		assert.match(rendered, new RegExp(`data-social-icon="${type}"`), `missing hook for ${type}`);
		assert.match(rendered, /<svg[^>]*aria-hidden="true"/, `svg should be decorative for ${type}`);
	}
});

test("SocialIcon github variant draws the octocat silhouette path", async () => {
	const rendered = await renderIcon({ type: "github" });
	assert.match(rendered, /<path[^>]*d="M12 \.5/);
});

test("SocialIcon email variant draws an envelope", async () => {
	const rendered = await renderIcon({ type: "email" });
	assert.match(rendered, /<rect[^>]*x="3"[^>]*y="5"/);
	assert.match(rendered, /<path[^>]*d="m3 7 9 6 9-6"/);
});

test("SocialIcon linkedin variant draws the in-mark", async () => {
	const rendered = await renderIcon({ type: "linkedin" });
	assert.match(rendered, /<rect[^>]*x="2"[^>]*y="9"[^>]*width="4"/);
	assert.match(rendered, /<path[^>]*d="M9 9h3\.8/);
});

test("SocialIcon instagram variant draws the rounded-square camera", async () => {
	const rendered = await renderIcon({ type: "instagram" });
	assert.match(rendered, /<rect[^>]*x="3"[^>]*y="3"[^>]*rx="5"/);
	assert.match(rendered, /<circle[^>]*cx="12"[^>]*cy="12"[^>]*r="4"/);
	assert.match(rendered, /<circle[^>]*cx="17\.5"[^>]*cy="6\.5"[^>]*r="1"/);
});

test("SocialIcon falls through the optional class prop", async () => {
	const rendered = await renderIcon({ type: "github", class: "h-5 w-5" });
	assert.match(rendered, /class="[^"]*h-5 w-5[^"]*"/);
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- tests/social-icon.test.mjs`
Expected: failing tests with `Cannot find module` (component missing) or assertion errors.

- [ ] **Step 3: Implement `SocialIcon.astro`**

Create `src/components/SocialIcon.astro`:

```astro
---
export type SocialType = "github" | "email" | "linkedin" | "instagram";

interface Props {
	type: SocialType;
	class?: string;
}

const { type, class: className = "h-4 w-4" } = Astro.props;
---

{
	type === "github" && (
		<svg
			data-social-icon="github"
			class={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a10.98 10.98 0 0 1 5.78 0c2.2-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.07.78 2.17v3.21c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
		</svg>
	)
}

{
	type === "email" && (
		<svg
			data-social-icon="email"
			class={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<rect x="3" y="5" width="18" height="14" rx="2" />
			<path d="m3 7 9 6 9-6" />
		</svg>
	)
}

{
	type === "linkedin" && (
		<svg
			data-social-icon="linkedin"
			class={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<rect x="2" y="9" width="4" height="12" rx="0.5" />
			<circle cx="4" cy="4.5" r="2" />
			<path d="M9 9h3.8v1.7h.06c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.77 2.53 4.77 5.83V21h-4v-5.6c0-1.34-.03-3.07-1.98-3.07-1.98 0-2.28 1.46-2.28 2.97V21H9Z" />
		</svg>
	)
}

{
	type === "instagram" && (
		<svg
			data-social-icon="instagram"
			class={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<rect x="3" y="3" width="18" height="18" rx="5" />
			<circle cx="12" cy="12" r="4" />
			<circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
		</svg>
	)
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- tests/social-icon.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/social-icon.test.mjs src/components/SocialIcon.astro
git commit -m "$(cat <<'EOF'
feat: add SocialIcon component with inline svgs

Introduces a small SocialIcon component with inline svgs for github,
email, linkedin, and instagram. Icons are decorative (aria-hidden) and
accept a class prop so consumers can size them inline, keeping the
project free of any icon-font or svg-library dependency.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Build `AboutIdentity.astro` with test-first rendering

**Files:**
- Create: `tests/about-identity.test.mjs`
- Create: `src/components/AboutIdentity.astro`

- [ ] **Step 1: Write the failing tests for the component**

```js
// tests/about-identity.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoAboutIdentityUrl = new URL(
	"../src/components/AboutIdentity.astro",
	import.meta.url,
);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderAboutIdentity(props) {
	const source = await readFile(repoAboutIdentityUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoAboutIdentityUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "about-identity-"));
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
	summary: "백엔드 구조와 MPC 시스템을 씁니다.",
	photo: { src: "/avatar-placeholder.png", alt: "Sam의 사진" },
	socials: [
		{ type: "github", href: "https://github.com/example", label: "GitHub" },
		{ type: "email", href: "mailto:hello@example.com", label: "Email" },
		{ type: "linkedin", href: "https://linkedin.com/in/example", label: "LinkedIn" },
		{ type: "instagram", href: "https://instagram.com/example", label: "Instagram" },
	],
	experience: [
		{
			company: "Example Wallet",
			role: "Senior Backend Engineer",
			start: "2023",
			end: "현재",
			description: "TSS MPC 인프라를 설계하고 운영했습니다.",
		},
		{
			company: "Example Fintech",
			role: "Backend Engineer",
			start: "2020",
			end: "2023",
			description: "결제 라우팅을 다시 그려 정산 오류를 줄였습니다.",
		},
	],
});

test("AboutIdentity renders the photo with the given src and alt", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	assert.match(rendered, /<img[^>]*src="\/avatar-placeholder.png"[^>]*>/);
	assert.match(rendered, /<img[^>]*alt="Sam의 사진"[^>]*>/);
});

test("AboutIdentity renders the summary inside a dedicated hook", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	assert.match(
		rendered,
		/<p[^>]*data-about-summary[^>]*>[\s\S]*백엔드 구조와 MPC 시스템을 씁니다\./,
	);
});

test("AboutIdentity renders one link per social in order with stubbed icons", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	const order = ["github", "email", "linkedin", "instagram"];
	const hookIndexes = order.map((type) =>
		rendered.indexOf(`data-social-icon-stub="${type}"`),
	);
	hookIndexes.forEach((index, i) => {
		assert.ok(index >= 0, `missing stub for ${order[i]}`);
	});
	for (let i = 1; i < hookIndexes.length; i++) {
		assert.ok(
			hookIndexes[i - 1] < hookIndexes[i],
			`social order broken between ${order[i - 1]} and ${order[i]}`,
		);
	}
	assert.match(rendered, /<a href="https:\/\/github\.com\/example"[^>]*>/);
	assert.match(rendered, /<a href="mailto:hello@example.com"[^>]*>/);
	assert.match(rendered, /<a href="https:\/\/linkedin\.com\/in\/example"[^>]*>/);
	assert.match(rendered, /<a href="https:\/\/instagram\.com\/example"[^>]*>/);
});

test("AboutIdentity omits the socials list entirely when the array is empty", async () => {
	const rendered = await renderAboutIdentity({ ...baseProps(), socials: [] });
	assert.doesNotMatch(rendered, /data-about-socials/);
});

test("AboutIdentity renders an ordered experience list with preserved order and fields", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	assert.match(rendered, /<ol[^>]*data-about-experience[^>]*>/);
	const firstCompany = rendered.indexOf("Example Wallet");
	const secondCompany = rendered.indexOf("Example Fintech");
	assert.ok(firstCompany >= 0 && secondCompany > firstCompany, "experience order broken");
	assert.match(rendered, /2023[\s\S]*현재/);
	assert.match(rendered, /Senior Backend Engineer/);
	assert.match(rendered, /결제 라우팅을 다시 그려 정산 오류를 줄였습니다\./);
});

test("AboutIdentity omits the experience section when no entries are given", async () => {
	const rendered = await renderAboutIdentity({ ...baseProps(), experience: [] });
	assert.doesNotMatch(rendered, /data-about-experience/);
});

test("AboutIdentity uses the Korean experience heading for ko and the English one for en", async () => {
	const ko = await renderAboutIdentity({ ...baseProps(), lang: "ko" });
	const en = await renderAboutIdentity({ ...baseProps(), lang: "en" });
	assert.match(ko, /경력/);
	assert.match(en, /Experience/);
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- tests/about-identity.test.mjs`
Expected: failing tests — component does not exist.

- [ ] **Step 3: Implement `AboutIdentity.astro`**

Create `src/components/AboutIdentity.astro`:

```astro
---
import SocialIcon, { type SocialType } from "./SocialIcon.astro";
import { defaultLocale, type Locale, isLocale } from "../i18n/ui";

interface Photo {
	src: string;
	alt: string;
}

interface SocialLink {
	type: SocialType;
	href: string;
	label?: string;
}

interface ExperienceEntry {
	company: string;
	role: string;
	start: string;
	end: string;
	description: string;
}

interface Props {
	lang?: Locale;
	summary: string;
	photo: Photo;
	socials?: SocialLink[];
	experience?: ExperienceEntry[];
}

const {
	lang: langProp,
	summary,
	photo,
	socials = [],
	experience = [],
} = Astro.props;

const lang = isLocale(langProp) ? langProp : defaultLocale;
const experienceHeading = lang === "ko" ? "경력" : "Experience";
const socialsLabel = lang === "ko" ? "연락처와 프로필" : "Contact and profiles";
---

<section class="space-y-12">
	<div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
		<img
			src={photo.src}
			alt={photo.alt}
			width="96"
			height="96"
			class="h-24 w-24 shrink-0 rounded-full bg-stone-200 object-cover ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-800"
		/>
		<div class="space-y-4">
			<p
				data-about-summary
				class="max-w-2xl text-lg leading-8 text-stone-700 dark:text-stone-200"
			>
				{summary}
			</p>
		</div>
	</div>

	{
		socials.length > 0 && (
			<ul
				data-about-socials
				aria-label={socialsLabel}
				class="flex flex-wrap gap-x-5 gap-y-3 text-sm text-stone-600 dark:text-stone-300"
			>
				{socials.map((item) => (
					<li>
						<a
							href={item.href}
							class="inline-flex items-center gap-2 transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950"
						>
							<SocialIcon type={item.type} class="h-4 w-4" />
							<span>{item.label ?? item.type}</span>
						</a>
					</li>
				))}
			</ul>
		)
	}

	{
		experience.length > 0 && (
			<section class="space-y-6">
				<h2 class="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
					{experienceHeading}
				</h2>
				<ol
					data-about-experience
					class="divide-y divide-stone-200 border-t border-stone-200 dark:divide-stone-800 dark:border-stone-800"
				>
					{experience.map((entry) => (
						<li class="grid gap-4 py-6 sm:grid-cols-[minmax(7rem,auto)_1fr] sm:gap-8">
							<p class="text-sm tabular-nums text-stone-500 dark:text-stone-500">
								<span>{entry.start}</span>
								<span aria-hidden="true"> — </span>
								<span>{entry.end}</span>
							</p>
							<div class="space-y-1">
								<p class="text-base font-semibold text-stone-950 dark:text-stone-50">
									{entry.company}
								</p>
								<p class="text-sm text-stone-600 dark:text-stone-300">
									{entry.role}
								</p>
								<p class="mt-3 max-w-2xl leading-7 text-stone-600 dark:text-stone-300">
									{entry.description}
								</p>
							</div>
						</li>
					))}
				</ol>
			</section>
		)
	}
</section>
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- tests/about-identity.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/about-identity.test.mjs src/components/AboutIdentity.astro
git commit -m "$(cat <<'EOF'
feat: add AboutIdentity component for /about

Introduces a typography-first identity block used at the top of /about:
small photo + short summary, a quiet row of social links, and a
grid-based experience list. Omits the socials and experience sections
when their arrays are empty so the component stays usable for
non-about pages that may opt in to only part of the schema later.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Fill in the KO `/about` content with identity frontmatter

**Files:**
- Modify: `src/content/pages/ko/about.md`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/content/pages/ko/about.md` with:

```markdown
---
title: "소개"
description: "이 사이트를 쓰는 사람과 해 온 일을 소개합니다."
identity:
  summary: "백엔드 아키텍처, TSS MPC 개발, 인프라 라우팅을 주로 다루는 엔지니어입니다. 오래 유지할 수 있는 시스템의 구조를 찾고, 그 과정에서 배운 것을 이 블로그에 정리합니다."
  photo:
    src: "/avatar-placeholder.png"
    alt: "Sam의 프로필 사진 (임시 이미지)"
  socials:
    - type: github
      href: "https://github.com/example"
      label: "GitHub"
    - type: email
      href: "mailto:sam@walletone.io"
      label: "Email"
    - type: linkedin
      href: "https://www.linkedin.com/in/example"
      label: "LinkedIn"
    - type: instagram
      href: "https://www.instagram.com/example"
      label: "Instagram"
  experience:
    - company: "현재 회사 (플레이스홀더)"
      role: "시니어 백엔드 엔지니어"
      start: "2023"
      end: "현재"
      description: "TSS MPC 인프라 설계와 서비스 경계 재정의를 이끌며, 운영 중에도 설명 가능한 백엔드 구조를 만들어 왔습니다."
    - company: "이전 회사 (플레이스홀더)"
      role: "백엔드 엔지니어"
      start: "2020"
      end: "2023"
      description: "결제 라우팅 구조를 다시 설계해 정산 오류를 줄이고, 운영자에게 명확한 감사 경로를 제공했습니다."
    - company: "첫 회사 (플레이스홀더)"
      role: "소프트웨어 엔지니어"
      start: "2018"
      end: "2020"
      description: "작은 제품 팀에서 내부 API와 온콜 도구를 만들며 웹과 모바일 양쪽에서 기반 작업을 맡았습니다."
---

## 무엇을 쓰는가

- 백엔드 아키텍처와 서비스 경계 설계
- TSS MPC 개발과 운영 경험
- 인프라 라우팅, 관찰 가능성, 배포 판단

## 왜 쓰는가

좋은 기술 글은 시스템을 더 멋지게 보이게 하기보다, 더 빨리 이해하고 더 자신 있게 고치게 만들어야 한다고 생각합니다. 이 블로그는 그 관점에서 해 온 일과 배운 것을 조용히 정리해 둔 공간입니다.
```

- [ ] **Step 2: Commit**

```bash
git add src/content/pages/ko/about.md
git commit -m "$(cat <<'EOF'
feat: populate ko /about with placeholder identity frontmatter

Adds structured summary, photo, socials, and placeholder experience
entries to the Korean about page so the new AboutIdentity component has
concrete content to render. The placeholder company names make it
obvious which fields still need real values.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Fill in the EN `/about` content with identity frontmatter

**Files:**
- Modify: `src/content/pages/en/about.md`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/content/pages/en/about.md` with:

```markdown
---
title: "About"
description: "A short introduction to the person behind this blog and the work they've done."
identity:
  summary: "Backend engineer working on backend architecture, TSS MPC systems, and infrastructure routing. I care about structures teams can keep for a long time, and I write down what I learn along the way on this blog."
  photo:
    src: "/avatar-placeholder.png"
    alt: "Placeholder portrait of Sam"
  socials:
    - type: github
      href: "https://github.com/example"
      label: "GitHub"
    - type: email
      href: "mailto:sam@walletone.io"
      label: "Email"
    - type: linkedin
      href: "https://www.linkedin.com/in/example"
      label: "LinkedIn"
    - type: instagram
      href: "https://www.instagram.com/example"
      label: "Instagram"
  experience:
    - company: "Current Company (placeholder)"
      role: "Senior Backend Engineer"
      start: "2023"
      end: "Present"
      description: "Leading TSS MPC infrastructure work and service-boundary redesigns, with a focus on backends that remain explainable while they are being operated."
    - company: "Previous Company (placeholder)"
      role: "Backend Engineer"
      start: "2020"
      end: "2023"
      description: "Rebuilt a payment routing layer to reduce settlement errors and gave operators a clearer audit trail across environments."
    - company: "First Company (placeholder)"
      role: "Software Engineer"
      start: "2018"
      end: "2020"
      description: "Built internal APIs and on-call tooling for a small product team working across web and mobile."
---

## What I write about

- Backend architecture and service boundaries
- TSS MPC development and operation
- Infrastructure routing, observability, and deployment judgement

## Why I write

Good technical writing shouldn't make systems look smarter — it should help people understand them faster and fix them with more confidence. This blog is a quiet place to keep what I learn from that angle.
```

- [ ] **Step 2: Commit**

```bash
git add src/content/pages/en/about.md
git commit -m "$(cat <<'EOF'
feat: populate en /about with placeholder identity frontmatter

Mirrors the Korean identity frontmatter on the English about page with
the same placeholder experience structure so both locales render a
working /about through the new AboutIdentity component.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Wire `AboutIdentity` into both `/about` pages

**Files:**
- Modify: `src/pages/about.astro`
- Modify: `src/pages/en/about.astro`
- Modify: `tests/about-identity.test.mjs` (add page-level tests)

- [ ] **Step 1: Add page-level failing tests**

Extend `tests/about-identity.test.mjs`:

1. At the top of the file, merge `mkdir` and `dirname` into the existing `node:fs/promises` and `node:path` imports so the new helper can use them:
   - `node:fs/promises` imports should become: `mkdir, mkdtemp, readFile, rm, writeFile`
   - `node:path` imports should become: `dirname, join`
2. At the end of the file, append the helper and the three new tests below.

```js
async function renderAboutPage(sourceUrl, pageEntry) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "about-page-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const contentStubPath = join(tempDir, "astro-content-stub.ts");
	const isEnglishPage = sourceUrl.pathname.includes("/src/pages/en/");
	const pageDirectory = isEnglishPage
		? join(tempDir, "src", "pages", "en")
		: join(tempDir, "src", "pages");
	const pagePath = join(pageDirectory, "page.ts");
	const layoutStubPath = join(tempDir, "src", "layouts", "Layout.ts");
	const aboutIdentityStubPath = join(tempDir, "src", "components", "AboutIdentity.ts");
	const contentComponentSrc = [
		"---",
		"---",
		"<div data-content />",
		"",
	].join("\n");

	try {
		await mkdir(dirname(layoutStubPath), { recursive: true });
		await mkdir(dirname(aboutIdentityStubPath), { recursive: true });
		await mkdir(pageDirectory, { recursive: true });
		await writeFile(
			runtimeStubPath,
			[
				`export * from ${JSON.stringify(astroRuntimeUrl)};`,
				"export const createMetadata = () => ({})",
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

		const aboutIdentityStubCompiled = await transform(
			[
				"---",
				"const { lang = 'ko', summary = '', photo = { src: '', alt: '' }, socials = [], experience = [] } = Astro.props;",
				"---",
				'<section',
				'  data-about-identity-stub',
				'  data-lang={lang}',
				'  data-summary={summary}',
				'  data-photo-src={photo.src}',
				'  data-photo-alt={photo.alt}',
				'  data-socials={socials.map((s) => `${s.type}:${s.href}:${s.label ?? ""}`).join("|")}',
				'  data-experience={experience.map((e) => `${e.start}-${e.end}/${e.company}/${e.role}/${e.description}`).join("|")}',
				"/>",
				"",
			].join("\n"),
			{
				filename: join(tempDir, "AboutIdentityStub.astro"),
				internalURL: "astro/runtime/server/index.js",
			},
		);
		await writeFile(
			aboutIdentityStubPath,
			aboutIdentityStubCompiled.code.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			),
		);

		const contentComponentCompiled = await transform(contentComponentSrc, {
			filename: join(tempDir, "ContentStub.astro"),
			internalURL: "astro/runtime/server/index.js",
		});
		const contentComponentPath = join(tempDir, "ContentStub.ts");
		await writeFile(
			contentComponentPath,
			contentComponentCompiled.code.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			),
		);

		await writeFile(
			contentStubPath,
			[
				`import Content from ${JSON.stringify(pathToFileURL(contentComponentPath).href)};`,
				`const entries = JSON.parse(${JSON.stringify(JSON.stringify([pageEntry]))});`,
				"export const getCollection = async (_name, filter) =>",
				"  entries.filter((entry) => (filter ? filter(entry) : true));",
				"export const render = async () => ({ Content, headings: [] });",
				"",
			].join("\n"),
		);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		rewritten = rewritten.replaceAll(
			"astro:content",
			pathToFileURL(contentStubPath).href,
		);

		for (const [find, replaceWith] of [
			["../layouts/Layout.astro", "../layouts/Layout.ts"],
			["../../layouts/Layout.astro", "../../layouts/Layout.ts"],
			["../components/AboutIdentity.astro", "../components/AboutIdentity.ts"],
			["../../components/AboutIdentity.astro", "../../components/AboutIdentity.ts"],
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

const pageEntry = (lang) => ({
	id: `${lang}/about`,
	slug: "about",
	body: "",
	collection: "pages",
	data: {
		title: lang === "ko" ? "소개" : "About",
		description: "…",
		identity: {
			summary: "summary-" + lang,
			photo: { src: "/avatar-placeholder.png", alt: "alt-" + lang },
			socials: [
				{ type: "github", href: "https://github.com/x", label: "GitHub" },
				{ type: "email", href: "mailto:x@x", label: "Email" },
				{ type: "linkedin", href: "https://linkedin.com/in/x", label: "LinkedIn" },
				{ type: "instagram", href: "https://instagram.com/x", label: "Instagram" },
			],
			experience: [
				{
					company: "Co A",
					role: "Role A",
					start: "2023",
					end: lang === "ko" ? "현재" : "Present",
					description: "desc-a",
				},
				{
					company: "Co B",
					role: "Role B",
					start: "2020",
					end: "2023",
					description: "desc-b",
				},
			],
		},
	},
});

test("ko /about page passes identity frontmatter into AboutIdentity before the content body", async () => {
	const rendered = await renderAboutPage(
		new URL("../src/pages/about.astro", import.meta.url),
		pageEntry("ko"),
	);

	assert.match(rendered, /data-layout-lang="ko"/);
	assert.match(rendered, /data-about-identity-stub/);
	assert.match(rendered, /data-lang="ko"/);
	assert.match(rendered, /data-summary="summary-ko"/);
	assert.match(rendered, /data-photo-src="\/avatar-placeholder\.png"/);
	assert.match(
		rendered,
		/data-socials="github:https:\/\/github\.com\/x:GitHub\|email:mailto:x@x:Email\|linkedin:https:\/\/linkedin\.com\/in\/x:LinkedIn\|instagram:https:\/\/instagram\.com\/x:Instagram"/,
	);
	assert.match(rendered, /data-experience="2023-현재\/Co A\/Role A\/desc-a\|2020-2023\/Co B\/Role B\/desc-b"/);
	assert.ok(
		rendered.indexOf("data-about-identity-stub") < rendered.indexOf("data-content"),
		"AboutIdentity should render before the markdown body",
	);
});

test("en /about page passes identity frontmatter into AboutIdentity before the content body", async () => {
	const rendered = await renderAboutPage(
		new URL("../src/pages/en/about.astro", import.meta.url),
		pageEntry("en"),
	);

	assert.match(rendered, /data-layout-lang="en"/);
	assert.match(rendered, /data-lang="en"/);
	assert.match(rendered, /data-summary="summary-en"/);
	assert.match(rendered, /data-experience="2023-Present\/Co A\/Role A\/desc-a\|2020-2023\/Co B\/Role B\/desc-b"/);
	assert.ok(
		rendered.indexOf("data-about-identity-stub") < rendered.indexOf("data-content"),
		"AboutIdentity should render before the markdown body",
	);
});

test("ko /about page renders nothing from AboutIdentity when identity is absent", async () => {
	const bareEntry = {
		...pageEntry("ko"),
		data: { title: "소개", description: "…" },
	};
	const rendered = await renderAboutPage(
		new URL("../src/pages/about.astro", import.meta.url),
		bareEntry,
	);

	assert.doesNotMatch(rendered, /data-about-identity-stub/);
	assert.match(rendered, /data-content/);
});
```

- [ ] **Step 2: Run tests, verify failures for the three new page-level tests**

Run: `npm test -- tests/about-identity.test.mjs`
Expected: the three new tests fail (the existing `/about` pages don't pass any identity through yet).

- [ ] **Step 3: Update `src/pages/about.astro`**

Replace the whole file with:

```astro
---
import { getCollection, render } from "astro:content";
import AboutIdentity from "../components/AboutIdentity.astro";
import Layout from "../layouts/Layout.astro";

const [page] = await getCollection("pages", ({ id }) => id === "ko/about");

if (!page) {
	throw new Error("Missing ko/about page content.");
}

const { Content } = await render(page);
const identity = page.data.identity;
---

<Layout title={`${page.data.title} | sings.dev`} description={page.data.description} lang="ko">
	<article class="space-y-16">
		{
			identity && (
				<AboutIdentity
					lang="ko"
					summary={identity.summary}
					photo={identity.photo}
					socials={identity.socials}
					experience={identity.experience}
				/>
			)
		}

		<section
			class="prose prose-stone max-w-none dark:prose-invert dark:prose-a:text-stone-100 dark:prose-a:decoration-stone-500 dark:prose-blockquote:border-stone-700 dark:prose-blockquote:text-stone-300 dark:prose-code:text-stone-100 dark:prose-pre:border-stone-700 dark:prose-pre:bg-stone-900"
		>
			<Content />
		</section>
	</article>
</Layout>
```

- [ ] **Step 4: Update `src/pages/en/about.astro`**

Replace the whole file with:

```astro
---
import { getCollection, render } from "astro:content";
import AboutIdentity from "../../components/AboutIdentity.astro";
import Layout from "../../layouts/Layout.astro";

const [page] = await getCollection("pages", ({ id }) => id === "en/about");

if (!page) {
	throw new Error("Missing en/about page content.");
}

const { Content } = await render(page);
const identity = page.data.identity;
---

<Layout title={`${page.data.title} | sings.dev`} description={page.data.description} lang="en">
	<article class="space-y-16">
		{
			identity && (
				<AboutIdentity
					lang="en"
					summary={identity.summary}
					photo={identity.photo}
					socials={identity.socials}
					experience={identity.experience}
				/>
			)
		}

		<section
			class="prose prose-stone max-w-none dark:prose-invert dark:prose-a:text-stone-100 dark:prose-a:decoration-stone-500 dark:prose-blockquote:border-stone-700 dark:prose-blockquote:text-stone-300 dark:prose-code:text-stone-100 dark:prose-pre:border-stone-700 dark:prose-pre:bg-stone-900"
		>
			<Content />
		</section>
	</article>
</Layout>
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests pass (including earlier locale tests that also exercise about pages, if any).

- [ ] **Step 6: Commit**

```bash
git add src/pages/about.astro src/pages/en/about.astro tests/about-identity.test.mjs
git commit -m "$(cat <<'EOF'
feat: render AboutIdentity above markdown body on /about

Updates the Korean and English about page routes to pull the new
identity frontmatter off the page entry and render AboutIdentity above
the existing markdown body. Keeps rendering working when identity is
absent so the schema stays optional.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Write `docs/spec-about.md`

**Files:**
- Create: `docs/spec-about.md`

- [ ] **Step 1: Author the spec**

Create `docs/spec-about.md`:

```markdown
# Spec: /about Page

- **Goal**: Serve as both the blog's identity page ("who writes here") and a concrete job-search surface for the author, without giving the rest of the site a portfolio or marketing feel.
- **Reference Philosophy**: Follow `docs/spec-editorial-philosophy.md`. The philosophy's `Avoid: Resume-site energy on the home page` guidance applies to the home page; `/about` is the designated surface for structured biographical content, so light resume-flavored structure is allowed here but must stay typographically calm.
- **Page Role**:
  - `/about` is the only site surface that carries structured biographical data (photo, socials, experience).
  - It should feel like a quiet editorial about-page, not like a portfolio template or a LinkedIn export.
  - The home page, archive, and post detail remain the primary "quiet, text-first" surfaces.
- **Routes**:
  - Korean: `src/pages/about.astro` rendering `src/content/pages/ko/about.md`.
  - English: `src/pages/en/about.astro` rendering `src/content/pages/en/about.md`.
- **Content Schema (`src/content/config.ts`, `pages` collection)**:
  - `identity` is an optional object on the `pages` schema.
  - `identity.summary` (string, required): short first-person intro, about two to three sentences.
  - `identity.photo` (object, required): `{ src, alt }` for the avatar. Uses `/avatar-placeholder.png` until a real portrait replaces it.
  - `identity.socials` (array, default `[]`): each item has `type` (`"github" | "email" | "linkedin" | "instagram"`), `href`, and optional `label`. Order is preserved.
  - `identity.experience` (array, default `[]`): each item has `company`, `role`, `start`, `end`, and `description`. Order is preserved and reflects reverse-chronological listing by convention.
- **Rendering Order**:
  1. Photo + summary row.
  2. Social links row.
  3. Experience list.
  4. Markdown body from the `.md` file (short essays about what the author writes and why).
- **Editorial Guardrails**:
  - No company logos, badges, skill tags, or achievement callouts.
  - No card/box decoration around experience entries.
  - Social links use the shared `SocialIcon.astro` inline SVGs paired with a short text label; icon-only is not used.
  - Experience entries use typographic structure only (a date column + company/role/description stack).
  - The body keeps an essay tone and stays short so the page does not read as a pure CV.
- **Author Presence Elsewhere**:
  - Do not re-introduce a per-post author block on post detail pages. Author identity for readers lives in the header, the home intro, and this page.
  - Social links and contact methods live on this page only; the footer remains a copyright line.
- **What To Avoid**:
  - Portfolio-style hero panels or large call-to-action buttons.
  - Animated or decorative treatments around the photo.
  - Popularity or metric widgets ("X years experience", "Y shipped projects").
  - Tag clouds or skill matrices.
```

- [ ] **Step 2: Commit**

```bash
git add docs/spec-about.md
git commit -m "$(cat <<'EOF'
docs: add /about page spec

Documents /about as the single site surface that carries structured
biographical content, explains why light resume flavor is acceptable
there (job-search surface), and locks in the editorial guardrails that
keep the page from drifting into portfolio territory.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Update `docs/spec-roadmap.md`

**Files:**
- Modify: `docs/spec-roadmap.md`

- [ ] **Step 1: Update the Identity section status**

Within the `### 2. Identity` section, replace the `**Direction**:` block with a new block that records the landed step while keeping the forward-looking direction.

Old:

```markdown
- **Direction**:
  - Strengthen personality and authorship without drifting into branding or self-promotion.
  - Keep identity editorial and human, not corporate or portfolio-like.
```

New:

```markdown
- **Current Status**:
  - `/about` has landed as a structured identity + job-search surface with photo, summary, socials, and experience (see `docs/spec-about.md`).
  - Home hero and Header identity treatment are not yet revised.
- **Direction**:
  - Strengthen personality and authorship without drifting into branding or self-promotion.
  - Keep identity editorial and human, not corporate or portfolio-like.
  - Home remains the "quiet front door"; resume-flavored content stays scoped to `/about`.
```

Also update the `## Current State` bullet list by appending:

```markdown
- `/about` now carries structured identity metadata (photo, summary, social links, experience) while the rest of the site stays text-first.
```

- [ ] **Step 2: Commit**

```bash
git add docs/spec-roadmap.md
git commit -m "$(cat <<'EOF'
docs: record /about identity step in roadmap

Notes that /about has landed as a structured identity and job-search
surface and clarifies that the home hero treatment is still outstanding
and stays out of the resume-flavored scope.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Checklist (for the executor)

Before declaring the plan complete:

1. Run `npm test` and confirm all tests pass.
2. Run `npm run astro -- check` and confirm no content-schema errors.
3. Spot-check `/about` and `/en/about` in `npm run dev` to confirm the rendered layout matches the spec (photo + summary, social row, experience list, body).
4. Grep for any `your-name` / `hello@example.com` / `AuthorProfile` leftovers — none should remain.
5. Confirm the placeholder avatar is present at `public/avatar-placeholder.png` and renders (no 404).
6. Re-read `docs/spec-about.md` and `docs/spec-roadmap.md` to confirm they describe what actually shipped.
