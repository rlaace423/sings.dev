import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoHomeCategoriesUrl = new URL(
	"../src/components/HomeCategories.astro",
	import.meta.url,
);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const repoBlogUrl = new URL("../src/utils/blog.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderHomeCategories(props) {
	const source = await readFile(repoHomeCategoriesUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoHomeCategoriesUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "home-categories-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const i18nStubPath = join(tempDir, "astro-i18n-stub.ts");
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
		await writeFile(
			i18nStubPath,
			[
				"export const getRelativeLocaleUrl = (locale, path) => `/${locale}/${path}/`;",
				"",
			].join("\n"),
		);

		let rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);
		rewritten = rewritten.replaceAll("astro:i18n", pathToFileURL(i18nStubPath).href);
		rewritten = rewritten.replaceAll("../i18n/ui", repoUiUrl);
		rewritten = rewritten.replaceAll("../utils/blog", repoBlogUrl);

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

const sampleCategories = [
	{ name: "백엔드", count: 4 },
	{ name: "MPC", count: 2 },
	{ name: "인프라", count: 3 },
];

test("HomeCategories renders an eyebrow heading and one row per category in order", async () => {
	const rendered = await renderHomeCategories({
		lang: "ko",
		categories: sampleCategories,
	});
	assert.match(rendered, /<section[^>]*data-home-categories/);
	assert.match(rendered, /카테고리/);
	const first = rendered.indexOf("백엔드");
	const second = rendered.indexOf("MPC");
	const third = rendered.indexOf("인프라");
	assert.ok(first >= 0 && second > first && third > second, "category order broken");
});

test("HomeCategories renders Korean post counts for each category", async () => {
	const rendered = await renderHomeCategories({
		lang: "ko",
		categories: sampleCategories,
	});
	assert.match(rendered, /4개의 글/);
	assert.match(rendered, /2개의 글/);
	assert.match(rendered, /3개의 글/);
});

test("HomeCategories renders English post counts with singular/plural wording", async () => {
	const rendered = await renderHomeCategories({
		lang: "en",
		categories: [
			{ name: "Backend", count: 1 },
			{ name: "MPC", count: 2 },
		],
	});
	assert.match(rendered, /Categories/);
	assert.match(rendered, /1 post[^s]/);
	assert.match(rendered, /2 posts/);
});

test("HomeCategories links each row to the locale-aware category page", async () => {
	const koRendered = await renderHomeCategories({
		lang: "ko",
		categories: sampleCategories,
	});
	assert.match(koRendered, /<a[^>]*href="\/category\/[^"]+"/);

	const enRendered = await renderHomeCategories({
		lang: "en",
		categories: [{ name: "Backend", count: 1 }],
	});
	assert.match(enRendered, /<a[^>]*href="\/en\/category\/backend\/"/);
});

test("HomeCategories renders nothing when the categories array is empty", async () => {
	const rendered = await renderHomeCategories({
		lang: "ko",
		categories: [],
	});
	assert.doesNotMatch(rendered, /data-home-categories/);
});

async function renderHomePage(sourceUrl, posts) {
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
	const homeCategoriesStubPath = join(
		tempDir,
		"src",
		"components",
		"HomeCategories.ts",
	);

	try {
		await mkdir(dirname(layoutStubPath), { recursive: true });
		await mkdir(dirname(homeCategoriesStubPath), { recursive: true });
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

		const homeCategoriesStubCompiled = await transform(
			[
				"---",
				"const { lang = 'ko', categories = [] } = Astro.props;",
				"---",
				'<div',
				'  data-home-categories-stub',
				'  data-lang={lang}',
				'  data-names={categories.map((c) => c.name).join("|")}',
				'  data-counts={categories.map((c) => String(c.count)).join("|")}',
				"/>",
				"",
			].join("\n"),
			{
				filename: join(tempDir, "HomeCategoriesStub.astro"),
				internalURL: "astro/runtime/server/index.js",
			},
		);
		await writeFile(
			homeCategoriesStubPath,
			homeCategoriesStubCompiled.code.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			),
		);

		await writeFile(
			contentStubPath,
			[
				`const posts = JSON.parse(${JSON.stringify(JSON.stringify(posts))}).map((entry) => ({`,
				"  ...entry,",
				"  data: {",
				"    ...entry.data,",
				"    pubDate: new Date(entry.data.pubDate),",
				"  },",
				"}));",
				"export const getCollection = async (_name, filter) =>",
				"  posts.filter((entry) => (filter ? filter(entry) : true));",
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
			["../components/HomeCategories.astro", "../components/HomeCategories.ts"],
			["../../components/HomeCategories.astro", "../../components/HomeCategories.ts"],
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

const koPosts = [
	samplePost("ko/one", "2026-04-10T00:00:00.000Z", "backend"),
	samplePost("ko/two", "2026-04-08T00:00:00.000Z", "infra"),
	samplePost("ko/three", "2026-04-05T00:00:00.000Z", "backend"),
	samplePost("ko/four", "2026-04-01T00:00:00.000Z", "mpc"),
];

const enPosts = [
	samplePost("en/one", "2026-04-11T00:00:00.000Z", "backend"),
	samplePost("en/two", "2026-04-06T00:00:00.000Z", "mpc"),
];

test("ko home page renders HomeCategories between the hero and Recent Posts and drops the 관심사 section", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/index.astro", import.meta.url),
		koPosts,
	);

	assert.match(rendered, /data-home-hero/);
	assert.match(rendered, /data-home-categories-stub/);
	assert.match(rendered, /data-lang="ko"/);
	assert.match(rendered, /data-names="backend\|infra\|mpc"/);
	assert.match(rendered, /data-counts="2\|1\|1"/);
	assert.doesNotMatch(rendered, /관심사/);
	assert.doesNotMatch(rendered, /id="about"/);

	const heroIndex = rendered.indexOf("data-home-hero");
	const categoriesIndex = rendered.indexOf("data-home-categories-stub");
	const postsIndex = rendered.indexOf("id=\"posts\"");
	assert.ok(
		heroIndex < categoriesIndex && categoriesIndex < postsIndex,
		"HomeCategories should sit between the hero and the Recent Posts section",
	);
});

test("en home page renders HomeCategories between the hero and Recent Posts and drops the Focus section", async () => {
	const rendered = await renderHomePage(
		new URL("../src/pages/en/index.astro", import.meta.url),
		enPosts,
	);

	assert.match(rendered, /data-home-hero/);
	assert.match(rendered, /data-home-categories-stub/);
	assert.match(rendered, /data-lang="en"/);
	assert.match(rendered, /data-names="backend\|mpc"/);
	assert.match(rendered, /data-counts="1\|1"/);
	assert.doesNotMatch(rendered, />\s*Focus\s*</);
	assert.doesNotMatch(rendered, /id="about"/);

	const heroIndex = rendered.indexOf("data-home-hero");
	const categoriesIndex = rendered.indexOf("data-home-categories-stub");
	const postsIndex = rendered.indexOf("id=\"posts\"");
	assert.ok(
		heroIndex < categoriesIndex && categoriesIndex < postsIndex,
		"HomeCategories should sit between the hero and the Recent Posts section",
	);
});
