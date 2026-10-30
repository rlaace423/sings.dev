/**
 * Browser-side WCAG contrast audit.
 *
 * Runs inside the page via `page.evaluate(collectContrastViolations)`, so the
 * function must stay self-contained (no imports, no closures over test
 * state). It walks every element that renders its own text, composites the
 * element's colour over the real background stack with a 1×1 canvas (which
 * also handles oklch/alpha colours the way the browser does), and reports
 * any pair below WCAG AA — 4.5:1 for normal text, 3:1 for large text and for
 * list markers.
 *
 * Why in the browser and not from source tokens: the April/May contrast
 * fixes kept recurring because each test only guarded the one token that had
 * just been fixed. Measuring the rendered cascade catches every text/background
 * pairing Tailwind actually produces, including ones no test author thought of.
 */
export type ContrastViolation = {
	kind: "text" | "marker";
	where: string;
	text: string;
	fg: string;
	bg: string;
	ratio: number;
	required: number;
	fontSize: number;
	fontWeight: number;
};

export function collectContrastViolations(): ContrastViolation[] {
	type Rgb = { r: number; g: number; b: number };

	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return [];

	const alphaOf = (color: string) => {
		ctx.clearRect(0, 0, 1, 1);
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 1, 1);
		return ctx.getImageData(0, 0, 1, 1).data[3];
	};

	// Composite a stack of CSS colours (outermost first) over the browser's
	// white canvas and read back the resulting opaque sRGB pixel.
	const paint = (layers: string[]): Rgb => {
		ctx.clearRect(0, 0, 1, 1);
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, 1, 1);
		for (const layer of layers) {
			ctx.fillStyle = layer;
			ctx.fillRect(0, 0, 1, 1);
		}
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		return { r, g, b };
	};

	const luminance = ({ r, g, b }: Rgb) => {
		const lin = (v: number) => {
			const c = v / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		};
		return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
	};

	const contrast = (a: Rgb, b: Rgb) => {
		const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
		return (hi + 0.05) / (lo + 0.05);
	};

	const rgbString = ({ r, g, b }: Rgb) => `rgb(${r} ${g} ${b})`;

	// Background colours from <html> down to the element itself. Returns null
	// when an ancestor paints an image or gradient, which we cannot evaluate.
	const backgroundLayers = (el: Element): string[] | null => {
		const chain: Element[] = [];
		for (let node: Element | null = el; node; node = node.parentElement) chain.unshift(node);
		const layers: string[] = [];
		for (const node of chain) {
			const style = getComputedStyle(node);
			if (style.backgroundImage !== "none") return null;
			if (alphaOf(style.backgroundColor) > 0) layers.push(style.backgroundColor);
		}
		return layers;
	};

	const isRendered = (el: Element) => {
		const style = getComputedStyle(el);
		if (style.display === "none" || style.visibility !== "visible") return false;
		for (let node: Element | null = el; node; node = node.parentElement) {
			if (parseFloat(getComputedStyle(node).opacity) === 0) return false;
		}
		// `.sr-only` and similar clip to a 1×1 box.
		const rect = el.getBoundingClientRect();
		return rect.width >= 2 && rect.height >= 2;
	};

	const describe = (el: Element) => {
		const parts: string[] = [];
		let node: Element | null = el;
		while (node && node !== document.body && parts.length < 4) {
			let label = node.tagName.toLowerCase();
			if (node.id) label += `#${node.id}`;
			else if (typeof node.className === "string" && node.className.trim()) {
				label += `.${node.className.trim().split(/\s+/).slice(0, 2).join(".")}`;
			}
			parts.unshift(label);
			node = node.parentElement;
		}
		return parts.join(" > ");
	};

	const violations: ContrastViolation[] = [];

	for (const el of document.body.querySelectorAll("*")) {
		if (el.closest("script, style, noscript, template, svg")) continue;
		// Syntax-highlighting tokens take their colours from the Shiki themes
		// (github-light / tokyo-night), not from the site palette; several of
		// those theme colours sit below 4.5:1 by design (comments, attribute
		// names). They are a theme choice, not a regression, so skip them here.
		if (el.closest("pre.astro-code, pre.shiki")) continue;
		// Decorative glyphs the accessibility tree ignores (e.g. the brand cursor).
		if (el.closest('[aria-hidden="true"]')) continue;

		const ownText = Array.from(el.childNodes)
			.filter((node) => node.nodeType === Node.TEXT_NODE)
			.map((node) => node.textContent ?? "")
			.join("")
			.replace(/\s+/g, " ")
			.trim();
		const style = getComputedStyle(el);
		const hasMarker =
			el.tagName === "LI" &&
			style.display === "list-item" &&
			style.listStyleType !== "none" &&
			el.closest(".prose-site") !== null;

		if (!ownText && !hasMarker) continue;
		if (!isRendered(el)) continue;

		const layers = backgroundLayers(el);
		if (!layers) continue;
		const bg = paint(layers);
		const fontSize = parseFloat(style.fontSize);
		const fontWeight = parseInt(style.fontWeight, 10) || 400;

		if (ownText) {
			const fg = paint([...layers, style.color]);
			const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
			const required = large ? 3 : 4.5;
			const ratio = contrast(fg, bg);
			if (ratio + 1e-9 < required) {
				violations.push({
					kind: "text",
					where: describe(el),
					text: ownText.slice(0, 60),
					fg: rgbString(fg),
					bg: rgbString(bg),
					ratio: Math.round(ratio * 100) / 100,
					required,
					fontSize,
					fontWeight,
				});
			}
		}

		if (hasMarker) {
			const markerColor = getComputedStyle(el, "::marker").color;
			const fg = paint([...layers, markerColor]);
			const ratio = contrast(fg, bg);
			if (ratio + 1e-9 < 3) {
				violations.push({
					kind: "marker",
					where: describe(el),
					text: ownText.slice(0, 40),
					fg: rgbString(fg),
					bg: rgbString(bg),
					ratio: Math.round(ratio * 100) / 100,
					required: 3,
					fontSize,
					fontWeight,
				});
			}
		}
	}

	return violations;
}
