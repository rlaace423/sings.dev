import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("localized home pages keep the temporary Medium notice separate from the core hero", async () => {
	const koPage = await readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8");
	const enPage = await readFile(new URL("../src/pages/en/index.astro", import.meta.url), "utf8");

	assert.match(koPage, /data-legacy-notice/);
	assert.match(koPage, /개발 중입니다\./);
	assert.match(koPage, /Medium/);
	assert.match(koPage, /const legacyBlogUrl = "https:\/\/medium\.com\/@rlaace423";/);
	assert.match(koPage, /href=\{legacyBlogUrl\}/);
	assert.match(koPage, /data-home-hero/);
	assert.match(koPage, /오래 유지할 수 있는 시스템의 구조를 씁니다\./);
	assert.ok(
		koPage.indexOf("data-legacy-notice") < koPage.indexOf("data-home-hero"),
		"temporary notice should stay above the real Korean home hero",
	);

	assert.match(enPage, /data-legacy-notice/);
	assert.match(enPage, /under development\./);
	assert.match(enPage, /Medium/);
	assert.match(enPage, /const legacyBlogUrl = "https:\/\/medium\.com\/@rlaace423";/);
	assert.match(enPage, /href=\{legacyBlogUrl\}/);
	assert.match(enPage, /data-home-hero/);
	assert.match(enPage, /I write about the systems behind reliable products\./);
	assert.ok(
		enPage.indexOf("data-legacy-notice") < enPage.indexOf("data-home-hero"),
		"temporary notice should stay above the real English home hero",
	);
});
