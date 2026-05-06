import assert from "node:assert/strict";
import test from "node:test";
import rehypeCodeCopyButton from "../src/utils/rehypeCodeCopyButton.ts";

type HastNode = { type: string; [key: string]: unknown };

function makeRoot(children: HastNode[]): HastNode {
	return { type: "root", children };
}

function makeElement(
	tagName: string,
	properties: Record<string, unknown> = {},
	children: HastNode[] = [],
): HastNode {
	return { type: "element", tagName, properties, children };
}

function makeText(value: string): HastNode {
	return { type: "text", value };
}

function makeShikiPre(text: string): HastNode {
	return makeElement(
		"pre",
		{ className: ["astro-code"] },
		[makeElement("code", {}, [makeText(text)])],
	);
}

function makeFile(locale: "ko" | "en"): { path: string } {
	return { path: `/abs/repo/src/content/blog/${locale}/sample/index.md` };
}

test("wraps a single Shiki <pre> in a code-block div with a copy button (ko default)", () => {
	const tree = makeRoot([makeShikiPre("console.log('hi');")]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const rootChildren = (tree as { children: HastNode[] }).children;
	assert.equal(rootChildren.length, 1);

	const wrapper = rootChildren[0] as {
		type: string;
		tagName: string;
		properties: Record<string, unknown>;
		children: HastNode[];
	};
	assert.equal(wrapper.type, "element");
	assert.equal(wrapper.tagName, "div");
	assert.deepEqual(wrapper.properties.className, ["code-block"]);
	assert.equal(wrapper.children.length, 2);

	const pre = wrapper.children[0] as { tagName: string };
	assert.equal(pre.tagName, "pre");

	const button = wrapper.children[1] as {
		tagName: string;
		properties: Record<string, unknown>;
	};
	assert.equal(button.tagName, "button");
	assert.deepEqual(button.properties.className, ["code-copy-button"]);
	assert.equal(button.properties.type, "button");
	assert.equal(button.properties["aria-label"], "코드 복사");
	assert.equal(button.properties["data-copied-label"], "복사됨");
});

test("uses English labels when the file path is under /blog/en/", () => {
	const tree = makeRoot([makeShikiPre("console.log('hi');")]);

	rehypeCodeCopyButton()(tree, makeFile("en"));

	const wrapper = (tree as { children: HastNode[] }).children[0] as {
		children: HastNode[];
	};
	const button = wrapper.children[1] as { properties: Record<string, unknown> };
	assert.equal(button.properties["aria-label"], "Copy code");
	assert.equal(button.properties["data-copied-label"], "Copied");
});

test("falls back to Korean labels when the file path has no locale segment", () => {
	const tree = makeRoot([makeShikiPre("x")]);

	rehypeCodeCopyButton()(tree, { path: "/some/other/path.md" });

	const wrapper = (tree as { children: HastNode[] }).children[0] as {
		children: HastNode[];
	};
	const button = wrapper.children[1] as { properties: Record<string, unknown> };
	assert.equal(button.properties["aria-label"], "코드 복사");
	assert.equal(button.properties["data-copied-label"], "복사됨");
});

test("wraps every Shiki <pre> in a tree with multiple code blocks", () => {
	const tree = makeRoot([makeShikiPre("a"), makeShikiPre("b")]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 2);
	assert.equal((children[0] as { tagName: string }).tagName, "div");
	assert.equal((children[1] as { tagName: string }).tagName, "div");
});

test("skips empty <pre class=astro-code> elements", () => {
	const emptyPre = makeElement(
		"pre",
		{ className: ["astro-code"] },
		[makeElement("code", {}, [])],
	);
	const tree = makeRoot([emptyPre]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const node = children[0] as { tagName: string };
	assert.equal(node.tagName, "pre");
});

test("leaves <pre> elements without the astro-code class untouched", () => {
	const plainPre = makeElement("pre", {}, [makeText("hello")]);
	const tree = makeRoot([plainPre]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const node = children[0] as {
		tagName: string;
		properties: Record<string, unknown>;
	};
	assert.equal(node.tagName, "pre");
	const cls = node.properties.className;
	assert.equal(Array.isArray(cls) && cls.includes("code-block"), false);
});

test("wraps Shiki <pre> nested inside <aside class=callout>", () => {
	const aside = makeElement("aside", { className: ["callout"] }, [
		makeShikiPre("inside"),
	]);
	const tree = makeRoot([aside]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const asideNode = children[0] as {
		tagName: string;
		children: HastNode[];
	};
	assert.equal(asideNode.tagName, "aside");
	assert.equal(asideNode.children.length, 1);
	const wrapper = asideNode.children[0] as {
		tagName: string;
		properties: Record<string, unknown>;
	};
	assert.equal(wrapper.tagName, "div");
	assert.deepEqual(wrapper.properties.className, ["code-block"]);
});

test("does not double-wrap on a second pass over the same tree (idempotency)", () => {
	const tree = makeRoot([makeShikiPre("once")]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));
	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const wrapper = children[0] as {
		tagName: string;
		children: HastNode[];
	};
	assert.equal(wrapper.tagName, "div");
	assert.equal(wrapper.children.length, 2);
	assert.equal((wrapper.children[0] as { tagName: string }).tagName, "pre");
	assert.equal((wrapper.children[1] as { tagName: string }).tagName, "button");
});

// Astro's Shiki integration emits hast properties with `class` as a
// space-separated string (e.g. `"astro-code shiki tokyo-night"`), unlike
// rehype's normalised `className` array. The plugin must match either form;
// this test pins that behavior so a refactor cannot silently regress to the
// array-only assumption that broke real builds before the Task 2 wiring.
test("wraps a <pre> whose properties use a space-separated `class` string instead of `className` array", () => {
	const shikiShapedPre = makeElement(
		"pre",
		{ class: "astro-code shiki tokyo-night" },
		[makeElement("code", {}, [makeText("real-shape();")])],
	);
	const tree = makeRoot([shikiShapedPre]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const wrapper = children[0] as {
		tagName: string;
		properties: Record<string, unknown>;
		children: HastNode[];
	};
	assert.equal(wrapper.tagName, "div");
	assert.deepEqual(wrapper.properties.className, ["code-block"]);
	assert.equal((wrapper.children[0] as { tagName: string }).tagName, "pre");
	assert.equal((wrapper.children[1] as { tagName: string }).tagName, "button");
});

// Token-boundary protection: a class string that contains "astro-code" only
// as a substring of a longer token (e.g. "my-astro-code-foo") must NOT match.
// hasClass tokenises on whitespace and does an exact-token comparison.
test("does not match `astro-code` as a substring of another class token", () => {
	const lookalikePre = makeElement(
		"pre",
		{ class: "my-astro-code-foo other-token" },
		[makeElement("code", {}, [makeText("not-shiki")])],
	);
	const tree = makeRoot([lookalikePre]);

	rehypeCodeCopyButton()(tree, makeFile("ko"));

	const children = (tree as { children: HastNode[] }).children;
	assert.equal(children.length, 1);
	const node = children[0] as { tagName: string };
	// Untouched: still a bare <pre>, no .code-block wrapper.
	assert.equal(node.tagName, "pre");
});
