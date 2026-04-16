# Spec: Post Footer (Comments)

- **Goal**: Keep a lightweight comments embed area at the bottom of every post detail page without a per-post author block.
- **Reference Philosophy**: This is a single-author personal blog, so the site itself already carries authorship through the header, home page, and `/about`. A repeated per-post author card would drift toward Medium-style publication chrome and away from the quiet, text-first reading rhythm described in `docs/spec-editorial-philosophy.md`.
- **Author Presence**:
  - Do not render a per-post author profile block below the article body.
  - Let author identity live at the site level: the site title in the header, the home page introduction, and the `/about` page.
- **Components**:
  - `src/components/Comments.astro`
    - Use a lightweight Giscus script skeleton.
    - Keep `data-theme="preferred_color_scheme"` so it follows the current theme.
    - Set `data-lang` from the active locale.
- **Integration**:
  - Render the comments component at the end of the main article column, after the post reading flow.
  - Do not place the comments block in the TOC column.
  - Separate the comments area from the prose body and reading-flow block using `border-t` and generous spacing such as `mt-16` / `pt-10`.
