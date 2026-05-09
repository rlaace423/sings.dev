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
