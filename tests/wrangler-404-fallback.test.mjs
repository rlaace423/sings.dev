import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stripJsoncComments = (source) =>
	source
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/(^|[^:])\/\/.*$/gm, "$1");

test("wrangler.jsonc tells Cloudflare to serve the built dist/404.html for missing assets", async () => {
	const raw = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
	const config = JSON.parse(stripJsoncComments(raw));

	assert.equal(
		config.assets?.not_found_handling,
		"404-page",
		"Without not_found_handling=404-page, Cloudflare returns its built-in 404 instead of the project's custom 404.html",
	);
	assert.equal(
		config.assets?.directory,
		"./dist",
		"Asset directory must still point at ./dist so the 404.html that Astro emits is the one being served",
	);
});
