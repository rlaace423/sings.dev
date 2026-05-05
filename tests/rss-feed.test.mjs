import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const koFeedUrl = new URL("../src/pages/rss.xml.ts", import.meta.url);
const enFeedUrl = new URL("../src/pages/en/rss.xml.ts", import.meta.url);
const layoutUrl = new URL("../src/layouts/Layout.astro", import.meta.url);

test("Korean RSS feed filters posts to ko + visible only and sorts by date", async () => {
	const feed = await readFile(koFeedUrl, "utf8");

	assert.match(feed, /matchesLocale\(post\.id, "ko"\) && isVisiblePost\(post\)/);
	assert.match(feed, /sortPostsByDate\(posts\)/);
	assert.match(feed, /link: `\/posts\/\$\{stripLocaleFromId\(post\.id\)\}\/`/);
	assert.match(feed, /<language>ko<\/language>/);
});

test("English RSS feed filters posts to en + visible only and links into /en/posts", async () => {
	const feed = await readFile(enFeedUrl, "utf8");

	assert.match(feed, /matchesLocale\(post\.id, "en"\) && isVisiblePost\(post\)/);
	assert.match(feed, /sortPostsByDate\(posts\)/);
	assert.match(feed, /link: `\/en\/posts\/\$\{stripLocaleFromId\(post\.id\)\}\/`/);
	assert.match(feed, /<language>en<\/language>/);
});

test("RSS feeds use the series-aware display title so series posts read as `Title (i/n): Subtitle`", async () => {
	const koFeed = await readFile(koFeedUrl, "utf8");
	const enFeed = await readFile(enFeedUrl, "utf8");

	assert.match(koFeed, /title: getDisplayTitle\(post\)/);
	assert.match(enFeed, /title: getDisplayTitle\(post\)/);
});

test("layout advertises both RSS feeds via <link rel=alternate>, ordering current-locale feed first", async () => {
	const layout = await readFile(layoutUrl, "utf8");

	assert.match(layout, /rel="alternate" type="application\/rss\+xml" title="sings\.dev \(한국어\)" href="\/rss\.xml"/);
	assert.match(layout, /rel="alternate" type="application\/rss\+xml" title="sings\.dev \(English\)" href="\/en\/rss\.xml"/);
	assert.match(layout, /lang === "ko" \?/);
});
