import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler-rs";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const repoBlogUrl = new URL("../src/utils/blog.ts", import.meta.url).href;
const repoTocUrl = new URL("../src/components/TOC.astro", import.meta.url);
const repoPostHeaderUrl = new URL("../src/components/PostHeader.astro", import.meta.url);
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;


async function renderAstroComponent(sourceUrl, props, replacements = []) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "astro-component-"));
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

		for (const { find, replaceWith } of replacements) {
			rewritten = rewritten.replaceAll(find, replaceWith);
		}

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

async function compileAstroStub(tempDir, name, source, runtimeStubPath) {
	const sourcePath = join(tempDir, `${name}.astro`);
	const compiledPath = join(tempDir, `${name}.ts`);

	await writeFile(sourcePath, source);

	const compiled = await transform(source, {
		filename: sourcePath,
		internalURL: "astro/runtime/server/index.js",
	});

	await writeFile(
		compiledPath,
		compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		),
	);

	return compiledPath;
}

async function compileAstroSource(source, filename, runtimeStubPath) {
	const compiled = await transform(source, {
		filename,
		internalURL: "astro/runtime/server/index.js",
	});

	return compiled.code.replaceAll(
		"astro/runtime/server/index.js",
		pathToFileURL(runtimeStubPath).href,
	);
}

async function renderPostHeader(props) {
	const stubDir = await mkdtemp(join(tmpdir(), "post-header-"));
	const i18nStubPath = join(stubDir, "astro-i18n-stub.ts");
	const blogStubPath = join(stubDir, "blog-stub.ts");

	try {
		await writeFile(
			i18nStubPath,
			[
				'export const getRelativeLocaleUrl = (locale: string, path: string) =>',
				'  `/${locale}/${path}`;',
				"",
			].join("\n"),
		);
		await writeFile(
			blogStubPath,
			[
				`export * from ${JSON.stringify(repoBlogUrl)};`,
				"export const formatReadingTime = (minutes: number, lang: string) =>",
				'  lang === "ko" ? `${minutes}분 읽기` : `${minutes} min read`;',
				"",
			].join("\n"),
		);

		return await renderAstroComponent(repoPostHeaderUrl, props, [
			{ find: "astro:i18n", replaceWith: pathToFileURL(i18nStubPath).href },
			{
				find: "../i18n/ui",
				replaceWith: repoUiUrl,
			},
			{
				find: "../utils/blog",
				replaceWith: pathToFileURL(blogStubPath).href,
			},
		]);
	} finally {
		await rm(stubDir, { recursive: true, force: true });
	}
}

test("shared post header renders meta line, full tags, and intro divider", async () => {
	const rendered = await renderPostHeader({
		category: "Guides",
		description: "A short intro for readers.",
		lang: "en",
		pubDate: new Date("2024-01-02T00:00:00.000Z"),
		readingTimeMinutes: 7,
		tags: ["astro", "testing"],
		title: "Post Header",
	});

	assert.match(
		rendered,
		/<header class="space-y-6 border-b border-dawn-300 pb-10 dark:border-night-600">/,
	);
	assert.match(
		rendered,
		/<div class="flex flex-wrap items-center gap-x-3 gap-y-2[^"]*">[\s\S]*<a href="\/en\/category\/guides\/"[^>]*>\s*Guides\s*<\/a>[\s\S]*<time datetime="2024-01-02">2024-01-02<\/time>[\s\S]*<p>7 min read<\/p>[\s\S]*<\/div>/,
	);
	assert.match(
		rendered,
		/<div class="space-y-4">[\s\S]*<h1 class="text-4xl font-semibold tracking-tight text-dawn-800 dark:text-night-50 sm:text-5xl">[\s\S]*Post Header[\s\S]*<\/h1>[\s\S]*<p class="max-w-2xl text-lg leading-8 text-dawn-700 dark:text-night-200">[\s\S]*A short intro for readers\.[\s\S]*<\/p>[\s\S]*<\/div>/,
	);
	assert.match(
		rendered,
		/<ul class="flex flex-wrap gap-2">[\s\S]*<a href="\/en\/tags\/astro\/"[^>]*>\s*#astro\s*<\/a>[\s\S]*<a href="\/en\/tags\/testing\/"[^>]*>\s*#testing\s*<\/a>[\s\S]*<\/ul>/,
	);
});

