interface MdastNode {
	type: string;
	[key: string]: unknown;
}

interface ParagraphLike extends MdastNode {
	type: "paragraph";
	children: MdastNode[];
}

interface BlockquoteLike extends MdastNode {
	type: "blockquote";
	children: MdastNode[];
}

interface RootLike extends MdastNode {
	type: "root";
	children: MdastNode[];
}

interface TextLike extends MdastNode {
	type: "text";
	value: string;
}

interface VFileLike {
	path?: string;
}

const ADMONITION_TYPES = ["note", "warning", "tip"] as const;
type AdmonitionType = (typeof ADMONITION_TYPES)[number];

const ADMONITION_LABELS: Record<"ko" | "en", Record<AdmonitionType, string>> = {
	ko: { note: "참고", warning: "주의", tip: "팁" },
	en: { note: "NOTE", warning: "WARNING", tip: "TIP" },
};

// Match the leading marker on the first text node of a blockquote's first
// paragraph. Examples that match (case-insensitive):
//   "[!NOTE]\nbody..."
//   "[!NOTE] body on same line"
//   "[!WARNING]"
// The optional trailing whitespace + newline is consumed so the marker line
// is fully stripped from the text node.
const MARKER_PATTERN = /^\[!(NOTE|WARNING|TIP)\]\s*\n?/i;

function detectAdmonitionType(blockquote: BlockquoteLike): AdmonitionType | null {
	const firstChild = blockquote.children[0];
	if (!firstChild || firstChild.type !== "paragraph") return null;
	const paragraph = firstChild as ParagraphLike;
	const firstParagraphChild = paragraph.children[0];
	if (!firstParagraphChild || firstParagraphChild.type !== "text") return null;
	const text = (firstParagraphChild as TextLike).value;
	const match = MARKER_PATTERN.exec(text);
	if (!match) return null;
	return match[1].toLowerCase() as AdmonitionType;
}

function stripMarker(blockquote: BlockquoteLike): void {
	const firstParagraph = blockquote.children[0] as ParagraphLike;
	const firstText = firstParagraph.children[0] as TextLike;

	firstText.value = firstText.value
		.replace(MARKER_PATTERN, "")
		.replace(/^\s+/, "");

	if (firstText.value === "") {
		// The marker consumed the whole text node; drop it.
		firstParagraph.children.shift();
		// If the parser inserted a soft break right after the marker, drop it too —
		// otherwise the rendered body would start with a stray <br>.
		if (firstParagraph.children[0]?.type === "break") {
			firstParagraph.children.shift();
		}
	}

	// If stripping leaves the paragraph empty, drop the paragraph entirely so the
	// callout body starts on the first real content paragraph.
	if (firstParagraph.children.length === 0) {
		blockquote.children.shift();
	}
}

function detectLocale(file: VFileLike | undefined): "ko" | "en" {
	const path = file?.path ?? "";
	if (/[\\/]blog[\\/]en[\\/]/.test(path)) return "en";
	return "ko";
}

export default function remarkAdmonition() {
	return function transform(tree: RootLike, file: VFileLike): void {
		const lang = detectLocale(file);
		const labels = ADMONITION_LABELS[lang];
		const children = tree.children;

		for (let i = 0; i < children.length; i += 1) {
			const node = children[i];
			if (node.type !== "blockquote") continue;

			const type = detectAdmonitionType(node as BlockquoteLike);
			if (!type) continue;

			const blockquote = node as BlockquoteLike;
			stripMarker(blockquote);

			const label = labels[type];
			const openNode: MdastNode = {
				type: "html",
				value: `<aside class="callout" data-callout-type="${type}"><p class="callout-label">${label}</p>`,
			};
			const closeNode: MdastNode = { type: "html", value: "</aside>" };

			const inner = blockquote.children;
			children.splice(i, 1, openNode, ...inner, closeNode);
			// We replaced one node with (1 + inner.length + 1) nodes. Advance i past
			// the inserted span so the loop continues after the close-aside node.
			i += 1 + inner.length;
		}
	};
}
