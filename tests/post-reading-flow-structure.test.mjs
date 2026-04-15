import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoSeriesNavUrl = new URL("../src/components/PostSeriesNav.astro", import.meta.url);
const repoRelatedReadingUrl = new URL("../src/components/RelatedReading.astro", import.meta.url);
const repoReadingFlowUrl = new URL("../src/components/PostReadingFlow.astro", import.meta.url);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

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
				"{series ? <div data-series-stub>{series.label}</div> : null}",
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

test("PostSeriesNav renders the series label, position, navigation, and ordered list", async () => {
	const rendered = await renderAstroComponent(repoSeriesNavUrl, {
		lang: "en",
		series: {
			label: "2/3: Middle",
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
	assert.match(rendered, /2\/3: Middle/);
	assert.match(rendered, /href="\/posts\/opening\/"/);
	assert.match(rendered, /href="\/posts\/closing\/"/);
	assert.match(rendered, /<ol[\s\S]*<li[\s\S]*1\/3: Opening[\s\S]*<li[\s\S]*2\/3: Middle[\s\S]*<li[\s\S]*3\/3: Closing/);
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
			label: "1/1: Opening",
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
	assert.match(rendered, /data-related-stub/);
	assert.match(rendered, /border-t/);
});

test("post detail pages wire post reading flow before the author and comments footer", async () => {
	const koPage = await readFile(new URL("../src/pages/posts/[...slug].astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/posts/[...slug].astro", import.meta.url), "utf8");

	for (const page of [koPage, enPage]) {
		assert.match(page, /import PostReadingFlow from .*\/components\/PostReadingFlow\.astro";/);
		assert.match(page, /import \{ getRelativeLocaleUrl \} from "astro:i18n";/);
		assert.match(page, /import \{ getRelatedPosts, getSeriesNavigation \} from .*\/utils\/postReading";/);
		assert.match(page, /const localePosts = sortPostsByDate\([\s\S]*await getCollection\("blog",/);
		assert.match(page, /const seriesNavigation = getSeriesNavigation\(localePosts, post\);/);
		assert.match(page, /const relatedPosts = getRelatedPosts\(localePosts, post\);/);
		assert.match(page, /<PostReadingFlow[\s\S]*series=\{seriesData\}[\s\S]*items=\{relatedItems\}/);
		assert.ok(
			page.indexOf("<PostReadingFlow") < page.indexOf("<AuthorProfile"),
			"post reading flow should render before the author footer",
		);
	}

	assert.match(koPage, /matchesLocale\(id, "ko"\)/);
	assert.match(koPage, /getRelativeLocaleUrl\("ko", `posts\/\$\{stripLocaleFromId\(entry\.id\)\}`\)/);
	assert.match(enPage, /matchesLocale\(id, "en"\)/);
	assert.match(enPage, /getRelativeLocaleUrl\("en", `posts\/\$\{stripLocaleFromId\(entry\.id\)\}`\)/);
});