test("TOC renders a quieter, easier-to-scan list", async () => {
	const rendered = await renderAstroComponent(repoTocUrl, {
		headings: [
			{ depth: 2, slug: "intro", text: "Introduction" },
			{ depth: 3, slug: "detail", text: "Implementation detail" },
		],
		title: "Contents",
		ariaLabel: "Table of contents",
	});

	assert.match(
		rendered,
		/<nav data-toc aria-label="Table of contents" class="text-sm text-dawn-700 dark:text-night-200">/,
	);
	assert.match(
		rendered,
		/<p class="mb-3 text-xs font-semibold uppercase tracking-\[0\.2em\] text-dawn-600 dark:text-night-400">[\s\S]*Contents[\s\S]*<\/p>/,
	);
	assert.match(
		rendered,
		/<ul class="space-y-2">[\s\S]*<a href="#intro" class="toc-link block leading-6 text-dawn-700 transition-colors hover:text-dawn-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dawn-100 dark:text-night-200 dark:hover:text-night-50 dark:focus-visible:ring-night-500 dark:focus-visible:ring-offset-night-800">[\s\S]*Introduction[\s\S]*<li class="pl-4">[\s\S]*Implementation detail/,
	);
});

test("post lists and home pages still read assembled titles from the shared helper", async () => {
	const postList = await readFile(new URL("../src/components/PostList.astro", import.meta.url), "utf8");
	const koHome = await readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8");
	const enHome = await readFile(new URL("../src/pages/en/index.astro", import.meta.url), "utf8");

	assert.match(postList, /import \{[\s\S]*getDisplayTitle,[\s\S]*\} from "\.\.\/utils\/blog";/);
	assert.match(postList, /\{getDisplayTitle\(post\)\}/);
	assert.doesNotMatch(postList, /\{post\.data\.title\}/);

	assert.match(koHome, /import \{[\s\S]*getDisplayTitle,[\s\S]*\} from "\.\.\/utils\/blog";/);
	assert.match(koHome, /\{getDisplayTitle\(post\)\}/);
	assert.doesNotMatch(koHome, /\{post\.data\.title\}/);

	assert.match(enHome, /import \{[\s\S]*getDisplayTitle,[\s\S]*\} from "\.\.\/\.\.\/utils\/blog";/);
	assert.match(enHome, /\{getDisplayTitle\(post\)\}/);
	assert.doesNotMatch(enHome, /\{post\.data\.title\}/);
});

test("post detail pages center the body on viewport with TOC overhanging at xl:", async () => {
	for (const path of ["pages/posts/[...slug].astro", "pages/en/posts/[...slug].astro"]) {
		const file = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

		// Article wraps a centered, max-w-3xl, position: relative box for TOC absolute anchor.
		assert.match(
			file,
			/<article\s+class="relative mx-auto max-w-3xl"\s+data-pagefind-body/,
			`${path}: article should carry "relative mx-auto max-w-3xl" with data-pagefind-body`,
		);

		// Mobile details TOC is hidden at xl+ (not md+).
		assert.match(
			file,
			/<details[^>]*\bxl:hidden\b/,
			`${path}: mobile details TOC should be xl:hidden`,
		);

		// Desktop TOC aside overhangs at xl+ via absolute positioning, full-height for sticky scroll range.
		assert.match(
			file,
			/<aside\s+class="hidden xl:block absolute inset-y-0 left-full pl-4 w-60"/,
			`${path}: desktop TOC aside should be the absolute overhang shape`,
		);

		// Old md: 2-column structure must not regress.
		assert.doesNotMatch(file, /md:flex md:gap-16/, `${path}: old md:flex layout should be removed`);
		assert.doesNotMatch(file, /md:w-3\/4/, `${path}: old md:w-3/4 body column should be removed`);
		assert.doesNotMatch(file, /hidden md:block md:w-1\/4/, `${path}: old md:w-1/4 TOC column should be removed`);
		assert.doesNotMatch(file, /max-w-5xl/, `${path}: old article max-w-5xl should be removed`);
	}
});
