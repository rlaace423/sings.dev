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

			// Strip the #wide fragment so Astro's asset pipeline receives a clean path.
			let isWide = false;
			let cleanUrl = rawUrl;
			const hashIndex = rawUrl.indexOf("#");
			if (hashIndex !== -1 && rawUrl.slice(hashIndex + 1) === "wide") {
				isWide = true;
				cleanUrl = rawUrl.slice(0, hashIndex);
			}
			image.url = cleanUrl;

			if (alt === "") {
				// Decorative: replace the paragraph with the image alone. No figure wrap.
				children.splice(i, 1, image);
				// Index stays the same — we replaced one node with one node.
				continue;
			}

			// Figure: wrap the image between two raw-HTML siblings so Astro still
			// resolves the image's url through the asset pipeline.
			const openTag = isWide ? '<figure data-width="wide">' : "<figure>";
			const closeFragment = `<figcaption>${escapeHtml(alt)}</figcaption></figure>`;
			const openNode: MdastNode = { type: "html", value: openTag };
			const closeNode: MdastNode = { type: "html", value: closeFragment };

			children.splice(i, 1, openNode, image, closeNode);
			// We replaced one node with three; advance the index by 2 extra so the
			// next iteration lands on the node after the inserted sequence.
			i += 2;
		}
	};
}
