// Contract between the optimized images the build emits and the <picture>
// markup that offers them. `src/utils/integrationImageOptimization.ts`
// transcodes every WebP in `dist/_astro/` to an AVIF sibling after the build
// and lists that AVIF first in `<picture>`, so every AVIF-capable browser
// shows the AVIF. These tests hold the one property that makes that safe: an
// AVIF `<source>` must be a faithful stand-in for the WebP it replaces.
//
// Regression guarded: the Sierpinski zoom in purpose-driven-systems is a
// four-frame GIF. Astro keeps all frames when it emits the WebP, but the
// AVIF transcode read only the first frame, so the post showed a still image
// in every modern browser while the lightbox (which copies the WebP srcset)
// animated. sharp cannot encode animated AVIF, so animated images must simply
// not get an AVIF sibling.
//
// `sharp` is the module the integration itself uses (it ships with Astro's
// image service); it is read here for frame counts only.
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { allRoutes, distDir, loadPage } from "./helpers/dist.mjs";

const astroDir = join(distDir, "_astro");

/** URLs of every candidate in a srcset ("/_astro/a.avif 160w, /_astro/b.avif 400w"). */
const srcsetUrls = (srcset) =>
	srcset
		.split(",")
		.map((candidate) => candidate.trim().split(/\s+/)[0])
		.filter(Boolean);

const fileFor = (url) => join(distDir, url.split(/[?#]/)[0].replace(/^\//, ""));

const frameCache = new Map();
function frameCount(file) {
	if (!frameCache.has(file)) {
		frameCache.set(
			file,
			sharp(file, { animated: true })
				.metadata()
				.then((metadata) => metadata.pages ?? 1),
		);
	}
	return frameCache.get(file);
}

/** Every AVIF `<source>` candidate in the build, with the page that offers it. */
function avifCandidates() {
	const candidates = [];
	for (const route of allRoutes()) {
		const { root } = loadPage(route);
		for (const source of root.querySelectorAll('picture source[type="image/avif"]')) {
			for (const url of srcsetUrls(source.getAttribute("srcset") ?? "")) {
				candidates.push({ route, url });
			}
		}
	}
	return candidates;
}

test("every AVIF candidate offered in a <picture> exists in dist", () => {
	const missing = avifCandidates()
		.filter(({ url }) => !existsSync(fileFor(url)))
		.map(({ route, url }) => `${route} → ${url}`);
	assert.deepEqual(missing, [], `AVIF sources pointing at files that were never written:\n${missing.join("\n")}`);
});

test("every AVIF candidate has the same frame count as the WebP it replaces", async () => {
	const mismatches = [];
	for (const { route, url } of avifCandidates()) {
		const avifFile = fileFor(url);
		const webpFile = avifFile.replace(/\.avif$/, ".webp");
		if (!existsSync(avifFile) || !existsSync(webpFile)) continue; // reported by the test above
		const [avifFrames, webpFrames] = await Promise.all([frameCount(avifFile), frameCount(webpFile)]);
		if (avifFrames !== webpFrames) {
			mismatches.push(`${route} → ${url}: AVIF has ${avifFrames} frame(s), WebP has ${webpFrames}`);
		}
	}
	assert.deepEqual(
		mismatches,
		[],
		`AVIF sources that would show a different image than their WebP:\n${mismatches.join("\n")}`,
	);
});

test("animated WebP images get no AVIF sibling", async () => {
	const offenders = [];
	for (const name of readdirSync(astroDir).filter((entry) => entry.endsWith(".webp"))) {
		if ((await frameCount(join(astroDir, name))) <= 1) continue;
		const avifName = name.replace(/\.webp$/, ".avif");
		if (existsSync(join(astroDir, avifName))) offenders.push(`${name} → ${avifName}`);
	}
	assert.deepEqual(
		offenders,
		[],
		`animated WebPs with an AVIF sibling (sharp encodes only the first frame):\n${offenders.join("\n")}`,
	);
});
