import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
