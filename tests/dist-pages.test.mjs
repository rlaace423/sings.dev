import assert from "node:assert/strict";
import test from "node:test";
import {
	allRoutes,
	attr,
	categoryRoutes,
	closestTag,
	loadPage,
	postRoutes,
	routeExists,
	textOf,
} from "./helpers/dist.mjs";

/**
 * Page-level structure invariants, read from the production build.
 *
 * These replace the former per-page compile harnesses (home, about, category,
 * post detail, reading flow). They assert relationships that must hold for
 * any content — the home identity mirrors the about page, titles agree across
 * every surface, series rails list every part — rather than specific copy.
 */

const LOCALES = [
	{
		lang: "ko",
		home: "/",
		about: "/about/",
		archive: "/posts/",
		postsPrefix: "/posts/",
		tagsPrefix: "/tags/",
		recentHeading: "최근 글",
		educationHeading: "학력",
		experienceHeading: "경력",
		relatedTagsLabel: "관련 태그",
		seriesHeading: "이 시리즈",
		keepReadingHeading: "다음 읽을거리",
	},
	{
		lang: "en",
		home: "/en/",
		about: "/en/about/",
		archive: "/en/posts/",
		postsPrefix: "/en/posts/",
		tagsPrefix: "/en/tags/",
		recentHeading: "Recent Posts",
		educationHeading: "Education",
		experienceHeading: "Experience",
		relatedTagsLabel: "Related tags",
		seriesHeading: "In This Series",
		keepReadingHeading: "Keep Reading",
	},
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const assertSocialRel = (anchor, where) => {
	const href = attr(anchor, "href");
	if (href.startsWith("mailto:")) {
		assert.equal(attr(anchor, "rel"), null, `${where}: mailto link should carry no rel`);
	} else {
		assert.equal(attr(anchor, "rel"), "me noopener", `${where}: external social link ${href}`);
	}
};

test("every built page has exactly one h1 inside <main>", () => {
	for (const route of allRoutes()) {
		const page = loadPage(route);
		const headings = page.main.querySelectorAll("h1");
		assert.equal(headings.length, 1, `${route} should have one h1, found ${headings.length}`);
		assert.ok(textOf(headings[0]).length > 0, `${route}: empty h1`);
	}
});

for (const locale of LOCALES) {
	test(`${locale.lang} home wires its identity block from the about page`, () => {
		const home = loadPage(locale.home);
		const about = loadPage(locale.about);

		const h1 = home.main.querySelector("h1");
		assert.ok(h1.hasAttribute("data-home-tagline"), "the tagline is the page h1");

		assert.equal(
			textOf(home.root.querySelector("[data-home-author-name]")),
			textOf(about.root.querySelector("[data-about-name]")),
			"home shows the same name as the about page",
		);
		assert.equal(attr(home.root.querySelector("[data-home-whoami]"), "href"), locale.about);
		assert.ok(textOf(home.root.querySelector("[data-home-author-summary]")).length > 0);

		const homeSocials = home.root.querySelectorAll("[data-home-socials] a");
		const aboutSocials = about.root.querySelectorAll("[data-about-socials] a");
		assert.ok(homeSocials.length > 0, "home lists the social links");
		assert.deepEqual(
			homeSocials.map((a) => attr(a, "href")),
			aboutSocials.map((a) => attr(a, "href")),
			"home and about list the same social links in the same order",
		);
		for (const anchor of homeSocials) {
			assertSocialRel(anchor, `${locale.home} socials`);
			assert.ok(attr(anchor, "aria-label"), "icon-only social links need an accessible name");
		}
	});

	test(`${locale.lang} home renders identity first, then one recent-posts section with locale-aware links`, () => {
		const home = loadPage(locale.home);
		const identityAt = home.html.indexOf("data-home-tagline");
		const recentAt = home.html.indexOf("data-home-recent-posts");
		assert.ok(identityAt > -1 && recentAt > identityAt, "identity block precedes recent posts");
		assert.equal(home.root.querySelector("[data-home-categories]"), null, "the old categories block is gone");

		const recent = home.root.querySelector("[data-home-recent-posts]");
		const headings = home.main.querySelectorAll("h2");
		assert.equal(headings.length, 1, "recent posts is the only h2 on the home page (no eyebrow, no hero)");
		assert.equal(textOf(headings[0]), locale.recentHeading);
		assert.ok(recent.querySelector(`a[href="${locale.archive}"]`), "an all-posts link sits next to the heading");

		const items = recent.querySelectorAll("li");
		assert.ok(items.length >= 1 && items.length <= 5, `expected 1–5 recent posts, got ${items.length}`);
		const dates = [];
		for (const item of items) {
			const href = attr(item.querySelector("h3 a"), "href");
			assert.match(href, new RegExp(`^${escapeRegExp(locale.postsPrefix)}[^/]+/$`), "locale-aware post link");
			assert.ok(routeExists(href), `${href} should be a built page`);
			const date = textOf(item.querySelector("p"));
			assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
			dates.push(date);
		}
		assert.deepEqual(dates, [...dates].sort().reverse(), "recent posts are newest first");
	});

	test(`${locale.lang} about page renders the identity frontmatter: name, photo, summary, socials, education, experience`, () => {
		const about = loadPage(locale.about);
		assert.ok(about.main.querySelector("h1").hasAttribute("data-about-name"));

		const photo = about.main.querySelector("img");
		assert.ok(photo, "profile photo");
		assert.ok(attr(photo, "alt"), "profile photo has alt text");
		assert.ok(routeExists(attr(photo, "src")), `profile photo ${attr(photo, "src")} ships with the build`);
		assert.ok(textOf(about.root.querySelector("[data-about-summary]")).length > 0);

		const socials = about.root.querySelectorAll("[data-about-socials] a");
		assert.ok(socials.length > 0);
		for (const anchor of socials) assertSocialRel(anchor, `${locale.about} socials`);

		assert.deepEqual(
			about.main.querySelectorAll("h2").map(textOf),
			[locale.educationHeading, locale.experienceHeading],
			"education and experience are the h2 sections, in that order",
		);
		assert.ok(about.root.querySelectorAll("[data-about-education] li").length >= 1);
		assert.ok(about.root.querySelectorAll("[data-about-experience] li").length >= 1);
	});

	test(`${locale.lang} category pages show related tags only for tags that repeat within the category`, () => {
		const archive = loadPage(locale.archive);
		const tagsByCategory = new Map();
		for (const item of archive.root.querySelectorAll("[data-post-item]")) {
			const category = attr(item, "data-category");
			const tags = (attr(item, "data-tags") ?? "").split(",").filter(Boolean);
			tagsByCategory.set(category, [...(tagsByCategory.get(category) ?? []), ...tags]);
		}

		const routes = categoryRoutes(locale.lang);
		assert.ok(routes.length > 0, "category pages were built");
		for (const route of routes) {
			const slug = route.split("/").filter(Boolean).at(-1);
			const counts = new Map();
			for (const tag of tagsByCategory.get(slug) ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
			const repeated = new Set([...counts].filter(([, count]) => count >= 2).map(([tag]) => tag));

			const page = loadPage(route);
			const label = page.main.querySelectorAll("p").find((p) => textOf(p) === locale.relatedTagsLabel);
			if (repeated.size === 0) {
				assert.equal(label, undefined, `${route}: no tag repeats, so no related-tags block`);
				continue;
			}
			assert.ok(label, `${route}: related-tags block expected (repeated: ${[...repeated].join(", ")})`);
			const links = label.parentNode.querySelectorAll("a");
			assert.ok(links.length >= 1, `${route}: related-tags block lists at least one tag`);
			for (const link of links) {
				const href = attr(link, "href");
				const match = href.match(new RegExp(`^${escapeRegExp(locale.tagsPrefix)}([^/]+)/$`));
				assert.ok(match, `${route}: related tag link ${href} must be locale-aware`);
				assert.ok(repeated.has(match[1]), `${route}: ${match[1]} does not repeat within the category`);
				assert.ok(routeExists(href), `${route}: ${href} should be a built page`);
			}
		}
	});
}

const POSTS = LOCALES.flatMap((locale) => postRoutes(locale.lang).map((route) => ({ locale, route })));

test("posts were built for both locales", () => {
	for (const locale of LOCALES) {
		assert.ok(postRoutes(locale.lang).length > 0, `${locale.lang} posts`);
	}
});

test("every post carries one assembled title across <title>, h1, OG tags, and the archive list", () => {
	for (const { locale, route } of POSTS) {
		const page = loadPage(route);
		const title = textOf(page.main.querySelector("h1"));
		const fullTitle = `${title} | sings.dev`;
		assert.equal(textOf(page.root.querySelector("title")), fullTitle, `${route}: <title>`);
		assert.equal(attr(page.root.querySelector('meta[property="og:title"]'), "content"), fullTitle, `${route}: og:title`);
		assert.equal(attr(page.root.querySelector('meta[name="twitter:title"]'), "content"), fullTitle, `${route}: twitter:title`);
		assert.equal(attr(page.root.querySelector('meta[property="og:type"]'), "content"), "article", route);

		const description = attr(page.root.querySelector('meta[name="description"]'), "content");
		assert.ok(description, `${route}: meta description`);
		assert.equal(attr(page.root.querySelector('meta[property="og:description"]'), "content"), description, route);

		const archive = loadPage(locale.archive);
		const listed = archive.root
			.querySelectorAll(`a[href="${route}"]`)
			.find((anchor) => closestTag(anchor, "h2"));
		assert.ok(listed, `${route} is listed on ${locale.archive}`);
		assert.equal(textOf(listed), title, `${route}: archive list uses the same assembled title`);
	}
});

test("every post mounts the reading aids: progress bar, TOC that resolves, lightbox, comments", () => {
	for (const { route } of POSTS) {
		const page = loadPage(route);
		assert.ok(page.root.querySelector("[data-reading-progress]"), `${route}: reading progress bar`);
		assert.ok(page.root.querySelector("[data-post-lightbox]"), `${route}: image lightbox shell`);
		assert.ok(page.root.querySelector('section[aria-labelledby="comments-title"]'), `${route}: comments section`);

		const article = page.main.querySelector("article");
		const prose = article.querySelector(".prose-site");
		assert.ok(prose, `${route}: prose body`);
		const sectionHeadings = prose.querySelectorAll("h2, h3");
		const tocLinks = article.querySelectorAll('nav[data-toc] a[href^="#"]');
		if (sectionHeadings.length > 0) {
			assert.ok(tocLinks.length > 0, `${route}: TOC renders when the body has section headings`);
		}
		for (const link of tocLinks) {
			const id = attr(link, "href").slice(1);
			assert.ok(article.querySelector(`[id="${id}"]`), `${route}: TOC link #${id} points at a heading`);
		}
	}
});

test("series posts render the whole series with the current part marked, and keep-reading stays short", () => {
	let seriesPosts = 0;
	for (const { locale, route } of POSTS) {
		const page = loadPage(route);
		const paragraphs = page.main.querySelectorAll("p");

		const seriesLabel = paragraphs.find((p) => textOf(p) === locale.seriesHeading);
		if (seriesLabel) {
			seriesPosts += 1;
			const section = closestTag(seriesLabel, "section");
			const items = section.querySelectorAll("ol li a");
			// A series whose later parts are still unpublished lists only the parts that exist.
			assert.ok(items.length >= 1, `${route}: a series rail lists its published parts`);
			const current = items.filter((a) => attr(a, "aria-current") === "page");
			assert.equal(current.length, 1, `${route}: exactly one part is marked current`);
			assert.equal(attr(current[0], "href"), route, `${route}: the current part links to this page`);
			for (const item of items) {
				assert.ok(routeExists(attr(item, "href")), `${route}: series part ${attr(item, "href")} exists`);
			}
			const position = items.findIndex((a) => attr(a, "aria-current") === "page") + 1;
			const counter = section.querySelectorAll("p").map(textOf).find((text) => /^\d+ \/ \d+$/.test(text));
			assert.equal(counter, `${position} / ${items.length}`, `${route}: series position counter`);
		}

		const keepReadingLabel = paragraphs.find((p) => textOf(p) === locale.keepReadingHeading);
		if (keepReadingLabel) {
			const links = closestTag(keepReadingLabel, "section").querySelectorAll("ul li a");
			assert.ok(links.length >= 1 && links.length <= 3, `${route}: keep-reading lists 1–3 items`);
			for (const link of links) {
				const href = attr(link, "href");
				assert.notEqual(href, route, `${route}: keep-reading never recommends the current post`);
				assert.ok(routeExists(href), `${route}: keep-reading link ${href} exists`);
			}
		}

		if (seriesLabel || keepReadingLabel) {
			const flowAt = page.html.indexOf('<section class="mt-16');
			const commentsAt = page.html.indexOf('id="comments-title"');
			const footerAt = page.html.lastIndexOf("<footer");
			assert.ok(flowAt > -1 && flowAt < commentsAt && commentsAt < footerAt, `${route}: reading flow sits before comments and footer`);
		}
	}
	assert.ok(seriesPosts > 0, "at least one series post exists to exercise the rail");
});
