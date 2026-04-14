import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("localized home pages point visitors to the existing Medium blog", async () => {
	const koPage = await readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/index.astro", import.meta.url), "utf8");

	assert.match(koPage, /개발 중입니다\./);
	assert.match(koPage, /Medium/);
	assert.match(koPage, /const legacyBlogUrl = "https:\/\/medium\.com\/@rlaace423";/);
	assert.match(koPage, /href=\{legacyBlogUrl\}/);

	assert.match(enPage, /under development\./);
	assert.match(enPage, /Medium/);
	assert.match(enPage, /const legacyBlogUrl = "https:\/\/medium\.com\/@rlaace423";/);
	assert.match(enPage, /href=\{legacyBlogUrl\}/);
});
