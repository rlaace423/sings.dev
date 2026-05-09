// tests/home-identity.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoHomeIdentityUrl = new URL(
	"../src/components/HomeIdentity.astro",
	import.meta.url,
);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderHomeIdentity(props) {
	const source = await readFile(repoHomeIdentityUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoHomeIdentityUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "home-identity-"));
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
	tagline: "도전과 성취를 즐깁니다.",
	name: "김상호 (Sam Kim)",
	summary: "백엔드와 인프라를 다룹니다.",
	socials: [
		{ type: "github", href: "https://github.com/example", label: "GitHub" },
		{ type: "email", href: "mailto:hello@example.com", label: "Email" },
		{ type: "linkedin", href: "https://linkedin.com/in/example", label: "LinkedIn" },
		{ type: "instagram", href: "https://instagram.com/example", label: "Instagram" },
	],
});

test("HomeIdentity renders the tagline as a top-level h1", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	assert.match(
		rendered,
		/<h1[^>]*data-home-tagline[^>]*>[\s\S]*도전과 성취를 즐깁니다\.[\s\S]*<\/h1>/,
	);
});

test("HomeIdentity renders the name in its own hook below h1, not as a heading", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	assert.match(
		rendered,
		/<p[^>]*data-home-author-name[^>]*>[\s\S]*김상호 \(Sam Kim\)[\s\S]*<\/p>/,
	);
});

test("HomeIdentity renders the summary in its own hook with the prose-comfort body size", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	assert.match(
		rendered,
		/<p[^>]*data-home-author-summary[^>]*class="[^"]*text-lg[^"]*leading-8[^"]*"[^>]*>[\s\S]*백엔드와 인프라를 다룹니다\./,
	);
});

test("HomeIdentity renders the tagline before the name, and the name before the summary", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	const taglineIndex = rendered.indexOf("data-home-tagline");
	const nameIndex = rendered.indexOf("data-home-author-name");
	const summaryIndex = rendered.indexOf("data-home-author-summary");
	assert.ok(
		taglineIndex >= 0 && nameIndex > taglineIndex && summaryIndex > nameIndex,
		"home identity order broken: tagline -> name -> summary",
	);
});

test("HomeIdentity renders one icon-only social link per entry, in order, with aria-label and no visible label text", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	const order = ["github", "email", "linkedin", "instagram"];
	const stubIndexes = order.map((type) =>
		rendered.indexOf(`data-social-icon-stub="${type}"`),
	);
	stubIndexes.forEach((index, i) => {
		assert.ok(index >= 0, `missing icon stub for ${order[i]}`);
	});
	for (let i = 1; i < stubIndexes.length; i++) {
		assert.ok(
			stubIndexes[i - 1] < stubIndexes[i],
			`social order broken between ${order[i - 1]} and ${order[i]}`,
		);
	}
	assert.match(rendered, /<a[^>]*href="https:\/\/github\.com\/example"[^>]*aria-label="GitHub"/);
	assert.match(rendered, /<a[^>]*href="mailto:hello@example.com"[^>]*aria-label="Email"/);
	assert.match(rendered, /<a[^>]*href="https:\/\/linkedin\.com\/in\/example"[^>]*aria-label="LinkedIn"/);
	assert.match(rendered, /<a[^>]*href="https:\/\/instagram\.com\/example"[^>]*aria-label="Instagram"/);
	assert.doesNotMatch(rendered, /<span[^>]*>\s*GitHub\s*<\/span>/);
});

test("HomeIdentity marks external social links rel=me noopener and leaves mailto bare", async () => {
	const rendered = await renderHomeIdentity(baseProps());
	assert.match(rendered, /<a[^>]*href="https:\/\/github\.com\/example"[^>]*rel="me noopener"/);
	assert.match(rendered, /<a[^>]*href="https:\/\/linkedin\.com\/in\/example"[^>]*rel="me noopener"/);
	assert.match(rendered, /<a[^>]*href="https:\/\/instagram\.com\/example"[^>]*rel="me noopener"/);
	assert.doesNotMatch(rendered, /<a[^>]*href="mailto:hello@example.com"[^>]*rel=/);
});

test("HomeIdentity uses Korean ul aria-label for ko and English for en", async () => {
	const ko = await renderHomeIdentity({ ...baseProps(), lang: "ko" });
	const en = await renderHomeIdentity({ ...baseProps(), lang: "en" });
	assert.match(ko, /<ul[^>]*aria-label="연락처와 프로필"/);
	assert.match(en, /<ul[^>]*aria-label="Contact and profiles"/);
});

test("HomeIdentity omits the socials list entirely when the array is empty", async () => {
	const rendered = await renderHomeIdentity({ ...baseProps(), socials: [] });
	assert.doesNotMatch(rendered, /data-home-socials/);
	assert.doesNotMatch(rendered, /<ul[^>]*aria-label="연락처와 프로필"/);
});
