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

test("standalone image with non-empty alt becomes a column figure", () => {
	const tree = makeTree([makeParagraph([makeImage("./iam.png", "Step 2: policy form")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, "html");
	const html = tree.children[0].value as string;
	assert.match(html, /^<figure>/);
	assert.match(html, /<img src="\.\/iam\.png" alt="Step 2: policy form">/);
	assert.match(html, /<figcaption>Step 2: policy form<\/figcaption>/);
	assert.doesNotMatch(html, /data-width/);
});

test("standalone image with #wide fragment becomes a wide figure with fragment stripped", () => {
	const tree = makeTree([makeParagraph([makeImage("./console.png#wide", "Full IAM console")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "html");
	const html = tree.children[0].value as string;
	assert.match(html, /^<figure data-width="wide">/);
	assert.match(html, /<img src="\.\/console\.png" alt="Full IAM console">/);
	assert.doesNotMatch(html, /#wide/);
	assert.match(html, /<figcaption>Full IAM console<\/figcaption>/);
});

test("standalone image with empty alt becomes a bare decorative img (no figure, no figcaption)", () => {
	const tree = makeTree([makeParagraph([makeImage("./spacer.svg", "")])]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "html");
	const html = tree.children[0].value as string;
	assert.equal(html, '<img src="./spacer.svg" alt="">');
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

	assert.equal(tree.children[0].type, "paragraph");
	const paragraph = tree.children[0] as unknown as { children: MdastNode[] };
	assert.equal(paragraph.children.length, 3);
	assert.equal(paragraph.children[1].type, "image");
	assert.equal((paragraph.children[1] as { url: string }).url, "./cursor.svg");
});

test("alt text with HTML-significant characters is escaped in both alt and figcaption", () => {
	const tree = makeTree([makeParagraph([makeImage("./img.png", 'Tag <script> & "quote"')])]);
	const transform = remarkPostFigure();
	transform(tree);

	const html = tree.children[0].value as string;
	assert.match(
		html,
		/<img src="\.\/img\.png" alt="Tag &lt;script&gt; &amp; &quot;quote&quot;">/,
	);
	assert.match(
		html,
		/<figcaption>Tag &lt;script&gt; &amp; &quot;quote&quot;<\/figcaption>/,
	);
});

test("whitespace text nodes around a single image in a paragraph do not block promotion", () => {
	const tree = makeTree([
		makeParagraph([makeText("  "), makeImage("./iam.png", "alt"), makeText("\n")]),
	]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "html");
	const html = tree.children[0].value as string;
	assert.match(html, /^<figure>/);
	assert.match(html, /<figcaption>alt<\/figcaption>/);
});

test("paragraph with two images is left as-is because it is not the single-image pattern", () => {
	const tree = makeTree([
		makeParagraph([makeImage("./a.png", "a"), makeImage("./b.png", "b")]),
	]);
	const transform = remarkPostFigure();
	transform(tree);

	assert.equal(tree.children[0].type, "paragraph");
});
