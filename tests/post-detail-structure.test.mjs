import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const repoBlogUrl = new URL("../src/utils/blog.ts", import.meta.url).href;
const repoPostReadingUrl = new URL("../src/utils/postReading.ts", import.meta.url).href;
const repoTocUrl = new URL("../src/components/TOC.astro", import.meta.url);
const repoPostHeaderUrl = new URL("../src/components/PostHeader.astro", import.meta.url);
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

const serializePosts = (posts) => JSON.stringify(posts);

const makePost = (id, overrides = {}) => ({
	id,
	slug: id.split("/").at(-1) ?? id,
	body: "## Intro\n\nA little body copy.",
	collection: "blog",
	data: {
		title: "Default Title",
		pubDate: new Date("2026-01-01T00:00:00.000Z"),
		description: "Default description",
		category: "Guides",
		tags: ["astro"],
		...overrides,
	},
});

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

async function renderPostDetailPage(sourceUrl, props, posts) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "post-detail-page-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const i18nStubPath = join(tempDir, "astro-i18n-stub.ts");
	const contentStubPath = join(tempDir, "astro-content-stub.ts");
	const isEnglishPage = sourceUrl.pathname.includes("/src/pages/en/");
	const pageDirectory = isEnglishPage
		? join(tempDir, "src", "pages", "en", "posts")
		: join(tempDir, "src", "pages", "posts");
	const pagePath = join(pageDirectory, "page.ts");
	const layoutStubPath = join(tempDir, "src", "layouts", "Layout.ts");
	const codeCopyButtonStubPath = join(tempDir, "src", "components", "CodeCopyButton.ts");
	const postHeaderStubPath = join(tempDir, "src", "components", "PostHeader.ts");
	const postReadingFlowStubPath = join(tempDir, "src", "components", "PostReadingFlow.ts");
	const postSummaryStubPath = join(tempDir, "src", "components", "PostSummary.ts");
	const readingProgressStubPath = join(tempDir, "src", "components", "ReadingProgress.ts");
	const tocStubPath = join(tempDir, "src", "components", "TOC.ts");
	const commentsStubPath = join(tempDir, "src", "components", "Comments.ts");
	const blogUtilsStubPath = join(tempDir, "src", "utils", "blog.ts");
	const postReadingUtilsStubPath = join(tempDir, "src", "utils", "postReading.ts");
	const blogUtilsNoExtPath = join(tempDir, "src", "utils", "blog");
	const postReadingUtilsNoExtPath = join(tempDir, "src", "utils", "postReading");

	try {
		await mkdir(dirname(layoutStubPath), { recursive: true });
		await mkdir(dirname(postHeaderStubPath), { recursive: true });
		await mkdir(dirname(blogUtilsStubPath), { recursive: true });
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

		const contentComponentPath = await compileAstroStub(
			tempDir,
			"ContentStub",
			[
				"---",
				"---",
				"<div data-content>Rendered markdown</div>",
				"",
			].join("\n"),
			runtimeStubPath,
		);
		await writeFile(
			layoutStubPath,
			await compileAstroSource(
				[
					"---",
					"const { title = '', description = '', lang = 'en' } = Astro.props;",
					"---",
					'<div data-layout-title={title} data-layout-description={description} data-layout-lang={lang}><slot /></div>',
					"",
				].join("\n"),
				join(tempDir, "LayoutStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			postHeaderStubPath,
			await compileAstroSource(
				[
					"---",
					"const { title = '', tags = [], readingTimeMinutes = 0 } = Astro.props;",
					"---",
					'<div data-post-header-title={title} data-post-header-tags={tags.join("|")} data-post-header-reading-time={String(readingTimeMinutes)}>{title}</div>',
					"",
				].join("\n"),
				join(tempDir, "PostHeaderStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			postReadingFlowStubPath,
			await compileAstroSource(
				[
					"---",
					"const { series = null, items = [] } = Astro.props;",
					"---",
					'<div data-reading-flow data-series-labels={(series?.items ?? []).map((item) => item.label).join("|")} data-related-titles={items.map((item) => item.title).join("|")} />',
					"",
				].join("\n"),
				join(tempDir, "PostReadingFlowStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			postSummaryStubPath,
			await compileAstroSource(
				[
					"---",
					"const { summary = '' } = Astro.props;",
					"---",
					'<div data-post-summary={summary} />',
					"",
				].join("\n"),
				join(tempDir, "PostSummaryStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			readingProgressStubPath,
			await compileAstroSource(
				[
					"---",
					"---",
					'<div data-reading-progress-stub />',
					"",
				].join("\n"),
				join(tempDir, "ReadingProgressStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			codeCopyButtonStubPath,
			await compileAstroSource(
				[
					"---",
					"---",
					"",
				].join("\n"),
				join(tempDir, "CodeCopyButtonStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			tocStubPath,
			await compileAstroSource(
				[
					"---",
					"const { title = '', ariaLabel = '' } = Astro.props;",
					"---",
					'<div data-toc-title={title} data-toc-label={ariaLabel} />',
					"",
				].join("\n"),
				join(tempDir, "TOCStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			commentsStubPath,
			await compileAstroSource(
				[
					"---",
					"const { lang = 'en' } = Astro.props;",
					"---",
					'<div data-comments={lang} />',
					"",
				].join("\n"),
				join(tempDir, "CommentsStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			blogUtilsStubPath,
			[`export * from ${JSON.stringify(repoBlogUrl)};`, ""].join("\n"),
		);
		await writeFile(
			blogUtilsNoExtPath,
			[`export * from ${JSON.stringify(repoBlogUrl)};`, ""].join("\n"),
		);
		await writeFile(
			postReadingUtilsStubPath,
			[`export * from ${JSON.stringify(repoPostReadingUrl)};`, ""].join("\n"),
		);
		await writeFile(
			postReadingUtilsNoExtPath,
			[`export * from ${JSON.stringify(repoPostReadingUrl)};`, ""].join("\n"),
		);

		await writeFile(
			contentStubPath,
			[
				`import Content from ${JSON.stringify(pathToFileURL(contentComponentPath).href)};`,
				`const posts = JSON.parse(${JSON.stringify(serializePosts(posts))}).map((entry) => ({`,
				"  ...entry,",
				"  data: {",
				"    ...entry.data,",
				"    pubDate: new Date(entry.data.pubDate),",
				"  },",
				"}));",
				"export const getCollection = async (_name, filter) =>",
				"  posts.filter((entry) => (filter ? filter(entry) : true));",
				"export const render = async () => ({",
				"  Content,",
				"  headings: [{ depth: 2, slug: 'intro', text: 'Introduction' }],",
				"});",
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

		for (const [find, replaceWith] of [
			["../../layouts/Layout.astro", "../../layouts/Layout.ts"],
			["../../../layouts/Layout.astro", "../../../layouts/Layout.ts"],
			["../../components/CodeCopyButton.astro", "../../components/CodeCopyButton.ts"],
			["../../../components/CodeCopyButton.astro", "../../../components/CodeCopyButton.ts"],
			["../../components/PostHeader.astro", "../../components/PostHeader.ts"],
			["../../../components/PostHeader.astro", "../../../components/PostHeader.ts"],
			["../../components/PostReadingFlow.astro", "../../components/PostReadingFlow.ts"],
			["../../../components/PostReadingFlow.astro", "../../../components/PostReadingFlow.ts"],
			["../../components/PostSummary.astro", "../../components/PostSummary.ts"],
			["../../../components/PostSummary.astro", "../../../components/PostSummary.ts"],
			["../../components/ReadingProgress.astro", "../../components/ReadingProgress.ts"],
			["../../../components/ReadingProgress.astro", "../../../components/ReadingProgress.ts"],
			["../../components/TOC.astro", "../../components/TOC.ts"],
			["../../../components/TOC.astro", "../../../components/TOC.ts"],
			["../../components/Comments.astro", "../../components/Comments.ts"],
			["../../../components/Comments.astro", "../../../components/Comments.ts"],
			["../../utils/blog.ts", "../../utils/blog.ts"],
			["../../../utils/blog.ts", "../../../utils/blog.ts"],
			["../../utils/postReading.ts", "../../utils/postReading.ts"],
			["../../../utils/postReading.ts", "../../../utils/postReading.ts"],
		]) {
			rewritten = rewritten.replaceAll(find, replaceWith);
		}

		await writeFile(pagePath, rewritten);

		const component = await import(pathToFileURL(pagePath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
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

test("post detail pages render assembled titles through Layout and PostHeader", async () => {
	const currentPost = makePost("ko/routing-middle", {
		title: "Routing Story",
		description: "The middle chapter.",
		pubDate: new Date("2026-04-10T00:00:00.000Z"),
		tags: ["astro", "routing"],
		series: { id: "routing", index: 2, total: 3, subtitle: "Middle" },
	});
	const siblingPosts = [
		makePost("ko/routing-opening", {
			title: "Routing Story",
			pubDate: new Date("2026-04-01T00:00:00.000Z"),
			series: { id: "routing", index: 1, total: 3, subtitle: "Opening" },
		}),
		makePost("ko/routing-closing", {
			title: "Routing Story",
			pubDate: new Date("2026-04-20T00:00:00.000Z"),
			series: { id: "routing", index: 3, total: 3, subtitle: "Closing" },
		}),
	];
	const expectedTitle = "Routing Story (2/3): Middle";

	const koRendered = await renderPostDetailPage(
		new URL("../src/pages/posts/[...slug].astro", import.meta.url),
		{ post: currentPost },
		[currentPost, ...siblingPosts],
	);
	const enRendered = await renderPostDetailPage(
		new URL("../src/pages/en/posts/[...slug].astro", import.meta.url),
		{ post: { ...currentPost, id: "en/routing-middle" } },
		[
			{ ...currentPost, id: "en/routing-middle" },
			{ ...siblingPosts[0], id: "en/routing-opening" },
			{ ...siblingPosts[1], id: "en/routing-closing" },
		],
	);

	for (const [rendered, lang] of [
		[koRendered, "ko"],
		[enRendered, "en"],
	]) {
		assert.ok(rendered.includes(`data-layout-title="${expectedTitle} | sings.dev"`));
		assert.match(rendered, new RegExp(`data-layout-lang="${lang}"`));
		assert.ok(rendered.includes(`data-post-header-title="${expectedTitle}"`));
		assert.doesNotMatch(rendered, /data-post-header-title="Routing Story"/);
		assert.match(rendered, /data-post-header-tags="astro\|routing"/);
		assert.match(rendered, /data-reading-flow/);
		assert.match(rendered, /data-content/);
	}
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
