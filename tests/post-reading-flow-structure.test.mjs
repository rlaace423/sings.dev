import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoSeriesNavUrl = new URL("../src/components/PostSeriesNav.astro", import.meta.url);
const repoRelatedReadingUrl = new URL("../src/components/RelatedReading.astro", import.meta.url);
const repoReadingFlowUrl = new URL("../src/components/PostReadingFlow.astro", import.meta.url);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const repoBlogUrl = new URL("../src/utils/blog.ts", import.meta.url).href;
const repoPostReadingUrl = new URL("../src/utils/postReading.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

const serializePosts = (posts) => JSON.stringify(posts);

const makePost = (id, overrides = {}) => ({
	id,
	slug: id.split("/").at(-1) ?? id,
	body: "## Intro\n\nReading flow body.",
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

async function renderAstroComponent(sourceUrl, props = {}, replacements = []) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "post-reading-flow-"));
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

async function renderPostReadingFlow(props = {}) {
	const tempDir = await mkdtemp(join(tmpdir(), "post-reading-flow-stub-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const seriesStubSourcePath = join(tempDir, "PostSeriesNavStub.astro");
	const relatedStubSourcePath = join(tempDir, "RelatedReadingStub.astro");
	const seriesStubPath = join(tempDir, "PostSeriesNavStub.ts");
	const relatedStubPath = join(tempDir, "RelatedReadingStub.ts");

	try {
		await writeFile(
			runtimeStubPath,
			[
				`export * from ${JSON.stringify(astroRuntimeUrl)};`,
				"export const createMetadata = () => ({})",
				"",
			].join("\n"),
		);
		await writeFile(
			seriesStubSourcePath,
			[
				"---",
				"const { series } = Astro.props;",
				"---",
				"{series ? <div data-series-stub>{series.title}</div> : null}",
				"",
			].join("\n"),
		);
		await writeFile(
			relatedStubSourcePath,
			[
				"---",
				"const { items = [] } = Astro.props;",
				"---",
				`<div data-related-stub>{items.length}</div>`,
				"",
			].join("\n"),
		);

		const seriesStubCode = (await transform(await readFile(seriesStubSourcePath, "utf8"), {
			filename: seriesStubSourcePath,
			internalURL: "astro/runtime/server/index.js",
		})).code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		const relatedStubCode = (await transform(await readFile(relatedStubSourcePath, "utf8"), {
			filename: relatedStubSourcePath,
			internalURL: "astro/runtime/server/index.js",
		})).code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);

		await writeFile(seriesStubPath, seriesStubCode);
		await writeFile(relatedStubPath, relatedStubCode);

		const rendered = await renderAstroComponent(repoReadingFlowUrl, props, [
			{ find: "../i18n/ui", replaceWith: repoUiUrl },
			{ find: "./PostSeriesNav.astro", replaceWith: pathToFileURL(seriesStubPath).href },
			{ find: "./RelatedReading.astro", replaceWith: pathToFileURL(relatedStubPath).href },
		]);

		return rendered;
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

async function renderPostDetailPage(sourceUrl, props, posts) {
	const source = await readFile(sourceUrl, "utf8");
	const compiled = await transform(source, {
		filename: sourceUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "post-reading-flow-page-"));
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
	const postImageLightboxStubPath = join(tempDir, "src", "components", "PostImageLightbox.ts");
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
				"<div data-content>Rendered body</div>",
				"",
			].join("\n"),
			runtimeStubPath,
		);
		await writeFile(
			layoutStubPath,
			await compileAstroSource(
				[
					"---",
					"---",
					"<div data-layout><slot /></div>",
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
					"---",
					"<div data-post-header />",
					"",
				].join("\n"),
				join(tempDir, "PostHeaderStub.astro"),
				runtimeStubPath,
			),
		);
		await writeFile(
			postImageLightboxStubPath,
			await compileAstroSource(
				[
					"---",
					"---",
					"<div data-post-image-lightbox-stub />",
					"",
				].join("\n"),
				join(tempDir, "PostImageLightboxStub.astro"),
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
					'<div data-reading-flow data-series-title={series?.title ?? ""} data-series-labels={(series?.items ?? []).map((item) => item.label).join("|")} data-related-titles={items.map((item) => item.title).join("|")} />',
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
					"---",
					"<div data-toc />",
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
					"---",
					"<div data-comments />",
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
			["../../components/PostImageLightbox.astro", "../../components/PostImageLightbox.ts"],
			["../../../components/PostImageLightbox.astro", "../../../components/PostImageLightbox.ts"],
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

test("PostSeriesNav renders the series title, position, navigation, and ordered list", async () => {
	const rendered = await renderAstroComponent(repoSeriesNavUrl, {
		lang: "en",
		series: {
			title: "Routing Story",
			currentIndex: 1,
			items: [
				{ label: "1/3: Opening", href: "/posts/opening/" },
				{ label: "2/3: Middle", href: "/posts/middle/" },
				{ label: "3/3: Closing", href: "/posts/closing/" },
			],
		},
	}, [
		{ find: "../i18n/ui", replaceWith: repoUiUrl },
	]);

	assert.match(rendered, /In This Series/);
	assert.match(rendered, /Routing Story/);
	assert.match(rendered, /Current chapter/);
	assert.match(rendered, />\s*2\s*\/\s*3\s*</);
	assert.match(rendered, /href="\/posts\/opening\/"/);
	assert.match(rendered, /href="\/posts\/closing\/"/);
	assert.match(rendered, /<ol[\s\S]*<li[\s\S]*1\/3: Opening[\s\S]*<li[\s\S]*2\/3: Middle[\s\S]*<li[\s\S]*3\/3: Closing/);
	assert.doesNotMatch(rendered, />\s*1\s*<\/span>\s*<span>1\/3: Opening/);
	assert.doesNotMatch(rendered, />\s*2\s*<\/span>\s*<span>2\/3: Middle/);
});

test("RelatedReading renders a quiet list of short follow-up items", async () => {
	const rendered = await renderAstroComponent(repoRelatedReadingUrl, {
		lang: "ko",
		items: [
			{
				title: "Routing Story (2/3): Defining Boundaries First",
				href: "/posts/next/",
				description: "짧은 설명입니다.",
				meta: "3분 읽기",
			},
			{
				title: "Another Follow-up",
				href: "/posts/continue/",
				description: "또 다른 짧은 설명입니다.",
				meta: "5분 읽기",
			},
		],
	}, [
		{ find: "../i18n/ui", replaceWith: repoUiUrl },
	]);

	assert.match(rendered, /다음 읽을거리/);
	assert.match(rendered, /<li[\s\S]*<a href="\/posts\/next\/"/);
	assert.match(rendered, /Routing Story \(2\/3\): Defining Boundaries First/);
	assert.match(rendered, /짧은 설명입니다\./);
	assert.match(rendered, /3분 읽기/);
});

test("PostReadingFlow renders nothing when both sections are absent", async () => {
	const rendered = await renderPostReadingFlow({});

	assert.equal(rendered.trim(), "");
});

test("PostReadingFlow wraps the series and related sections when content exists", async () => {
	const rendered = await renderPostReadingFlow({
		lang: "en",
		series: {
			title: "Routing Story",
			currentIndex: 0,
			items: [{ label: "1/1: Opening", href: "/posts/opening/" }],
		},
		items: [
			{
				title: "Keep going",
				href: "/posts/keep-going/",
				description: "A short next step.",
				meta: "4 min read",
			},
		],
	});

	assert.match(rendered, /data-series-stub/);
	assert.match(rendered, /Routing Story/);
	assert.match(rendered, /data-related-stub/);
	assert.match(rendered, /border-t/);
});

test("post detail pages render PostReadingFlow with helper-built labels before the footer", async () => {
	const currentPost = makePost("ko/routing-middle", {
		title: "Routing Story",
		pubDate: new Date("2026-04-10T00:00:00.000Z"),
		description: "The middle chapter.",
		tags: ["astro", "routing"],
		series: { id: "routing", index: 2, total: 3, subtitle: "Middle" },
	});
	const pagePosts = [
		currentPost,
		makePost("ko/routing-opening", {
			title: "Routing Story",
			pubDate: new Date("2026-04-01T00:00:00.000Z"),
			tags: ["astro", "routing"],
			series: { id: "routing", index: 1, total: 3, subtitle: "Opening" },
		}),
		makePost("ko/routing-closing", {
			title: "Routing Story",
			pubDate: new Date("2026-04-20T00:00:00.000Z"),
			tags: ["astro", "routing"],
			series: { id: "routing", index: 3, total: 3, subtitle: "Closing" },
		}),
		makePost("ko/pattern-library", {
			title: "Pattern Library",
			pubDate: new Date("2026-04-18T00:00:00.000Z"),
			tags: ["astro", "routing"],
			series: { id: "patterns", index: 2, total: 4, subtitle: "Spacing Rhythm" },
		}),
		makePost("ko/accessibility-checklist", {
			title: "Accessibility Checklist",
			pubDate: new Date("2026-04-12T00:00:00.000Z"),
			tags: ["astro"],
		}),
	];

	const koRendered = await renderPostDetailPage(
		new URL("../src/pages/posts/[...slug].astro", import.meta.url),
		{ post: currentPost },
		pagePosts,
	);
	const enCurrentPost = { ...currentPost, id: "en/routing-middle" };
	const enRendered = await renderPostDetailPage(
		new URL("../src/pages/en/posts/[...slug].astro", import.meta.url),
		{ post: enCurrentPost },
		pagePosts.map((post) =>
			post.id.startsWith("ko/") ? { ...post, id: post.id.replace(/^ko\//, "en/") } : post
		),
	);

	for (const rendered of [koRendered, enRendered]) {
		assert.match(rendered, /data-series-title="Routing Story"/);
		assert.match(rendered, /data-series-labels="1\/3: Opening\|2\/3: Middle\|3\/3: Closing"/);
		assert.match(
			rendered,
			/data-related-titles="Pattern Library \(2\/4\): Spacing Rhythm\|Accessibility Checklist"/,
		);
		assert.doesNotMatch(rendered, /data-related-titles="[^"]*Routing Story/);
		assert.doesNotMatch(rendered, /data-author-profile/);
		assert.ok(
			rendered.indexOf("data-reading-flow") < rendered.indexOf("data-comments"),
			"PostReadingFlow should render before Comments",
		);
	}
});
