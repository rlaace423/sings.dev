import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoSummaryUrl = new URL("../src/components/PostSummary.astro", import.meta.url);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderSummary(props) {
	const source = await readFile(repoSummaryUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoSummaryUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "post-summary-"));
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
		rewritten = rewritten.replaceAll("../i18n/ui", repoUiUrl);

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

test("PostSummary renders nothing when summary is undefined", async () => {
	const rendered = await renderSummary({ lang: "ko" });
	assert.doesNotMatch(rendered, /data-post-summary/);
});

test("PostSummary renders nothing when summary is an empty string", async () => {
	const rendered = await renderSummary({ lang: "ko", summary: "" });
	assert.doesNotMatch(rendered, /data-post-summary/);
});

test("PostSummary renders the Korean label and body when summary is set", async () => {
	const rendered = await renderSummary({
		lang: "ko",
		summary: "이 글은 IAM 정책을 설계할 때 검토해야 하는 항목들을 짧게 정리합니다.",
	});
	assert.match(rendered, /<section[^>]*data-post-summary/);
	assert.match(rendered, /요약/);
	assert.match(rendered, /IAM 정책을 설계할 때/);
});

test("PostSummary renders the English label for en locale", async () => {
	const rendered = await renderSummary({
		lang: "en",
		summary: "A short checklist for reviewing IAM policy boundaries.",
	});
	assert.match(rendered, /<section[^>]*data-post-summary/);
	assert.match(rendered, /Summary/);
	assert.match(rendered, /A short checklist for reviewing IAM policy boundaries\./);
});

test("PostSummary carries the quiet editorial treatment classes", async () => {
	const rendered = await renderSummary({ lang: "ko", summary: "짧은 요약." });
	assert.match(rendered, /border-l-2/);
	assert.match(rendered, /border-stone-400/);
	assert.match(rendered, /dark:border-night-500/);
	assert.match(rendered, /text-stone-700/);
	assert.match(rendered, /dark:text-night-200/);
});
