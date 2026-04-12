# Spec: Global Search Modal (Pagefind)

- **Goal**: Implement a site-wide global search that opens in a focused, Spotlight-like modal overlay.
- **Library Requirements**: 
  - Install `pagefind` as a dev dependency.
  - Update `package.json` build script to generate the index: `"build": "astro build && pagefind --site dist"`
- **Components to Create**:
  1. **`src/components/SearchModal.astro`**:
     - **Layout**: Use Tailwind to create a full-screen, semi-transparent backdrop (`fixed inset-0 bg-black/50 z-50`). Clicking this backdrop must close the modal.
     - **Modal Box**: A centered container (`max-w-xl mx-auto mt-24 p-4`).
     - **Pagefind UI**: Render the default `pagefind-ui` widget inside this box.
     - **i18n**: Ensure search results are filtered by the current language (`ko` or `en`) using Pagefind's data attribute filtering.
     - **Styling**: Tweak CSS variables (`--pagefind-ui-*`) to match the site's dark/minimalist aesthetic.
  2. **Update Header (`src/components/Header.astro`)**:
     - Add a simple magnifying glass icon (`<button id="search-trigger">`) to the main navigation, positioned to the **LEFT** of the Language Toggle.
     - Include a vanilla JS `<script>` to handle logic:
       - Open modal on `#search-trigger` click.
       - Close modal on backdrop click or 'Escape' key press.
       - Focus the search input automatically when opened.
- **Constraints**: 
  - Do NOT build a custom React/Vue component. Use Pagefind's default Vanilla JS UI widget.
  - Keep the initial JS zero by initializing Pagefind only when needed or letting its native script handle it gracefully within the modal.
