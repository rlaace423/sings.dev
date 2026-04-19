import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("footer renders the Singing Developer signature next to the copyright year", async () => {
	const footer = await readFile(
		new URL("../src/components/Footer.astro", import.meta.url),
		"utf8",
	);

	assert.match(footer, /const year = new Date\(\)\.getFullYear\(\);/);
	assert.match(footer, /&copy; \{year\} sings\.dev — Singing Developer/);
});
