# Archive Hub Design

## Goal

Strengthen discovery around browsing without changing the blog's core character.

The site should still feel like a quiet, text-first personal technical blog. The archive should become a better browsing entry point, but it must not turn into a portal, dashboard, or content grid.

## Design Direction

Use `/posts` as the main browse hub.

The page should keep the full reverse-chronological archive as its primary structure. Above that list, add a lightweight browse layer that helps visitors understand the site's major themes and choose where to start.

The hierarchy should be:

1. Archive page introduction
2. Browse section
3. Filters
4. Reverse-chronological full post list

This keeps writing at the center while making topic-based browsing easier.

## Information Architecture

### `/posts`

`/posts` remains the main archive route, not a separate portal.

It should contain:

- The existing archive intro
- A new browse section near the top
- The existing filter controls, visually softened so they read as secondary tools
- The full reverse-chronological list of posts

### Category Pages

Category pages should become shallow landing pages.

They should still show a post list, but the top of the page should better explain the category and provide a small amount of related context. These pages act as the main browse destinations from the archive hub.

### Tag Pages

Tag pages should remain lightweight result pages.

They continue to act as narrow cross-links between related posts, rather than becoming full landing pages. This keeps tags secondary to categories in the browsing model.

### Search

Search remains separate from taxonomy browsing.

It should continue to serve direct lookup behavior, while categories and tags continue to serve exploratory browsing. This feature should not merge those systems or blur their roles.

## `/posts` Browse Section

The browse section should sit between the archive intro and the filter controls.

Its purpose is to say:

- what kinds of subjects this blog covers
- where a reader can begin browsing

It should include:

- A short browse heading or lead-in
- A full list of categories
- A short row or cluster of representative tags

The browse section should be separated from the filter controls with a simple border and spacing rhythm, not a boxed panel.

## Category Presentation

All categories should be visible in the archive hub.

Each category item should be presented in a quiet vertical list, not a card grid.

Each category item should contain:

- Category name
- One short manually written description
- Post count as small supporting metadata

The description should be maintained explicitly in locale-aware content or configuration, not generated automatically.

The post count should appear below the description as secondary information, rather than beside the title.

Clicking a category item should navigate to that category page.

## Representative Tags

Representative tags should appear as a small secondary browse aid below the category list.

They should:

- be limited to a small curated set
- remain visually less important than categories
- navigate to tag pages when clicked

They should not expand into a full tag index or cloud on the archive hub.

## Filter Role

The existing archive filters should remain on `/posts`, but with lower visual emphasis than the browse section.

Their role is to narrow the current archive list, not to act as the primary browse entrance.

That means:

- filters stay expanded by default
- filters remain useful and visible
- browse links navigate to taxonomy pages
- filters continue to affect only the current archive page

This preserves a clear distinction between browsing and narrowing.

## Category Page Direction

Category pages should become shallow landing pages with this structure:

1. Category label and title
2. One short category description
3. A small set of related tags
4. Reverse-chronological post list

These pages should feel like calm topic entry pages, not editorial landing pages with hero content.

The post list remains the main body of the page.

## Tag Page Direction

Tag pages should keep a simpler structure:

1. Tag label and title
2. Brief explanatory copy
3. Reverse-chronological post list

They may include small supporting context if useful later, but they should stay closer to filtered result pages than to category landings.

## Content Model Additions

To support this design cleanly, the site should introduce small, explicit browse metadata outside individual posts.

At minimum:

- Locale-aware category descriptions
- A curated locale-aware representative tag list for the archive hub

These should be maintained manually so the tone stays intentional and readable.

## Visual Constraints

The archive hub should stay within the blog's established visual language:

- text-first
- calm spacing
- no card-heavy media layout
- no loud dashboard treatment
- no popularity widgets or tag clouds
- no merging of search and taxonomy browsing

The new browse layer should feel like guidance, not product chrome.

## Success Criteria

This change is successful if:

- `/posts` still reads primarily as an archive
- first-time visitors can understand the blog's main topics faster
- category pages become clearer browsing destinations
- tag pages remain lightweight and secondary
- the site feels more navigable without feeling heavier
