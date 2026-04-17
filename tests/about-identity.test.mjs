// tests/about-identity.test.mjs
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
