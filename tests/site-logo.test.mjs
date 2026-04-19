import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoLogoUrl = new URL("../src/components/SiteLogo.astro", import.meta.url);
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderLogo(props) {
	const source = await readFile(repoLogoUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoLogoUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "site-logo-"));
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

test("SiteLogo renders an aria-hidden svg with a data-site-logo hook", async () => {
	const rendered = await renderLogo({});
	assert.match(rendered, /<svg[^>]*data-site-logo/);
	assert.match(rendered, /<svg[^>]*aria-hidden="true"/);
	assert.match(rendered, /<svg[^>]*viewBox="0 0 24 24"/);
	assert.match(rendered, /<svg[^>]*stroke="currentColor"/);
});

test("SiteLogo draws the vocal microphone silhouette (ellipse grille and rounded handle)", async () => {
	const rendered = await renderLogo({});
	assert.match(rendered, /<ellipse[^>]*cx="12"[^>]*cy="7\.5"[^>]*rx="5"[^>]*ry="5\.5"/);
	assert.match(rendered, /<rect[^>]*x="9"[^>]*y="13"[^>]*width="6"[^>]*height="9"[^>]*rx="2\.2"/);
	assert.match(rendered, /<line[^>]*x1="7\.5"[^>]*y1="6"[^>]*x2="16\.5"[^>]*y2="6"/);
	assert.match(rendered, /<line[^>]*x1="7\.5"[^>]*y1="9"[^>]*x2="16\.5"[^>]*y2="9"/);
});

test("SiteLogo uses the default responsive size when no class prop is given", async () => {
	const rendered = await renderLogo({});
	assert.match(rendered, /class="[^"]*h-4[^"]*w-4[^"]*sm:h-5[^"]*sm:w-5/);
});

test("SiteLogo replaces the default class when an explicit class prop is provided", async () => {
	const rendered = await renderLogo({ class: "h-6 w-6 text-sky-500" });
	assert.match(rendered, /class="[^"]*h-6 w-6 text-sky-500/);
	assert.doesNotMatch(rendered, /class="[^"]*h-4 w-4 sm:h-5 sm:w-5/);
});
