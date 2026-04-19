interface MdastNode {
	type: string;
	[key: string]: unknown;
}

interface ParagraphLike extends MdastNode {
	type: "paragraph";
	children: MdastNode[];
}

interface ImageLike extends MdastNode {
	type: "image";
	url: string;
	alt: string | null;
}

interface RootLike extends MdastNode {
	type: "root";
	children: MdastNode[];
}

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

function isWhitespaceText(node: MdastNode): boolean {
	if (node.type !== "text") return false;
	const value = (node as { value?: unknown }).value;
	return typeof value === "string" && /^\s*$/.test(value);
}

function findSoleImage(paragraph: ParagraphLike): ImageLike | null {
	let image: ImageLike | null = null;
	for (const child of paragraph.children) {
		if (isWhitespaceText(child)) continue;
		if (child.type === "image" && image === null) {
			image = child as ImageLike;
			continue;
		}
		return null;
	}
	return image;
}

function renderDecorative(src: string): string {
	return `<img src="${escapeHtml(src)}" alt="">`;
}

function renderFigure(src: string, alt: string, isWide: boolean): string {
	const attrs = isWide ? ' data-width="wide"' : "";
	const safeSrc = escapeHtml(src);
	const safeAlt = escapeHtml(alt);
	return `<figure${attrs}><img src="${safeSrc}" alt="${safeAlt}"><figcaption>${safeAlt}</figcaption></figure>`;
}

export default function remarkPostFigure() {
	return function transform(tree: RootLike): void {
		const children = tree.children;
		for (let i = 0; i < children.length; i += 1) {
			const node = children[i];
			if (node.type !== "paragraph") continue;
			const image = findSoleImage(node as ParagraphLike);
			if (image === null) continue;

			const alt = typeof image.alt === "string" ? image.alt : "";
			const rawUrl = typeof image.url === "string" ? image.url : "";

			let url = rawUrl;
			let isWide = false;
			const hashIndex = rawUrl.indexOf("#");
			if (hashIndex !== -1) {
				const fragment = rawUrl.slice(hashIndex + 1);
				if (fragment === "wide") {
					isWide = true;
					url = rawUrl.slice(0, hashIndex);
				}
			}

			const value = alt === "" ? renderDecorative(url) : renderFigure(url, alt, isWide);

			children[i] = {
				type: "html",
				value,
			};
		}
	};
}
