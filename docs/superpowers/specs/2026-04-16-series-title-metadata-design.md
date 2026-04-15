# Series Title & Metadata Design

## Goal

Refine the post-series metadata model before more series content is added.

The new model should:

- stay explicit for authors
- avoid duplicated frontmatter data
- support both series posts with and without subtitles
- keep rendered titles consistent across detail pages, lists, related-reading blocks, and search

## Reference Philosophy

Follow `docs/spec-editorial-philosophy.md`.

This means:

- metadata should reduce confusion, not introduce hidden rules
- title rendering should stay calm and predictable
- series support should help long-form technical writing without making the site feel product-like

## Problem

The current series shape was enough to prove the reading-flow interaction, but it is not yet a stable authoring model.

The remaining issues are:

1. it mixes grouping metadata with reader-facing title metadata
2. it does not cleanly model the difference between:
   - a series post with no subtitle
   - a series post with a subtitle
3. `slug` is a common web term, but in this blog it is only being used as an internal grouping key, so a more explicit field name is better
4. rendered titles are still assembled ad hoc from `post.data.title`, which can create drift across pages, lists, related links, and search indexing

## Design Direction

Keep `title` as the canonical frontmatter field for all blog posts, but change its meaning for series posts in a way that remains explicit to authors.

- For ordinary posts, `title` remains the full displayed title.
- For series posts, `title` stores the series-level title.
- If an individual series entry needs its own subheading, store that in `series.subtitle`.

This keeps the authoring model simple:

- authors always write `title`
- series-specific structure lives only inside `series`
- the site assembles the final display title through shared logic

## Alternatives Considered

### 1. Keep The Current Series Shape

Continue with:

```md
series:
  slug: "routing-story"
  title: "라우팅 이야기"
  order: 1
```

- **Strength**: already implemented
- **Weakness**: mixes grouping, ordering, and reader-facing title concerns in a way that will stay confusing when real series content grows

### 2. Replace `title` With A Separate Field Like `headline`

Use a new field for all post display titles and treat `title` as legacy.

- **Strength**: semantically strict
- **Weakness**: introduces unnecessary churn and makes ordinary post authoring heavier than needed

### 3. Keep `title`, Reshape `series`, Add Shared Title Assembly `(Chosen)`

Use `title` consistently, reshape `series` into explicit sequence metadata, and require a single display-title assembly path everywhere.

- **Strength**: most explicit for authors without adding duplicated fields
- **Weakness**: requires touching every title-bearing surface, not just the series UI

## Frontmatter Model

### Ordinary Post

```md
---
title: "서비스 경계를 다시 생각하기"
pubDate: 2026-04-16
description: "..."
category: "Development"
tags:
  - architecture
---
```

### Series Post Without Subtitle

```md
---
title: "라우팅 이야기"
pubDate: 2026-04-16
description: "..."
category: "Development"
tags:
  - routing
  - infrastructure
series:
  id: "routing-story"
  index: 1
  total: 3
---
```

### Series Post With Subtitle

```md
---
title: "라우팅 이야기"
pubDate: 2026-04-16
description: "..."
category: "Development"
tags:
  - routing
  - infrastructure
series:
  id: "routing-story"
  subtitle: "경계부터 정하기"
  index: 1
  total: 3
---
```

## Field Semantics

### `title`

- For non-series posts: the final visible post title
- For series posts: the series-level title

### `series.id`

- Internal grouping key only
- Used to determine which posts belong to the same series
- Not displayed to readers
- Not intended for search relevance
- Not intended for URL generation

It only needs to be a stable, unique identifier within the content set.

### `series.index`

- The current post's position in the series

### `series.total`

- Total number of entries in the series

### `series.subtitle`

- Optional per-entry subtitle
- Omit it when the series entry does not need one

## Numbering Rule

Series numbering should always use the fraction style:

- `(1/3)`
- `(2/3)`
- `(3/3)`

Do not add a separate `numbering` option.

This keeps the authoring model smaller and gives readers the clearest sense of progress through a technical series.

## Display Title Rules

The site must compute a shared display title for every blog post.

### Final Display Title

- Non-series post: `title`
- Series post without subtitle: `title (1/3)`
- Series post with subtitle: `title (1/3): subtitle`

Examples:

- `서비스 경계를 다시 생각하기`
- `라우팅 이야기 (1/3)`
- `라우팅 이야기 (1/3): 경계부터 정하기`

### Series Navigation List Labels

Inside the ordered list in the series block:

- With subtitle: `1/3: 경계부터 정하기`
- Without subtitle: `1/3: 라우팅 이야기`

This keeps the list compact while still making position explicit.

### Series Navigation Header

The top of the series block should continue to show:

- the series title
- the current position, such as `1 / 3`

That header remains separate from the ordered list item labels.

## Shared Title Assembly

Title rendering must not be reimplemented independently in multiple files.

Add shared title-assembly helpers and use them everywhere a blog post title is shown.

At minimum, these helpers should support:

- a full display title for pages, lists, related-reading blocks, and previous/next links
- a compact series-list label for ordered series navigation items

## Required Integration Surfaces

The shared title assembly must be used consistently in:

- post detail H1
- document `<title>`
- archive and home post lists
- category and tag lists
- related-reading links
- series previous/next links
- series ordered list labels

## Search Implication

Search should continue to work through rendered HTML and Pagefind indexing, not by reading frontmatter directly.

That means subtitle searchability depends on the final assembled title being rendered into the page and any list/search-visible surfaces, not on Pagefind understanding the raw frontmatter shape.

As long as all title-bearing surfaces use the shared title helpers, subtitle-aware titles will remain searchable through the existing search system.

## Dummy Content Expansion

Expand the current dummy series content into a complete 3-part example in both locales:

- Korean: parts 1, 2, 3
- English: parts 1, 2, 3

This is no longer just a one-post proof of shape.

The dummy series should now act as:

- a real integration fixture for the new metadata model
- a manual inspection target for title assembly and series navigation

## Non-Goals

- do not expose `series.id` in the UI
- do not make series metadata affect URLs
- do not add per-series landing pages in this iteration
- do not change the related-reading heuristic beyond making it consume the shared display-title helpers

## Success Criteria

This design is successful if:

- authors can look at a series post frontmatter block and immediately understand what each field does
- ordinary post authoring stays simple
- title behavior is consistent across all title-bearing surfaces
- subtitle-aware series titles remain searchable through the existing Pagefind-based search flow
- the series UI stays readable and editorial rather than mechanically verbose
