/**
 * Build-time OG image generator.
 *
 * Routes:
 *   /og/ko/<slug>.png  →  per-post card for Korean post
 *   /og/en/<slug>.png  →  per-post card for English post
 *   /og/default.png    →  site-wide fallback
 *
 * Astro runs `getStaticPaths` once at build, fans out to GET for each entry,
 * and writes the returned PNG bytes to `dist/og/.../*.png`. At runtime
 * Cloudflare just serves the static files — no SSR needed.
 *
 * Font loading: Satori only accepts TTF/OTF/WOFF (no WOFF2) and chokes on
 * variable fonts with complex fvar tables, so we ship static OTFs under
 * `src/assets/fonts/` for build-time use only. The browser still gets the
 * lighter WOFF2 variable font from `public/fonts/`.
 */

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";
import {
	formatDate,
	getDisplayTitle,
	isVisiblePost,
	matchesLocale,
	stripLocaleFromId,
} from "../../utils/blog";
import { buildOGCard, type OGCardInput } from "../../utils/ogTemplate";
import { locales, type Locale } from "../../i18n/ui";

type RouteProps =
	| { kind: "post"; card: OGCardInput }
	| { kind: "default"; lang: Locale };

const FONT_DIR = path.resolve("src/assets/fonts");

let cachedFonts: Awaited<ReturnType<typeof loadFonts>> | null = null;
async function loadFonts() {
	const [pretendardRegular, pretendardBold, monoRegular, monoBold] = await Promise.all([
		fs.readFile(path.join(FONT_DIR, "Pretendard-Regular.otf")),
		fs.readFile(path.join(FONT_DIR, "Pretendard-Bold.otf")),
		fs.readFile(path.join(FONT_DIR, "JetBrainsMono-Regular.ttf")),
		fs.readFile(path.join(FONT_DIR, "JetBrainsMono-Bold.ttf")),
	]);
	// JetBrains Mono comes first in the array so Satori prefers it for any
	// glyph it covers (Latin, digits, punctuation). Pretendard handles the
	// rest — primarily Hangul in localized categories like "블로그".
	return [
		{ name: "JetBrains Mono", data: monoRegular, weight: 400 as const, style: "normal" as const },
		{ name: "JetBrains Mono", data: monoBold, weight: 700 as const, style: "normal" as const },
		{ name: "Pretendard", data: pretendardRegular, weight: 400 as const, style: "normal" as const },
		{ name: "Pretendard", data: pretendardBold, weight: 700 as const, style: "normal" as const },
	];
}

async function getFonts() {
	if (!cachedFonts) cachedFonts = await loadFonts();
	return cachedFonts;
}

export async function getStaticPaths() {
	const posts = await getCollection("blog", isVisiblePost);

	const postPaths = posts.flatMap((post) => {
		const locale = locales.find((l) => matchesLocale(post.id, l));
		if (!locale) return [];

		const slug = stripLocaleFromId(post.id);
		const card: OGCardInput = {
			title: getDisplayTitle(post),
			category: post.data.category,
			date: formatDate(post.data.pubDate),
			lang: locale,
		};

		return [{
			params: { path: `${locale}/${slug}` },
			props: { kind: "post", card } satisfies RouteProps,
		}];
	});

	// Site-wide fallback used by home, archives, tag/category indexes, etc.
	// One per locale — symmetric with the post URL pattern.
	const defaultPaths = locales.map((lang) => ({
		params: { path: `${lang}/default` },
		props: { kind: "default", lang } satisfies RouteProps,
	}));

	return [...postPaths, ...defaultPaths];
}

const defaultCard = (lang: Locale): OGCardInput => ({
	// Motto-only headline. The site brand mark sits at the bottom of the
	// card and the domain appears in the share's URL meta, so repeating
	// "sings.dev —" up here would just be a label. The motto stands alone.
	title:
		lang === "ko"
			? "도전과 성취를 즐깁니다."
			: "I enjoy the climb and the summit.",
	// Category column is English across all cards (post frontmatter uses
	// English categories too) — keep the default consistent.
	category: "Blog",
	date: formatDate(new Date()),
	lang,
});

export const GET: APIRoute = async ({ props }) => {
	const route = props as RouteProps;
	const card = route.kind === "post" ? route.card : defaultCard(route.lang);

	const fonts = await getFonts();

	const svg = await satori(buildOGCard(card), {
		width: 1200,
		height: 630,
		fonts,
	});

	const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
		.render()
		.asPng();

	return new Response(new Uint8Array(png), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
