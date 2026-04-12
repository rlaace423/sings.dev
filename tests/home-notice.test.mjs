import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("localized home pages point visitors to the existing Medium blog", async () => {
	const koPage = await readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/index.astro", import.meta.url), "utf8");

	assert.match(koPage, /새로운 블로그 개발 중입니다\./);
	assert.match(koPage, /const legacyBlogUrl = "https:\/\/medium\.com\/@rlaace423";/);
	assert.match(koPage, /href=\{legacyBlogUrl\}/);
	assert.match(koPage, />\s*블로그로 이동\s*</);

	assert.match(enPage, /A new blog is currently under development\./);
	assert.match(enPage, /const legacyBlogUrl = "https:\/\/medium\.com\/@rlaace423";/);
	assert.match(enPage, /href=\{legacyBlogUrl\}/);
	assert.match(enPage, />\s*Go to blog\s*</);
});
