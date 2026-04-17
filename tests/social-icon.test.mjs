// tests/social-icon.test.mjs
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoIconUrl = new URL("../src/components/SocialIcon.astro", import.meta.url);
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderIcon(props) {
	const source = await readFile(repoIconUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoIconUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "social-icon-"));
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

		const rewritten = compiled.code.replaceAll(
			"astro/runtime/server/index.js",
			pathToFileURL(runtimeStubPath).href,
		);

		await writeFile(componentPath, rewritten);

		const component = await import(pathToFileURL(componentPath).href);
		const container = await AstroContainer.create();

		return await container.renderToString(component.default, { props });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

test("SocialIcon renders an svg with a data-social-icon hook for every supported type", async () => {
	for (const type of ["github", "email", "linkedin", "instagram"]) {
		const rendered = await renderIcon({ type });
		assert.match(rendered, new RegExp(`data-social-icon="${type}"`), `missing hook for ${type}`);
		assert.match(rendered, /<svg[^>]*aria-hidden="true"/, `svg should be decorative for ${type}`);
	}
});

test("SocialIcon github variant draws the octocat silhouette path", async () => {
	const rendered = await renderIcon({ type: "github" });
	assert.match(rendered, /<path[^>]*d="M12 \.5/);
});

test("SocialIcon email variant draws an envelope", async () => {
	const rendered = await renderIcon({ type: "email" });
	assert.match(rendered, /<rect[^>]*x="3"[^>]*y="5"/);
	assert.match(rendered, /<path[^>]*d="m3 7 9 6 9-6"/);
});

test("SocialIcon linkedin variant draws the in-mark", async () => {
	const rendered = await renderIcon({ type: "linkedin" });
	assert.match(rendered, /<rect[^>]*x="2"[^>]*y="9"[^>]*width="4"/);
	assert.match(rendered, /<path[^>]*d="M9 9h3\.8/);
});

test("SocialIcon instagram variant draws the rounded-square camera", async () => {
	const rendered = await renderIcon({ type: "instagram" });
	assert.match(rendered, /<rect[^>]*x="3"[^>]*y="3"[^>]*rx="5"/);
	assert.match(rendered, /<circle[^>]*cx="12"[^>]*cy="12"[^>]*r="4"/);
	assert.match(rendered, /<circle[^>]*cx="17\.5"[^>]*cy="6\.5"[^>]*r="1"/);
});

test("SocialIcon falls through the optional class prop", async () => {
	const rendered = await renderIcon({ type: "github", class: "h-5 w-5" });
	assert.match(rendered, /class="[^"]*h-5 w-5[^"]*"/);
});
