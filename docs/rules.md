# Project Rules & Constraints

1. **Dependency Constraint (CRITICAL)**: 
   - DO NOT install any new npm packages (like React, Vue, Framer Motion, etc.) without explicit permission.
   - The currently approved stack is Astro, Tailwind CSS, vanilla JS/TS, and `pagefind` for static search indexing only.
   - Do not add heavier client-side UI frameworks or search libraries when the same job can be done with Astro, Tailwind, vanilla JS, and `pagefind`.

2. **Tech Stack**:
   - Framework: Astro (Static Site Generation)
   - Styling: Tailwind CSS
   - Scripting: Vanilla TypeScript/JavaScript
   - Search: Pagefind (static, build-time indexing)

3. **Architecture & Philosophy**:
   - Zero JS by default. Maximize readability and fast loading.
   - Add client-side JS only when there is a clear UX need, and keep it small, framework-free, and progressively enhanced.
   - Minimalist design. Focus on typography and content over flashy UI.
