import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { DIST, expect, test } from "./helpers";

/**
 * Open Graph card images generated at build time by `src/pages/og/[...path].png.ts`
 * (Satori → resvg). The Satori 0.26 → 0.63 upgrade silently pushed the card's
 * footer row off the canvas; nothing in the suite noticed. These checks pin
 * the layout:
 *   - every card has the exact 1200×630 size that Slack/X/Kakao expect;
 *   - a representative subset is compared pixel-by-pixel with a baseline.
 *
 * Fonts are embedded in the renderer, so the PNGs are byte-stable across
 * platforms and the baselines are not platform-suffixed.
 */
const OG_DIR = join(DIST, "og");

const SNAPSHOT_SUBSET = [
	"ko/default.png",
	"en/default.png",
	"ko/purpose-driven-systems.png",
	"en/purpose-driven-systems.png",
	"ko/eosjs-coin-transfer.png",
	"en/eosjs-coin-transfer.png",
];

function allOgImages(): string[] {
	const files: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (entry.endsWith(".png")) files.push(relative(OG_DIR, full).split(sep).join("/"));
		}
	};
	walk(OG_DIR);
	return files.sort();
}

function pngDimensions(buffer: Buffer) {
	const signature = "89504e470d0a1a0a";
	if (buffer.subarray(0, 8).toString("hex") !== signature) return null;
	if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") return null;
	return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test.describe("OG images", () => {
	test("every card is a valid 1200×630 PNG", () => {
		const images = allOgImages();
		expect(images.length, "no OG images were generated").toBeGreaterThan(0);
		for (const rel of images) {
			const size = pngDimensions(readFileSync(join(OG_DIR, rel)));
			expect.soft(size, `${rel} is not a PNG`).not.toBeNull();
			expect.soft(size, `${rel} has the wrong dimensions`).toEqual({ width: 1200, height: 630 });
		}
	});

	for (const rel of SNAPSHOT_SUBSET) {
		test(`${rel} matches its baseline`, () => {
			const png = readFileSync(join(OG_DIR, rel));
			expect(png).toMatchSnapshot(`og-${rel.replace("/", "-")}`);
		});
	}
});
