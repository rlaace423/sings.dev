# Post Reading Flow Design

## Goal

Strengthen the post-to-post reading flow at the bottom of article pages without making the blog feel heavier, louder, or more product-like.

The experience should feel natural to a reader who finishes a post and thinks: "I could read one more thing here."

## Reference Philosophy

Follow `docs/spec-editorial-philosophy.md` as the top-level guardrail.

This means:

- writing remains the center of the page
- post-to-post navigation stays quiet and text-first
- series navigation is explicit when needed
- related reading remains helpful but secondary
- the site should not drift toward a recommendation engine or media portal

## Problem

Current post detail pages end with:

1. article body
2. author profile
3. comments

This leaves a gap in the reading flow.

A reader can finish an article, but the site does not yet provide a calm, context-aware suggestion for what to read next.

At the same time, some older posts will arrive as explicit series. Those need stronger sequencing than a general "related posts" block can provide.

## Design Direction

Use a hybrid bottom-of-post model:

- if a post belongs to a series, show a dedicated series navigation block
- for all posts, show a separate related-reading block

This keeps series structure explicit without forcing every post into a series model.

## Alternatives Considered

### 1. Related Posts Only

Show only a shared "next reading" block based on category and tag similarity.

- **Strength**: quiet and easy to implement
- **Weakness**: does not reliably preserve series order

### 2. Previous/Next Only

Show only a generic previous/next post flow.

- **Strength**: strong linear motion
- **Weakness**: previous/next by date is not the same as previous/next in a series, so it can feel arbitrary on normal posts and incorrect on structured series

### 3. Hybrid Series + Related Reading `(Chosen)`

Show explicit series navigation only for series posts, then show a common related-reading block for all posts.

- **Strength**: handles structured series and ordinary essays without mixing the two jobs
- **Weakness**: slightly more metadata and logic than the simpler options

## Placement

On post detail pages, the flow should become:

1. article body
2. series navigation block, only when relevant
3. related-reading block
4. author profile
5. comments

This keeps reading guidance close to the article body while leaving author/comments in the footer role.

## Series Model

Series membership must be explicit in frontmatter.

Do not infer series from title text like `(1/3)`.

The blog schema should support an optional object like:

```md
---
series:
  slug: "routing-story"
  title: "라우팅 이야기"
  order: 1
---
```

### Field Roles

- `slug`: stable grouping key
- `title`: reader-facing series title
- `order`: sequence within the series

### Notes

- only posts with `series` metadata participate in series navigation
- series relationships are resolved within the current locale only
- a post title may still contain `(1/3)` text if older content already uses that style, but navigation logic must not depend on it

## Series Navigation UI

When a post has `series` metadata, render a quiet section labeled like:

- Korean: `이 시리즈`
- English: `In This Series`

The block should include:

- series title
- current position, such as `2 / 3`
- previous item link when available
- next item link when available
- full series list in order

### Tone

- text-first
- no cards
- no thumbnails
- no oversized navigation chrome

### Reader Experience

The block should help a reader quickly understand:

- "This post belongs to a sequence"
- "Where am I in that sequence?"
- "What should I read next if I want to continue?"

## Related Reading UI

All posts should get a quiet related-reading block below the article body.

Suggested labels:

- Korean: `다음 읽을거리`
- English: `Keep Reading`

This block should:

- show 2 to 3 related posts
- use a text-first list
- include title and short description
- optionally include small supporting metadata if needed later

The block should be omitted if no strong candidates exist.

## Related Reading Selection Rules

Candidates must:

- come from the same locale
- exclude the current post

If the current post belongs to a series:

- exclude posts from the same series from the related-reading candidate pool
- series continuation is already handled by the dedicated series block

Scoring should favor:

1. same category
2. shared tags
3. newer publication date as a tiebreaker

The system should prefer a small set of strong candidates over filling the area with weak or arbitrary links.

## Dummy Content Requirement

Add one dummy post that demonstrates the new series frontmatter shape.

This dummy content is for content-level example and manual inspection, not as the full functional proof of a 3-part series.

### Why Only One Real Dummy Post

- the request is to add one dummy post, not a whole real series
- creating three real posts would add unnecessary noise to the content set

### How To Still Verify 3-Part Series Behavior

Use automated tests with synthetic fixture posts that represent:

- series part 1
- series part 2
- series part 3

That allows the UI and ordering logic to be fully tested without filling the actual blog content with throwaway posts.

## Non-Goals For This Iteration

- no popularity-based recommendations
- no global recommendation engine
- no thumbnails or card grids
- no merging of search and related reading
- no mandatory editorial block inside article markdown body

## Success Criteria

This change is successful if:

- readers finishing a post see a calm, natural path to continue reading
- series posts clearly preserve sequence
- non-series posts still feel connected to the rest of the archive
- the bottom-of-post area becomes more useful without feeling heavier than the writing itself
