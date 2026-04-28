import assert from "node:assert/strict";
import test from "node:test";
import remarkAdmonition from "../src/utils/remarkAdmonition.ts";

type MdastNode = { type: string; [key: string]: unknown };

function makeTree(children: MdastNode[]) {
	return { type: "root", children } as { type: "root"; children: MdastNode[] };
}

function makeParagraph(children: MdastNode[]): MdastNode {
	return { type: "paragraph", children };
}

function makeText(value: string): MdastNode {
	return { type: "text", value };
}

function makeBreak(): MdastNode {
	return { type: "break" };
}

function makeBlockquote(children: MdastNode[]): MdastNode {
	return { type: "blockquote", children };
}

function makeFile(locale: "ko" | "en"): { path: string } {
	return { path: `/abs/repo/src/content/blog/${locale}/sample/index.md` };
}

test("[!NOTE] blockquote with body on the next line becomes an aside with the Korean label", () => {
	const tree = makeTree([
		makeBlockquote([
			makeParagraph([makeText("[!NOTE]\n부연 설명")]),
		]),
	]);

	remarkAdmonition()(tree, makeFile("ko"));

	assert.equal(tree.children.length, 3);
	assert.equal(tree.children[0].type, "html");
	assert.equal(
		tree.children[0].value,
		'<aside class="callout" data-callout-type="note"><p class="callout-label">참고</p>',
	);
	assert.equal(tree.children[1].type, "paragraph");
	const innerParagraph = tree.children[1] as { children: MdastNode[] };
	assert.equal(innerParagraph.children.length, 1);
	assert.equal(innerParagraph.children[0].type, "text");
	assert.equal((innerParagraph.children[0] as { value: string }).value, "부연 설명");
	assert.equal(tree.children[2].type, "html");
	assert.equal(tree.children[2].value, "</aside>");
});

test("[!WARNING] in an English post emits the English label and the warning data attribute", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("[!WARNING]\nWatch out.")])]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	assert.equal(tree.children.length, 3);
	assert.equal(
		tree.children[0].value,
		'<aside class="callout" data-callout-type="warning"><p class="callout-label">WARNING</p>',
	);
});

test("[!TIP] is recognized and lowercased on the data attribute", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("[!TIP]\nA quiet rule of thumb.")])]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	assert.equal(
		tree.children[0].value,
		'<aside class="callout" data-callout-type="tip"><p class="callout-label">TIP</p>',
	);
});

test("the marker is matched case-insensitively but the data attribute is always lowercase", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("[!note]\nlowercase marker")])]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	assert.match(tree.children[0].value as string, /data-callout-type="note"/);
});

test("an unknown admonition type leaves the blockquote untouched", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("[!CAUTION]\nNot supported")])]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, "blockquote");
});

test("a regular blockquote without an admonition marker stays as a blockquote", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("Just a quote.")])]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, "blockquote");
});

test("inline body on the same line as the marker is preserved", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("[!NOTE] body on same line")])]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	assert.equal(tree.children.length, 3);
	const innerParagraph = tree.children[1] as { children: MdastNode[] };
	assert.equal((innerParagraph.children[0] as { value: string }).value, "body on same line");
});

test("a soft break right after a marker-only first line is dropped along with the empty text node", () => {
	// remark sometimes splits "[!NOTE]\nbody" into [text "[!NOTE]", break, text "body"].
	const tree = makeTree([
		makeBlockquote([
			makeParagraph([makeText("[!NOTE]"), makeBreak(), makeText("body")]),
		]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	assert.equal(tree.children.length, 3);
	const innerParagraph = tree.children[1] as { children: MdastNode[] };
	assert.equal(innerParagraph.children.length, 1);
	assert.equal(innerParagraph.children[0].type, "text");
	assert.equal((innerParagraph.children[0] as { value: string }).value, "body");
});

test("multiple body paragraphs inside a callout are all preserved between the open and close aside HTML", () => {
	const tree = makeTree([
		makeBlockquote([
			makeParagraph([makeText("[!NOTE]")]),
			makeParagraph([makeText("First paragraph.")]),
			makeParagraph([makeText("Second paragraph.")]),
		]),
	]);

	remarkAdmonition()(tree, makeFile("ko"));

	// open + 2 paragraphs + close = 4 nodes
	assert.equal(tree.children.length, 4);
	assert.equal(tree.children[0].type, "html");
	assert.equal(tree.children[1].type, "paragraph");
	assert.equal(tree.children[2].type, "paragraph");
	assert.equal(tree.children[3].type, "html");
	assert.equal(tree.children[3].value, "</aside>");
});

test("a callout with a marker-only blockquote (no body) renders an aside with just the label", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("[!NOTE]")])]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	// open + close (no body)
	assert.equal(tree.children.length, 2);
	assert.equal(tree.children[0].type, "html");
	assert.equal(tree.children[1].type, "html");
	assert.equal(tree.children[1].value, "</aside>");
});

test("locale defaults to ko when the file path does not include a recognizable blog locale segment", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("[!NOTE]\n본문")])]),
	]);

	remarkAdmonition()(tree, { path: "/abs/elsewhere/index.md" });

	assert.match(tree.children[0].value as string, /참고/);
});

test("two callouts back-to-back are both transformed without skipping the second one", () => {
	const tree = makeTree([
		makeBlockquote([makeParagraph([makeText("[!NOTE]\nfirst")])]),
		makeBlockquote([makeParagraph([makeText("[!WARNING]\nsecond")])]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	// Each callout becomes [open, paragraph, close], so 2 callouts -> 6 nodes.
	assert.equal(tree.children.length, 6);
	assert.match(tree.children[0].value as string, /data-callout-type="note"/);
	assert.equal(tree.children[2].value, "</aside>");
	assert.match(tree.children[3].value as string, /data-callout-type="warning"/);
	assert.equal(tree.children[5].value, "</aside>");
});

test("a non-text first child in the first paragraph is not mistaken for a marker", () => {
	// e.g. `> **[!NOTE]** something` would parse the marker inside a strong node;
	// without the literal "[!NOTE]" as the first text node, we leave the blockquote alone.
	const tree = makeTree([
		makeBlockquote([
			makeParagraph([
				{ type: "strong", children: [makeText("[!NOTE]")] },
				makeText(" body"),
			]),
		]),
	]);

	remarkAdmonition()(tree, makeFile("en"));

	assert.equal(tree.children.length, 1);
	assert.equal(tree.children[0].type, "blockquote");
});
