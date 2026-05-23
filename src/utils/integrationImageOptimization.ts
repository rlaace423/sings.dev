/**
 * Two-phase post-build image optimization run from `astro:build:done`:
 *
 * Phase 1 — AVIF generation
 *   Iterate every `.webp` file Astro emits to `dist/_astro/` and produce
 *   an `.avif` sibling alongside it. Filename = same hash as the WebP +
 *   `.avif` extension so the markup rewriter can derive AVIF URLs by
 *   simple extension swap.
 *
 *   We transcode WebP → AVIF rather than running both formats off the
 *   original source because Astro's image pipeline doesn't expose a way to
 *   request additional output formats for markdown images. The
 *   WebP-as-source path is mildly lossier in theory but visually
 *   indistinguishable at the quality levels used here.
 *
 * Phase 2 — HTML rewrite
 *   Walk every `.html` file in `dist/`, find each `<img src="/_astro/*.webp">`
 *   that isn't already inside a `<picture>` (Mermaid output is), and wrap
 *   it in `<picture>` with an AVIF `<source>` first, a WebP `<source>`
 *   second, then the original `<img>` as the fallback. Modern browsers
 *   pick AVIF; older ones fall through to WebP; ancient ones see the
 *   bare `<img>`.
 *
 *   The first qualifying `<img>` per HTML file is additionally marked as
 *   the LCP candidate: `loading="eager"` + `fetchpriority="high"`. This
 *   image is almost always above the fold on this blog (PostHeader →
 *   first paragraph → first illustration), so eager-loading shaves
 *   ~0.3–0.5s off mobile LCP.
 *
 * Why this lives in `astro:build:done` and not in a rehype plugin:
 *   Astro's image processor runs AFTER rehype, so at rehype time `<img>`
 *   tags still carry the original markdown-relative URLs (`./foo.webp`)
 *   rather than the optimized `/_astro/*.webp` URLs we need to match.
 *   Post-build is the only place where the optimized markup is final.
 */

import type { AstroIntegration } from "astro";
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { parse, type HTMLElement } from "node-html-parser";

interface ImageOptimizationOptions {
	/** AVIF quality 0–100. Sharp default is 50; 60 is closer to "looks the same". */
	avifQuality?: number;
	/** AVIF encoding effort 0–9. Higher = slower encode, smaller output. */
	avifEffort?: number;
}

/**
 * The optimized `<img>` URL Astro emits is `/_astro/<basename>.<hash>.webp`.
 * We only touch these — external images, SVGs, and Mermaid-generated
 * `<picture>` blocks are skipped.
 */
