// Dependency-free static server for the built site (`dist/`).
//
// `playwright.config.ts` starts this as its webServer so the visual suite
// exercises exactly the files that get deployed. Unknown paths are answered
// with `dist/404.html` and a 404 status, mirroring Cloudflare's
// `assets.not_found_handling: "404-page"` in `wrangler.jsonc`.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2] ?? 4173);
const root = resolve(fileURLToPath(new URL("../../dist/", import.meta.url)));

if (!existsSync(join(root, "index.html"))) {
	console.error(`[serve] ${join(root, "index.html")} is missing. Run \`npm run build\` first.`);
	process.exit(1);
}

const MIME = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".xml": "application/xml; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".avif": "image/avif",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".wasm": "application/wasm",
};

function resolveFile(pathname) {
	let decoded;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		return null;
	}
	const safe = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
	let file = join(root, safe);
	if (file !== root && !file.startsWith(root + sep)) return null;
	if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
	return existsSync(file) && statSync(file).isFile() ? file : null;
}

const server = createServer((req, res) => {
	const { pathname } = new URL(req.url ?? "/", "http://127.0.0.1");
	const file = resolveFile(pathname);
	const target = file ?? join(root, "404.html");
	res.statusCode = file ? 200 : 404;
	res.setHeader("Content-Type", MIME[extname(target)] ?? "application/octet-stream");
	res.setHeader("Cache-Control", "no-store");
	if (req.method === "HEAD") {
		res.end();
		return;
	}
	createReadStream(target).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
	console.log(`[serve] ${root} → http://127.0.0.1:${port}/`);
});
