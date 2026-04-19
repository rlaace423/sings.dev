import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const LOCALES = [
	{ lang: "ko", path: "../src/content/blog/ko/iam-policy-checklist/index.md" },
	{ lang: "en", path: "../src/content/blog/en/iam-policy-checklist/index.md" },
] as const;

for (const { lang, path } of LOCALES) {
	test(`iam-policy-checklist (${lang}) body includes all four figure cases in the source markdown`, async () => {
		const source = await readFile(new URL(path, import.meta.url), "utf8");

		// Column captioned figure: non-empty alt, no fragment.
		assert.match(source, /!\[[^\]\n]+\]\(\.\/iam-policies-list\.svg\)/);

		// Wide captioned figure: non-empty alt, #wide fragment.
		assert.match(source, /!\[[^\]\n]+\]\(\.\/iam-console-overview\.svg#wide\)/);

		// Decorative empty-alt image.
		assert.match(source, /!\[\]\(\.\/spacer\.svg\)/);

		// Inline image: at least one non-newline character on each side of the image syntax.
		assert.match(source, /[^\n]!\[[^\]\n]*\]\(\.\/cursor\.svg\)[^\n]/);
	});

	test(`iam-policy-checklist (${lang}) source includes json, bash, and typescript code blocks`, async () => {
		const source = await readFile(new URL(path, import.meta.url), "utf8");
		assert.match(source, /```json\n/);
		assert.match(source, /```bash\n/);
		assert.match(source, /```typescript\n/);
	});

	test(`iam-policy-checklist (${lang}) source includes an external link, an internal link, and a blockquote`, async () => {
		const source = await readFile(new URL(path, import.meta.url), "utf8");
		assert.match(source, /\]\(https:\/\/docs\.aws\.amazon\.com\//);
		const internalLinkPattern = lang === "ko" ? /\]\(\/posts\// : /\]\(\/en\/posts\//;
		assert.match(source, internalLinkPattern);
		assert.match(source, /^> /m);
	});
}