const ASTRO_WEBP = /^\/_astro\/[^"]+\.webp(\?.*)?$/;

async function generateAvifSiblings(
	astroDir: string,
	quality: number,
	effort: number,
	log: (msg: string) => void,
): Promise<void> {
	const webpFiles = readdirSync(astroDir).filter((f) => f.endsWith(".webp"));
	if (webpFiles.length === 0) {
		log("AVIF: no .webp files to transcode.");
		return;
	}

	const startedAt = Date.now();
	let totalWebp = 0;
	let totalAvif = 0;
	let generated = 0;
	let skipped = 0;

	const concurrency = 4;
	const queue = [...webpFiles];

	async function worker(): Promise<void> {
		while (queue.length > 0) {
			const webpName = queue.shift();
			if (!webpName) return;
			const avifName = webpName.replace(/\.webp$/, ".avif");
			const webpPath = path.join(astroDir, webpName);
			const avifPath = path.join(astroDir, avifName);

			if (existsSync(avifPath)) {
				skipped += 1;
				continue;
			}

			try {
				const webpBuffer = readFileSync(webpPath);
				const avifBuffer = await sharp(webpBuffer)
					.avif({ quality, effort })
					.toBuffer();
				writeFileSync(avifPath, avifBuffer);
				totalWebp += webpBuffer.length;
				totalAvif += avifBuffer.length;
				generated += 1;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				log(`AVIF: failed ${webpName} — ${message}`);
			}
		}
	}

	await Promise.all(Array.from({ length: concurrency }, () => worker()));

	const elapsedMs = Date.now() - startedAt;
	const savings = totalWebp ? Math.round(((totalWebp - totalAvif) / totalWebp) * 100) : 0;
	log(
		`AVIF: ${generated} generated (${skipped} skipped), ` +
			`${(totalAvif / 1024).toFixed(0)}KiB total, -${savings}% vs WebP, ${elapsedMs}ms`,
	);
}

/**
 * Walk a parsed HTML tree, wrap qualifying `<img>` elements in
 * `<picture>` markup and tag the first one as the LCP candidate.
 * Returns true if any modification was made.
 */
function rewriteImagesInDocument(root: HTMLElement): boolean {
	const imgs = root.querySelectorAll("img");
	if (imgs.length === 0) return false;

	let firstOptimizedSeen = false;
	let touched = false;

	for (const img of imgs) {
		const src = img.getAttribute("src") ?? "";
		if (!ASTRO_WEBP.test(src)) continue;

		// Skip if already wrapped (Mermaid output, etc.)
		if (img.parentNode && (img.parentNode as HTMLElement).tagName === "PICTURE") {
			continue;
		}

		// Mark the very first qualifying image as the LCP candidate.
		if (!firstOptimizedSeen) {
			firstOptimizedSeen = true;
			img.setAttribute("loading", "eager");
			img.setAttribute("fetchpriority", "high");
			img.setAttribute("data-lcp-candidate", "true");
		}

		const srcset = img.getAttribute("srcset");
		const sizes = img.getAttribute("sizes");

		// Build the <picture> wrapper as raw HTML. node-html-parser doesn't
		// expose a clean DOM API for wrapping, but its replaceWith on raw
		// markup works reliably.
		const avifSrcset = srcset
			? srcset.replace(/\.webp(\s|,|$)/g, ".avif$1")
			: src.replace(/\.webp(\?.*)?$/, ".avif$1");
		const webpSrcset = srcset ?? src;
		const sizesAttr = sizes ? ` sizes="${escapeAttr(sizes)}"` : "";

		const picture =
			`<picture>` +
			`<source type="image/avif" srcset="${escapeAttr(avifSrcset)}"${sizesAttr}>` +
			`<source type="image/webp" srcset="${escapeAttr(webpSrcset)}"${sizesAttr}>` +
			img.outerHTML +
			`</picture>`;

		img.replaceWith(picture);
		touched = true;
	}

	return touched;
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function walkHtmlFiles(dir: string, visit: (filePath: string) => void): void {
	for (const entry of readdirSync(dir)) {
		const fullPath = path.join(dir, entry);
		const st = statSync(fullPath);
		if (st.isDirectory()) {
			walkHtmlFiles(fullPath, visit);
		} else if (entry.endsWith(".html")) {
			visit(fullPath);
		}
	}
}

function rewriteHtmlFiles(distDir: string, log: (msg: string) => void): void {
	const startedAt = Date.now();
	let visited = 0;
	let modified = 0;
	let pictureCount = 0;
	let lcpCount = 0;

	walkHtmlFiles(distDir, (filePath) => {
		visited += 1;
		const html = readFileSync(filePath, "utf8");
		const root = parse(html, { comment: true, voidTag: { tags: ["img", "source", "link", "meta", "br", "hr", "input"] } });
		const touched = rewriteImagesInDocument(root);
		if (!touched) return;

		modified += 1;
		const rewritten = root.toString();
		// Crude but fine for stats: count picture and LCP markers in the
		// rewritten document.
		pictureCount += (rewritten.match(/<picture>/g) ?? []).length;
		lcpCount += (rewritten.match(/data-lcp-candidate/g) ?? []).length;
		writeFileSync(filePath, rewritten);
	});

	log(
		`HTML rewrite: ${modified}/${visited} files modified, ` +
			`${pictureCount} <picture> total, ${lcpCount} LCP markers, ${Date.now() - startedAt}ms`,
	);
}

export default function imageOptimization(
	options: ImageOptimizationOptions = {},
): AstroIntegration {
	const avifQuality = options.avifQuality ?? 60;
	const avifEffort = options.avifEffort ?? 4;

	return {
		name: "sings-dev:image-optimization",
		hooks: {
			"astro:build:done": async ({ dir, logger }) => {
				const distDir = dir.pathname;
				const astroDir = path.join(distDir, "_astro");
				const log = (msg: string) => logger.info(msg);

				if (!existsSync(astroDir)) {
					logger.warn(`Image opt: ${astroDir} not found, skipping.`);
					return;
				}

				await generateAvifSiblings(astroDir, avifQuality, avifEffort, log);
				rewriteHtmlFiles(distDir, log);
			},
		},
	};
}
