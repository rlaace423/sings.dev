# Spec: Full-Site Internationalization (i18n)

- **Goal**: Support Korean and English across the public site with locale-aware routing and navigation.
- **Locales**: Korean (`ko`, default) and English (`en`).
- **Architecture & URL Structure**:
  1. **Astro Config**
     - Use Astro's built-in i18n support.
     - Set `defaultLocale: "ko"` and `locales: ["ko", "en"]`.
     - Set `routing: { prefixDefaultLocale: false }` so Korean routes stay at the root while English routes use `/en/...`.
  2. **Content Collections**
     - Blog content:
       - `src/content/blog/ko/`
       - `src/content/blog/en/`
     - Static page content:
       - `src/content/pages/ko/`
       - `src/content/pages/en/`
  3. **Page Routing**
     - Korean root routes:
       - `/`
       - `/posts`
       - `/posts/[slug]`
       - `/about`
       - `/category/[category]`
       - `/tags/[tag]`
     - English routes:
       - `/en/`
       - `/en/posts`
       - `/en/posts/[slug]`
       - `/en/about`
       - `/en/category/[category]`
       - `/en/tags/[tag]`
  4. **UI Dictionary (`src/i18n/ui.ts`)**
     - Store shared UI labels for navigation and common actions.
     - Provide locale helpers such as `isLocale()` and `useTranslations(lang)`.
- **Navigation (`src/components/Header.astro`)**:
  - Keep the header simple with `Posts` and `About` as the only text navigation links.
  - Place the search button to the left of the locale switcher.
  - Use a locale switcher immediately to the left of the theme toggle.
  - Build internal links with `getRelativeLocaleUrl()` so the language switch preserves the current page path.
  - The global search modal should inherit the current locale and search only content from that locale.
