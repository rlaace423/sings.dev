import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const repoArchiveBrowseUrl = new URL("../src/data/archiveBrowse.ts", import.meta.url).href;
const repoBlogUrl = new URL("../src/utils/blog.ts", import.meta.url).href;

async function renderAstroComponent(sourceUrl, props, replacements = []) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "archive-hub-"));
	const i18nStubPath = join(tempDir, "astro-i18n-stub.ts");
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const componentPath = join(tempDir, "component.ts");

	try {
		await writeFile(
			i18nStubPath,
			[
				"export const getRelativeLocaleUrl = (locale, path) => `/${locale}/${path}`;",
				"",
			].join("\n"),
		);
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
		rewritten = rewritten.replaceAll(
			"astro:i18n",
			pathToFileURL(i18nStubPath).href,
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

async function compileAstroStub(source, filename, runtimeStubPath) {
	const compiled = await transform(source, {
		filename,
		internalURL: "astro/runtime/server/index.js",
	});

	return compiled.code.replaceAll(
		"astro/runtime/server/index.js",
		pathToFileURL(runtimeStubPath).href,
	);
}

async function renderAstroPage(sourceUrl, props, replacements = []) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "archive-hub-page-"));
	const i18nStubPath = join(tempDir, "astro-i18n-stub.ts");
	const contentStubPath = join(tempDir, "astro-content-stub.ts");
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const isEnglishPage = sourceUrl.pathname.includes("/src/pages/en/");
	const pageDirectory = isEnglishPage
		? join(tempDir, "src", "pages", "en", "category")
		: join(tempDir, "src", "pages", "category");
	const layoutStubSourcePath = join(tempDir, "LayoutStub.astro");
	const postListStubSourcePath = join(tempDir, "PostListStub.astro");
	const layoutStubPath = join(tempDir, "src", "layouts", "Layout.ts");
	const postListStubPath = join(tempDir, "src", "components", "PostList.ts");
	const pagePath = join(pageDirectory, "page.ts");

	try {
		await mkdir(dirname(layoutStubPath), { recursive: true });
		await mkdir(dirname(postListStubPath), { recursive: true });
		await mkdir(pageDirectory, { recursive: true });
		await writeFile(
			i18nStubPath,
			[
				"export const getRelativeLocaleUrl = (locale, path) => `/${locale}/${path}`;",
				"",
			].join("\n"),
		);
		await writeFile(
			runtimeStubPath,
			[
				`export * from ${JSON.stringify(astroRuntimeUrl)};`,
				"export const createMetadata = () => ({})",
				"",
			].join("\n"),
		);
		await writeFile(
			contentStubPath,
			[
				"export const getCollection = async () => [];",
				"",
			].join("\n"),
		);
		await writeFile(
			layoutStubSourcePath,
			[
				"---",
				"const { lang = 'en' } = Astro.props;",
				"---",
				`<html lang={lang}><body><slot /></body></html>`,
				"",
			].join("\n"),
		);
		await writeFile(
			postListStubSourcePath,
			[
				"---",
				"const { posts = [] } = Astro.props;",
				"---",
				`<div data-post-list>{posts.length}</div>`,
				"",
			].join("\n"),
		);

		const layoutStubCode = await compileAstroStub(
			await readFile(layoutStubSourcePath, "utf8"),
			layoutStubSourcePath,
			runtimeStubPath,
		);
		const postListStubCode = await compileAstroStub(
			await readFile(postListStubSourcePath, "utf8"),
			postListStubSourcePath,
			runtimeStubPath,
		);
		await writeFile(layoutStubPath, layoutStubCode);
		await writeFile(postListStubPath, postListStubCode);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		rewritten = rewritten.replaceAll(
			"astro:i18n",
			pathToFileURL(i18nStubPath).href,
		);
		rewritten = rewritten.replaceAll(
			"astro:content",
			pathToFileURL(contentStubPath).href,
		);

		for (const { find, replaceWith } of replacements) {
			rewritten = rewritten.replaceAll(find, replaceWith);
		}

		rewritten = rewritten
			.replaceAll(
				"../../layouts/Layout.astro",
				"../../layouts/Layout.ts",
			)
			.replaceAll(
				"../../../layouts/Layout.astro",
				"../../../layouts/Layout.ts",
			)
			.replaceAll(
				"../../components/PostList.astro",
				"../../components/PostList.ts",
			)
			.replaceAll(
				"../../../components/PostList.astro",
				"../../../components/PostList.ts",
			);

		await writeFile(pagePath, rewritten);

		const component = await import(pathToFileURL(pagePath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

test("archive browse renders category counts, manual descriptions, and representative tag links", async () => {
	const rendered = await renderAstroComponent(
		new URL("../src/components/ArchiveBrowse.astro", import.meta.url),
		{
			categories: [
				{
					name: "Development",
					description: "Notes on implementation choices and system design.",
					count: 4,
				},
				{
					name: "Operations",
					description: "Writing about the shape of systems in real operation.",
					count: 2,
				},
			],
			lang: "en",
			tags: ["architecture", "docs"],
		},
		[
			{ find: "../i18n/ui", replaceWith: repoUiUrl },
			{ find: "../utils/blog", replaceWith: repoBlogUrl },
		],
	);

	assert.match(
		rendered,
		/<section class="mt-10(?: space-y-6)? border-t border-stone-200 pt-8 dark:border-stone-800">/,
	);
	assert.match(rendered, /href="\/en\/category\/development"/);
	assert.match(rendered, /href="\/en\/category\/operations"/);
	assert.match(rendered, /href="\/en\/tags\/architecture"/);
	assert.match(rendered, /href="\/en\/tags\/docs"/);
	assert.match(rendered, /Notes on implementation choices and system design\./);
	assert.match(rendered, /Writing about the shape of systems in real operation\./);
	assert.match(rendered, /<span class="shrink-0 text-sm font-medium text-stone-500 dark:text-stone-400">[\s\S]*4[\s\S]*posts[\s\S]*<\/span>/);
	assert.match(rendered, /<span class="shrink-0 text-sm font-medium text-stone-500 dark:text-stone-400">[\s\S]*2[\s\S]*posts[\s\S]*<\/span>/);
});

test("archive browse omits empty descriptions and uses default locale links", async () => {
	const rendered = await renderAstroComponent(
		new URL("../src/components/ArchiveBrowse.astro", import.meta.url),
		{
			categories: [
				{
					name: "Development",
					count: 1,
				},
			],
			lang: "ko",
			tags: ["architecture"],
		},
		[
			{ find: "../i18n/ui", replaceWith: repoUiUrl },
			{ find: "../utils/blog", replaceWith: repoBlogUrl },
		],
	);

	assert.match(rendered, /href="\/category\/development\//);
	assert.match(rendered, /href="\/tags\/architecture\//);
	assert.doesNotMatch(rendered, /<p class="text-sm leading-6 text-stone-600 dark:text-stone-300">\s*<\/p>/);
});

test("category pages hide related tags when there is no repeated signal", async () => {
	const rendered = await renderAstroPage(
		new URL("../src/pages/category/[category].astro", import.meta.url),
		{
			category: "Development",
			posts: [
				{
					id: "ko/development/one",
					data: {
						category: "Development",
						pubDate: new Date("2024-01-01"),
						title: "One",
						description: "One",
						tags: ["astro"],
					},
				},
				{
					id: "ko/development/two",
					data: {
						category: "Development",
						pubDate: new Date("2024-01-02"),
						title: "Two",
						description: "Two",
						tags: ["docs"],
					},
				},
				{
					id: "ko/development/three",
					data: {
						category: "Development",
						pubDate: new Date("2024-01-03"),
						title: "Three",
						description: "Three",
						tags: ["architecture"],
					},
				},
			],
		},
		[
			{ find: "../../data/archiveBrowse", replaceWith: repoArchiveBrowseUrl },
			{ find: "../../utils/blog", replaceWith: repoBlogUrl },
		],
	);

	assert.doesNotMatch(rendered, /관련 태그/);
	assert.doesNotMatch(rendered, /href="\/category\/.*tags\//);
});

test("category pages render locale-aware related tag hrefs when there is repeated signal", async () => {
	const rendered = await renderAstroPage(
		new URL("../src/pages/en/category/[category].astro", import.meta.url),
		{
			category: "Development",
			posts: [
				{
					id: "en/development/one",
					data: {
						category: "Development",
						pubDate: new Date("2024-01-03"),
						title: "One",
						description: "One",
						tags: ["architecture", "docs"],
					},
				},
				{
					id: "en/development/two",
					data: {
						category: "Development",
						pubDate: new Date("2024-01-02"),
						title: "Two",
						description: "Two",
						tags: ["architecture"],
					},
				},
				{
					id: "en/development/three",
					data: {
						category: "Development",
						pubDate: new Date("2024-01-01"),
						title: "Three",
						description: "Three",
						tags: ["docs"],
					},
				},
			],
		},
		[
			{ find: "../../../data/archiveBrowse", replaceWith: repoArchiveBrowseUrl },
			{ find: "../../../utils/blog", replaceWith: repoBlogUrl },
		],
	);

	assert.match(rendered, /<p class="text-sm font-medium text-stone-600 dark:text-stone-300">\s*Related tags\s*<\/p>/);
	assert.match(rendered, /href="\/en\/tags\/architecture"/);
	assert.match(rendered, /href="\/en\/tags\/docs"/);
	assert.match(rendered, /<div data-post-list>3<\/div>/);
});

test("/posts pages place browse above filters and keep locale-aware archive wiring", async () => {
	const koPage = await readFile(new URL("../src/pages/posts/index.astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/posts/index.astro", import.meta.url), "utf8");

	assert.match(koPage, /import ArchiveBrowse from "\.\.\/\.\.\/components\/ArchiveBrowse\.astro";/);
	assert.match(enPage, /import ArchiveBrowse from "\.\.\/\.\.\/\.\.\/components\/ArchiveBrowse\.astro";/);
	assert.match(koPage, /browseConfig\.representativeTags\.filter/);
	assert.match(enPage, /browseConfig\.representativeTags\.filter/);
	assert.match(koPage, /tags\.includes\(tag\),/);
	assert.match(enPage, /tags\.includes\(tag\),/);
	assert.ok(
		koPage.indexOf("<ArchiveBrowse") > koPage.indexOf("<section class=\"space-y-4\">"),
		"Browse should render after the intro section in the Korean archive page",
	);
	assert.ok(
		koPage.indexOf("<ArchiveBrowse") < koPage.indexOf("<ArchiveFilters"),
		"Browse should sit before filters in the Korean archive page",
	);
	assert.ok(
		enPage.indexOf("<ArchiveBrowse") > enPage.indexOf("<section class=\"space-y-4\">"),
		"Browse should render after the intro section in the English archive page",
	);
	assert.ok(
		enPage.indexOf("<ArchiveBrowse") < enPage.indexOf("<ArchiveFilters"),
		"Browse should sit before filters in the English archive page",
	);
	assert.match(enPage, /lang="en"/);
	assert.match(enPage, /<ArchiveBrowse[\s\S]*lang=(?:\{"en"\}|"en")/);
});
