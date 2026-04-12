# Spec: Post Footer (Author Profile & Comments)

- **Goal**: Add a lightweight author section and a comments embed area to the bottom of every post detail page.
- **Components**:
  1. `src/components/AuthorProfile.astro`
     - Minimalist flex layout with a circular placeholder avatar on the left and text on the right.
     - Include author name, a short bio, GitHub link, and Email link.
     - Accept locale-aware copy so supporting labels can switch between Korean and English.
  2. `src/components/Comments.astro`
     - Use a lightweight Giscus script skeleton.
     - Keep `data-theme="preferred_color_scheme"` so it follows the current theme.
     - Set `data-lang` from the active locale.
- **Integration**:
  - Render both components at the end of the main article column.
  - Do not place either component in the TOC column.
  - Separate the footer area from the prose body using `border-t` and generous spacing such as `mt-16` / `pt-10`.
