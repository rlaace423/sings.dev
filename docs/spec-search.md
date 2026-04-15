# Spec: Global Search Modal (Pagefind)

- **Goal**: Implement a site-wide global search that opens in a focused, text-first modal overlay for direct lookup.
- **Reference Philosophy**: Search is a direct lookup tool, not a replacement for taxonomy browsing. Follow `docs/spec-editorial-philosophy.md`.
- **Library Requirements**: 
  - Install `pagefind` as a dev dependency.
  - Update `package.json` build script to generate the index: `"build": "astro build && pagefind --site dist"`
- **Components to Create**:
  1. **`src/components/SearchModal.astro`**:
     - **Layout**: Use Tailwind to create a full-screen modal layer with a dark backdrop and a centered dialog card.
     - **Backdrop**: The backdrop should be a clickable element that closes the modal.
     - **Modal Box**: Use a roomy but restrained centered container that feels editorial rather than app-like.
     - **Pagefind UI**: Render the default `pagefind-ui` widget inside the modal.
     - **Lazy Init**: Load the Pagefind UI script and stylesheet only when the modal is opened for the first time.
     - **i18n**: Filter results to the current language (`ko` or `en`) with Pagefind filtering so Korean pages search Korean posts and English pages search English posts only.
     - **Hidden Filter UI**: Keep the language filter active in the background, but do not show Pagefind's visible filter panel in the UI.
     - **Styling**: Tweak CSS variables (`--pagefind-ui-*`) to match the site's serif, stone-toned, dark-mode-aware aesthetic.
  2. **Update Header (`src/components/Header.astro`)**:
     - Add a simple magnifying glass icon button to the right-side controls, positioned to the **LEFT** of the Language Toggle.
     - Keep the header button itself lightweight. It only needs a stable hook such as a data attribute for opening the modal.
  3. **Update Layout (`src/layouts/Layout.astro`)**:
     - Mount `<SearchModal lang={lang} />` once near the bottom of `<body>`.
     - Apply locale-aware Pagefind metadata such as `data-pagefind-filter="language:..."` at the layout or page level so the generated index can be filtered per locale.
  4. **Modal Behavior (Vanilla JS)**:
     - Keep modal open/close logic inside `src/components/SearchModal.astro`.
     - Open the modal when any `[data-search-open]` trigger is clicked.
     - Close the modal on backdrop click, close button click, or `Escape` key press.
     - Move focus to the Pagefind input after opening.
     - Restore focus to the previously active trigger after closing.
- **Constraints**: 
  - Do NOT build a custom React/Vue component. Use Pagefind's default Vanilla JS UI widget.
  - Keep the initial JS near zero by initializing Pagefind only when needed.
  - Keep search focused on direct retrieval. Do not merge it with category/tag browsing or turn it into a discovery dashboard.
  - Do not expose extra filter UI or advanced search chrome that breaks the minimalist reading experience.
  - Search results should reflect the same assembled display titles that readers see elsewhere on the site, so series subtitles remain searchable through rendered HTML and Pagefind indexing.
