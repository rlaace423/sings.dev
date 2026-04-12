import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
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
		/<header class="space-y-6 border-b border-stone-200 pb-10 dark:border-stone-800">/,
	);
	assert.match(
		rendered,
		/<div class="flex flex-wrap items-center gap-x-3 gap-y-2[^"]*">[\s\S]*<a href="\/en\/category\/guides"[^>]*>\s*Guides\s*<\/a>[\s\S]*<time datetime="2024-01-02">2024-01-02<\/time>[\s\S]*<p>7 min read<\/p>[\s\S]*<\/div>/,
	);
	assert.match(
		rendered,
		/<div class="space-y-4">[\s\S]*<h1 class="text-4xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 sm:text-5xl">[\s\S]*Post Header[\s\S]*<\/h1>[\s\S]*<p class="max-w-2xl text-lg leading-8 text-stone-600 dark:text-stone-300">[\s\S]*A short intro for readers\.[\s\S]*<\/p>[\s\S]*<\/div>/,
	);
	assert.match(
		rendered,
		/<ul class="flex flex-wrap gap-2">[\s\S]*<a href="\/en\/tags\/astro"[^>]*>\s*#astro\s*<\/a>[\s\S]*<a href="\/en\/tags\/testing"[^>]*>\s*#testing\s*<\/a>[\s\S]*<\/ul>/,
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
		/<nav aria-label="Table of contents" class="text-sm text-stone-600 dark:text-stone-300">/,
	);
	assert.match(
		rendered,
		/<p class="mb-3 text-xs font-semibold uppercase tracking-\[0\.2em\] text-stone-500 dark:text-stone-500">[\s\S]*Contents[\s\S]*<\/p>/,
	);
	assert.match(
		rendered,
		/<ul class="space-y-2">[\s\S]*<a href="#intro" class="block leading-6 text-stone-700 transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:text-stone-300 dark:hover:text-stone-50 dark:focus-visible:ring-stone-700 dark:focus-visible:ring-offset-stone-950">[\s\S]*Introduction[\s\S]*<li class="pl-4">[\s\S]*Implementation detail/,
	);
});

test("post detail pages wire shared header, reading time, tags, and quiet body spacing", async () => {
	const koPage = await readFile(new URL("../src/pages/posts/[...slug].astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/posts/[...slug].astro", import.meta.url), "utf8");

	for (const page of [koPage, enPage]) {
		assert.match(page, /import PostHeader from .*\/components\/PostHeader\.astro";/);
		assert.match(page, /const readingTimeMinutes = getReadingTimeMinutes\(post\.body\);/);
		assert.match(page, /<PostHeader[\s\S]*tags=\{post\.data\.tags \?\? \[\]\}/);
		assert.match(page, /<div[\s\S]*class="prose prose-stone mt-10 max-w-none/);
		assert.match(page, /<div[\s\S]*class="sticky top-20 border-l border-stone-200 pl-6 dark:border-stone-800">/);
	}
});
