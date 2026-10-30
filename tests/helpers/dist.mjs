// Readers for the production build in `dist/`.
//
// Page-level structure tests used to compile `.astro` pages themselves with a
// hand-maintained list of stubbed imports, which broke every time a page gained
// a dependency (14 tests went red when `utils/jsonLd` was added). Reading the
// built HTML instead tests what readers actually get and needs no stubs; the
// trade-off is that `npm run build` has to run first.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

export const distDir = fileURLToPath(new URL("../../dist/", import.meta.url));

/** `/posts/foo/` → `dist/posts/foo/index.html`, `/404.html` → `dist/404.html`. */
export function distPath(route) {
	const clean = route.split(/[?#]/)[0];
	const rel = clean.endsWith("/") ? `${clean}index.html` : clean;
	return join(distDir, rel.replace(/^\//, ""));
}

export const routeExists = (route) => existsSync(distPath(route));

const cache = new Map();

export function loadPage(route) {
	const cached = cache.get(route);
	if (cached) return cached;
	const file = distPath(route);
	if (!existsSync(file)) {
		throw new Error(
			`${file} is missing. These tests read the production build; run \`npm run build\` first.`,
		);
	}
	const html = readFileSync(file, "utf8");
	const root = parse(html);
	const main = root.querySelector("main");
	if (!main) throw new Error(`${route}: no <main> element in the built page`);
	const page = { route, html, root, main };
	cache.set(route, page);
	return page;
}

export const textOf = (node) => (node ? node.text.replace(/\s+/g, " ").trim() : null);

export const attr = (node, name) => (node ? (node.getAttribute(name) ?? null) : null);

/** Nearest ancestor with the given tag name (node-html-parser has no `closest` for tags). */
export function closestTag(node, tagName) {
	const wanted = tagName.toUpperCase();
	for (let current = node?.parentNode; current; current = current.parentNode) {
		if (current.tagName === wanted) return current;
	}
	return null;
}

/** Every built HTML page as a route, including the standalone 404 document. */
export function allRoutes() {
	const routes = [];
	const walk = (dir) => {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) {
				if (entry === "pagefind" || entry === "_astro") continue;
				walk(full);
			} else if (entry === "index.html") {
				const rel = relative(distDir, dir).split(sep).join("/");
				routes.push(rel ? `/${rel}/` : "/");
			}
		}
	};
	walk(distDir);
	routes.push("/404.html");
	return routes.sort();
}

const childRoutes = (segments) => {
	const dir = join(distDir, ...segments);
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((entry) => statSync(join(dir, entry)).isDirectory())
		.map((entry) => `/${[...segments, entry].join("/")}/`)
		.sort();
};

export const postRoutes = (lang) => childRoutes(lang === "ko" ? ["posts"] : ["en", "posts"]);
export const categoryRoutes = (lang) => childRoutes(lang === "ko" ? ["category"] : ["en", "category"]);
