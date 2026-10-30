// tests/about-identity.test.mjs
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler-rs";
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
	name: "Sam (김상호)",
	summary: "백엔드 구조와 MPC 시스템을 씁니다.",
	photo: { src: "/avatar-placeholder.png", alt: "Sam의 사진" },
	socials: [
		{ type: "github", href: "https://github.com/example", label: "GitHub" },
		{ type: "email", href: "mailto:hello@example.com", label: "Email" },
		{ type: "linkedin", href: "https://linkedin.com/in/example", label: "LinkedIn" },
		{ type: "instagram", href: "https://instagram.com/example", label: "Instagram" },
	],
	education: [
		{
			school: "연세대학교 인공지능융합대학원",
			degree: "인공지능컴퓨팅 석사 · 재학중",
		},
		{
			school: "중앙대학교",
			degree: "컴퓨터공학부 · 학사",
			description: "GPA 3.98/4.5",
		},
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

test("AboutIdentity renders the name as a top-level h1 page heading", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	assert.match(
		rendered,
		/<h1[^>]*data-about-name[^>]*>[\s\S]*Sam \(김상호\)[\s\S]*<\/h1>/,
	);
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

test("AboutIdentity renders an ordered education list with preserved order and optional description", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	assert.match(rendered, /<ol[^>]*data-about-education[^>]*>/);
	const firstSchool = rendered.indexOf("연세대학교 인공지능융합대학원");
	const secondSchool = rendered.indexOf("중앙대학교");
	assert.ok(
		firstSchool >= 0 && secondSchool > firstSchool,
		"education order broken",
	);
	assert.match(rendered, /인공지능컴퓨팅 석사 · 재학중/);
	assert.match(rendered, /GPA 3\.98\/4\.5/);
});

test("AboutIdentity omits the education section when no entries are given", async () => {
	const rendered = await renderAboutIdentity({ ...baseProps(), education: [] });
	assert.doesNotMatch(rendered, /data-about-education/);
});

test("AboutIdentity renders 학력 above 경력 so education sits at the same heading level as experience and comes first", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	const educationIndex = rendered.indexOf("data-about-education");
	const experienceIndex = rendered.indexOf("data-about-experience");
	assert.ok(
		educationIndex >= 0 && experienceIndex > educationIndex,
		"education must render before experience",
	);
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

test("AboutIdentity uses Korean section headings for ko (학력 / 경력) and English ones for en (Education / Experience)", async () => {
	const ko = await renderAboutIdentity({ ...baseProps(), lang: "ko" });
	const en = await renderAboutIdentity({ ...baseProps(), lang: "en" });
	assert.match(ko, /학력/);
	assert.match(ko, /경력/);
	assert.match(en, /Education/);
	assert.match(en, /Experience/);
});

test("AboutIdentity renders 학력 / 경력 as proper h2 section headings, not as small eyebrow labels", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	assert.match(rendered, /<h2[^>]*class="[^"]*text-2xl[^"]*"[^>]*>\s*학력\s*<\/h2>/);
	assert.match(rendered, /<h2[^>]*class="[^"]*text-2xl[^"]*"[^>]*>\s*경력\s*<\/h2>/);
});

test("AboutIdentity marks external social links with rel=me noopener and leaves mailto bare", async () => {
	const rendered = await renderAboutIdentity(baseProps());
	assert.match(rendered, /<a href="https:\/\/github\.com\/example"[^>]*rel="me noopener"/);
	assert.match(rendered, /<a href="https:\/\/linkedin\.com\/in\/example"[^>]*rel="me noopener"/);
	assert.match(rendered, /<a href="https:\/\/instagram\.com\/example"[^>]*rel="me noopener"/);
	assert.doesNotMatch(rendered, /<a href="mailto:hello@example.com"[^>]*rel=/);
});

