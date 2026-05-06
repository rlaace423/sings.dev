interface HastNode {
	type: string;
	[key: string]: unknown;
}

interface HastElement extends HastNode {
	type: "element";
	tagName: string;
	properties?: Record<string, unknown>;
	children: HastNode[];
}

interface HastText extends HastNode {
	type: "text";
	value: string;
}

interface HastRoot extends HastNode {
	type: "root";
	children: HastNode[];
}

interface VFileLike {
	path?: string;
}

const LABELS: Record<"ko" | "en", { aria: string; copied: string }> = {
	ko: { aria: "코드 복사", copied: "복사됨" },
	en: { aria: "Copy code", copied: "Copied" },
};

const SVG_ATTRS =
	'viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const CLIPBOARD_SVG =
	`<svg data-state="idle" ${SVG_ATTRS}>` +
	'<rect x="9" y="2" width="6" height="4" rx="1" ry="1"></rect>' +
	'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>' +
	"</svg>";

const CHECK_SVG =
	`<svg data-state="copied" ${SVG_ATTRS} hidden>` +
	'<polyline points="20 6 9 17 4 12"></polyline>' +
	"</svg>";

function detectLocale(file: VFileLike | undefined): "ko" | "en" {
	const path = file?.path ?? "";
	if (/[\\/]blog[\\/]en[\\/]/.test(path)) return "en";
	return "ko";
}

function hasClass(node: HastElement, className: string): boolean {
	const props = node.properties ?? {};
	// rehype normalises to className (array) in unit tests and most remark pipelines,
	// but Astro's Shiki integration writes a raw `class` string instead.
	const cls = props.className ?? props.class;
	if (Array.isArray(cls)) return cls.includes(className);
	if (typeof cls === "string") return cls.split(/\s+/).includes(className);
	return false;
}

function isPreAstroCode(node: HastNode): node is HastElement {
	return (
		node.type === "element" &&
		(node as HastElement).tagName === "pre" &&
		hasClass(node as HastElement, "astro-code")
	);
}

function isCodeBlockWrapper(node: HastNode): node is HastElement {
	return (
		node.type === "element" &&
		(node as HastElement).tagName === "div" &&
		hasClass(node as HastElement, "code-block")
	);
}

function getRecursiveText(node: HastNode): string {
	if (node.type === "text") return (node as HastText).value;
	if (node.type === "element" || node.type === "root") {
		const children = (node as { children?: HastNode[] }).children ?? [];
		return children.map(getRecursiveText).join("");
	}
	return "";
}

function buildButton(locale: "ko" | "en"): HastElement {
	const labels = LABELS[locale];
	return {
		type: "element",
		tagName: "button",
		properties: {
			type: "button",
			className: ["code-copy-button"],
			"aria-label": labels.aria,
			"data-copied-label": labels.copied,
		},
		children: [
			{ type: "raw", value: CLIPBOARD_SVG },
			{ type: "raw", value: CHECK_SVG },
		],
	};
}

function buildWrapper(pre: HastElement, locale: "ko" | "en"): HastElement {
	return {
		type: "element",
		tagName: "div",
		properties: { className: ["code-block"] },
		children: [pre, buildButton(locale)],
	};
}

function walk(
	parent: { children: HastNode[] },
	locale: "ko" | "en",
	insideWrapper: boolean,
): void {
	for (let i = 0; i < parent.children.length; i += 1) {
		const child = parent.children[i];

		if (isPreAstroCode(child)) {
			if (insideWrapper) continue;
			if (getRecursiveText(child).trim() === "") continue;
			parent.children[i] = buildWrapper(child as HastElement, locale);
			continue;
		}

		if (child.type === "element") {
			const childInsideWrapper = insideWrapper || isCodeBlockWrapper(child);
			walk(child as HastElement, locale, childInsideWrapper);
		}
	}
}

export default function rehypeCodeCopyButton() {
	return function transform(tree: HastRoot, file: VFileLike): void {
		const locale = detectLocale(file);
		walk(tree, locale, false);
	};
}
