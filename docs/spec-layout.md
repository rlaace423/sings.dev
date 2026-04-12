# Spec: Global Base Layout

- **Goal**: Define the shared shell used by all public pages.
- **Design Philosophy**: Minimalist, text-centric, readable, and calm. The site should feel closer to reading an essay than using a dashboard.
- **Layout Structure**:
  - Use a centered outer container around `max-w-4xl` with horizontal padding.
  - Keep the default reading width around `max-w-3xl`, but allow wider layouts for post detail pages through a `contentClass` prop.
  - Accept a `lang` prop in `src/layouts/Layout.astro` and apply it to `<html lang={lang}>`.
  - Support localized `title` and `description` metadata when needed.
  - Support both light and dark mode.
- **Header**:
  - Left: text logo linking to the locale-aware home page.
  - Right: minimalist navigation links for `Posts` and `About`.
  - Controls: a locale switcher sits immediately to the left of the theme toggle.
  - Korean UI labels are `포스트`, `소개`; English UI labels are `Posts`, `About`.
- **Footer**:
  - Keep a simple copyright line at the bottom.
