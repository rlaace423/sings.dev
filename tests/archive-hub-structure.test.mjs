import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler-rs";
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
		/<section class="mt-10(?: space-y-6)? border-t border-dawn-300 pt-8 dark:border-night-600">/,
	);
	assert.match(rendered, /href="\/en\/category\/development\/"/);
	assert.match(rendered, /href="\/en\/category\/operations\/"/);
	assert.match(rendered, /href="\/en\/tags\/architecture\/"/);
	assert.match(rendered, /href="\/en\/tags\/docs\/"/);
	assert.match(rendered, /Notes on implementation choices and system design\./);
	assert.match(rendered, /Writing about the shape of systems in real operation\./);
	assert.match(rendered, /4 posts/);
	assert.match(rendered, /2 posts/);
});

test("archive browse keeps categories first and uses singular English count copy", async () => {
	const rendered = await renderAstroComponent(
		new URL("../src/components/ArchiveBrowse.astro", import.meta.url),
		{
			categories: [
				{
					name: "Development",
					description: "Notes on implementation choices and system design.",
					count: 1,
				},
			],
			lang: "en",
			tags: ["architecture"],
		},
		[
			{ find: "../i18n/ui", replaceWith: repoUiUrl },
			{ find: "../utils/blog", replaceWith: repoBlogUrl },
		],
	);

	assert.doesNotMatch(rendered, /lg:grid-cols-\[/);
	assert.ok(
		rendered.indexOf("Notes on implementation choices and system design.") <
			rendered.indexOf("1 post"),
		"Count should appear after the description",
	);
	assert.match(rendered, /Representative tags/);
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
	assert.doesNotMatch(rendered, /<p class="text-sm leading-6 text-dawn-700 dark:text-night-200">\s*<\/p>/);
});

test("/posts pages place browse above filters and keep locale-aware archive wiring", async () => {
	const koPage = await readFile(new URL("../src/pages/posts/index.astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/posts/index.astro", import.meta.url), "utf8");

	assert.match(koPage, /import ArchiveBrowse from "\.\.\/\.\.\/components\/ArchiveBrowse\.astro";/);
	assert.match(enPage, /import ArchiveBrowse from "\.\.\/\.\.\/\.\.\/components\/ArchiveBrowse\.astro";/);
	assert.match(koPage, /getTopTagsForPosts\(posts, REPRESENTATIVE_TAG_LIMIT\)/);
	assert.match(enPage, /getTopTagsForPosts\(posts, REPRESENTATIVE_TAG_LIMIT\)/);
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
