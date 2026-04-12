import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const repoBlogUrl = new URL("../src/utils/blog.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderPostHeader(props) {
	const source = await readFile(
		new URL("../src/components/PostHeader.astro", import.meta.url),
		"utf8",
	);
	const compiled = await transform(source, {
		filename: "/Users/sam/WebstormProjects/sings.dev/src/components/PostHeader.astro",
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "post-header-"));
	const runtimeStubPath = join(tempDir, "astro-runtime-stub.ts");
	const stubPath = join(tempDir, "astro-i18n-stub.ts");
	const blogStubPath = join(tempDir, "blog-stub.ts");
	const componentPath = join(tempDir, "PostHeader.ts");

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
			stubPath,
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

		const rewritten = compiled.code
			.replaceAll(
				"astro/runtime/server/index.js",
				pathToFileURL(runtimeStubPath).href,
			)
			.replaceAll("astro:i18n", pathToFileURL(stubPath).href)
			.replaceAll("../i18n/ui", repoUiUrl)
			.replaceAll("../utils/blog", pathToFileURL(blogStubPath).href);

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
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
		/<header class="space-y-6 border-b border-stone-200 pb-10 dark:border-stone-800">/,
	);
	assert.match(
		rendered,
		/<div class="flex flex-wrap items-center gap-x-3 gap-y-2[^"]*">[\s\S]*<a href="\/en\/category\/guides"[^>]*>\s*Guides\s*<\/a>[\s\S]*<time datetime="2024-01-02">2024-01-02<\/time>[\s\S]*<p>7 min read<\/p>[\s\S]*<\/div>/,
	);
	assert.match(
		rendered,
		/<div class="space-y-4">[\s\S]*<h1 class="text-4xl font-semibold tracking-tight text-stone-950 dark:text-stone-50 sm:text-5xl">[\s\S]*Post Header[\s\S]*<\/h1>[\s\S]*<p class="max-w-2xl text-lg leading-8 text-stone-600 dark:text-stone-300">[\s\S]*A short intro for readers\.[\s\S]*<\/p>[\s\S]*<\/div>/,
	);
	assert.match(
		rendered,
		/<ul class="flex flex-wrap gap-2">[\s\S]*<a href="\/en\/tags\/astro"[^>]*>\s*#astro\s*<\/a>[\s\S]*<a href="\/en\/tags\/testing"[^>]*>\s*#testing\s*<\/a>[\s\S]*<\/ul>/,
	);
});
