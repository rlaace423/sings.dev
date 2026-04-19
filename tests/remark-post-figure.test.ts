import assert from "node:assert/strict";
import test from "node:test";
import remarkPostFigure from "../src/utils/remarkPostFigure.ts";

type MdastNode = { type: string; [key: string]: unknown };

function makeTree(children: MdastNode[]) {
	return { type: "root", children } as { type: "root"; children: MdastNode[] };
}

function makeParagraph(children: MdastNode[]): MdastNode {
	return { type: "paragraph", children };
}

function makeImage(url: string, alt: string): MdastNode {
	return { type: "image", url, alt };
}

function makeText(value: string): MdastNode {
	return { type: "text", value };
}

test("standalone image with non-empty alt becomes a column figure wrapping a preserved image node", () => {
	const tree = makeTree([makeParagraph([makeImage("./iam.png", "Step 2: policy form")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 3);
	assert.equal(tree.children[0].type, "html");
	assert.equal(tree.children[0].value, "<figure>");
	assert.equal(tree.children[1].type, "image");
	assert.equal((tree.children[1] as { url: string }).url, "./iam.png");
	assert.equal((tree.children[1] as { alt: string }).alt, "Step 2: policy form");
	assert.equal(tree.children[2].type, "html");
	assert.equal(
		tree.children[2].value,
		"<figcaption>Step 2: policy form</figcaption></figure>",
	);
});

test("standalone image with #wide fragment becomes a wide figure with the fragment stripped from image.url", () => {
	const tree = makeTree([makeParagraph([makeImage("./console.png#wide", "Full IAM console")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 3);
	assert.equal(tree.children[0].type, "html");
	assert.equal(tree.children[0].value, '<figure data-width="wide">');
	assert.equal(tree.children[1].type, "image");
	assert.equal((tree.children[1] as { url: string }).url, "./console.png");
	assert.equal((tree.children[1] as { alt: string }).alt, "Full IAM console");
	assert.equal(tree.children[2].type, "html");
	assert.equal(
		tree.children[2].value,
		"<figcaption>Full IAM console</figcaption></figure>",
	);
});

test("standalone image with empty alt stays as a bare image node (no figure, no figcaption)", () => {
	const tree = makeTree([makeParagraph([makeImage("./spacer.svg", "")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, "image");
	assert.equal((tree.children[0] as { url: string }).url, "./spacer.svg");
	assert.equal((tree.children[0] as { alt: string }).alt, "");
});

test("inline image that shares a paragraph with other content is left untouched", () => {
	const tree = makeTree([
		makeParagraph([
			makeText("Click "),
			makeImage("./cursor.svg", "cursor"),
			makeText(" here."),
		]),
	]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, "paragraph");
	const paragraph = tree.children[0] as unknown as { children: MdastNode[] };
	assert.equal(paragraph.children.length, 3);
	assert.equal(paragraph.children[1].type, "image");
	assert.equal((paragraph.children[1] as { url: string }).url, "./cursor.svg");
});

test("alt text with HTML-significant characters is escaped only in the figcaption (image alt stays raw)", () => {
	const tree = makeTree([makeParagraph([makeImage("./img.png", 'Tag <script> & "quote"')])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 3);
	// Image alt is preserved as-is on the MDAST node; Astro will attribute-escape it downstream.
	assert.equal((tree.children[1] as { alt: string }).alt, 'Tag <script> & "quote"');
	// figcaption text IS our responsibility to escape since we emit it as raw HTML.
	assert.equal(
		tree.children[2].value,
		"<figcaption>Tag &lt;script&gt; &amp; &quot;quote&quot;</figcaption></figure>",
	);
});

test("whitespace text nodes around a single image in a paragraph do not block promotion", () => {
	const tree = makeTree([
		makeParagraph([makeText("  "), makeImage("./iam.png", "alt"), makeText("\n")]),
	]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 3);
	assert.equal(tree.children[0].value, "<figure>");
	assert.equal(tree.children[1].type, "image");
	assert.equal(tree.children[2].value, "<figcaption>alt</figcaption></figure>");
});

test("paragraph with two images is left as-is because it is not the single-image pattern", () => {
	const tree = makeTree([
		makeParagraph([makeImage("./a.png", "a"), makeImage("./b.png", "b")]),
	]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, "paragraph");
});
