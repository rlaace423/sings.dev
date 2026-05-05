import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { transform } from "@astrojs/compiler";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

const repoLightboxUrl = new URL(
	"../src/components/PostImageLightbox.astro",
	import.meta.url,
);
const repoUiUrl = new URL("../src/i18n/ui.ts", import.meta.url).href;
const astroRuntimeUrl = new URL(
	"../node_modules/astro/dist/runtime/server/index.js",
	import.meta.url,
).href;

async function renderLightbox(props) {
	const source = await readFile(repoLightboxUrl, "utf8");
	const compiled = await transform(source, {
		filename: repoLightboxUrl.pathname,
		internalURL: "astro/runtime/server/index.js",
	});

	const tempDir = await mkdtemp(join(tmpdir(), "post-lightbox-"));
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

test("PostImageLightbox renders a hidden dialog shell with the right ARIA", async () => {
	const rendered = await renderLightbox({ lang: "ko" });

	assert.match(rendered, /<div[^>]*data-post-lightbox/);
	assert.match(rendered, /aria-hidden="true"/);
	assert.match(rendered, /\binert\b/);
	assert.match(rendered, /class="[^"]*hidden/);
	assert.match(rendered, /role="dialog"/);
	assert.match(rendered, /aria-modal="true"/);
});

test("PostImageLightbox renders a backdrop button, an image holder, a caption, and a close button (ko labels)", async () => {
	const rendered = await renderLightbox({ lang: "ko" });

	assert.match(rendered, /<button[^>]*data-post-lightbox-backdrop/);
	assert.match(rendered, /<img[^>]*data-post-lightbox-image/);
	assert.match(rendered, /<figcaption[^>]*data-post-lightbox-caption/);
	assert.match(rendered, /<button[^>]*data-post-lightbox-close[^>]*aria-label="확대 닫기"/);
	assert.match(rendered, /aria-label="확대된 이미지"/);
});

test("PostImageLightbox uses the English labels when lang=en", async () => {
	const rendered = await renderLightbox({ lang: "en" });

	assert.match(
		rendered,
		/<button[^>]*data-post-lightbox-close[^>]*aria-label="Close zoomed image"/,
	);
	assert.match(rendered, /aria-label="Expanded image"/);
});

test("PostImageLightbox embeds the activation script behind a window guard", async () => {
	const rendered = await renderLightbox({ lang: "ko" });

	assert.match(rendered, /window\.__postImageLightboxInit/);
	assert.match(rendered, /article \.prose-site/);
});
