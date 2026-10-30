// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkPostFigure from "./src/utils/remarkPostFigure.ts";
import remarkAdmonition from "./src/utils/remarkAdmonition.ts";
import rehypeCodeCopyButton from "./src/utils/rehypeCodeCopyButton.ts";
import rehypeMermaid from "rehype-mermaid";
import { mermaidThemeLight, mermaidThemeDark } from "./src/utils/mermaidTheme.ts";
import imageOptimization from "./src/utils/integrationImageOptimization.ts";

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    // Exclude `mermaid` from Shiki so the `language-mermaid` class survives
    // for rehype-mermaid to consume. Without this, Shiki tokenizes mermaid
    // as a programming language, strips the class, and rehype-mermaid finds
    // nothing to render — silently producing no <picture> output.
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid"] },
    // Astro 7 renders Markdown with its native Sätteri pipeline by default,
    // which has no remark/rehype plugin support. The plugins below run on
    // the classic unified pipeline from `@astrojs/markdown-remark`, wired
    // in via `processor` (the old top-level `remarkPlugins` /
    // `rehypePlugins` options are deprecated). `syntaxHighlight` and
    // `shikiConfig` stay top-level: Astro hands them to the processor.
    processor: unified({
      remarkPlugins: [remarkPostFigure, remarkAdmonition],
      rehypePlugins: [
        rehypeCodeCopyButton,
        [
          rehypeMermaid,
          {
            strategy: "img-svg",
            dark: { theme: "base", themeVariables: mermaidThemeDark },
            mermaidConfig: {
              theme: "base",
              themeVariables: mermaidThemeLight,
            },
          },
        ],
      ],
    }),
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "tokyo-night",
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://sings.dev",
  // Astro 7 changed the default from `true` to `"jsx"`, which also drops
  // the whitespace between adjacent inline elements (`<a>…</a> <em>…</em>`
  // renders with the words glued together). Keep the lossless pre-v7
  // compression so every page renders exactly as before; switch to "jsx"
  // deliberately after auditing the templates, not as a side effect of
  // the upgrade.
  compressHTML: true,
  // Built-in responsive images: every markdown image gets `srcset` + `sizes`
  // for the breakpoints below, scaled to its rendered width. `layout:
  // constrained` keeps the image at its natural size but allows scaling down
  // for smaller viewports — appropriate for editorial content.
  //
  // `responsiveStyles: true` opts in to Astro's responsive image CSS —
  // but in practice that CSS is wired in via the `astro:assets`
  // virtual module, which is only loaded when something imports from
  // it. Markdown-only sites like this one never trigger that import,
  // so the rules don't land in the bundle even with this flag on. As
  // a fallback we copy the three essential rules directly into
  // `src/styles/global.css` (search for `data-astro-image` there).
  // Without those rules <img> renders at its intrinsic pixel width
  // and overflows narrow viewports, which on Chrome Android forces a
  // zoom-out of the entire page.
  image: {
    layout: "constrained",
    responsiveStyles: true,
    breakpoints: [400, 640, 800, 1080, 1280, 1600, 2000],
  },
  // Inline the global stylesheet into every page's <head><style> so it
  // arrives in the same response as the HTML, eliminating the
  // render-blocking round-trip to /_astro/Layout.*.css. The cost is ~14 KiB
  // gzipped extra per HTML response (Tailwind output), but it's the same
  // bytes the browser would have fetched anyway plus a saved 100-160ms on
  // slow 4G — net win for LCP without any FOUC risk (no critical/non-critical
  // split, the full sheet is applied synchronously with parse).
  build: {
    inlineStylesheets: "always",
  },
  integrations: [
    sitemap(),
    // Post-build image optimization: generates .avif siblings for every
    // emitted .webp, then rewrites <img src="/_astro/*.webp"> tags in dist
    // HTML to <picture> with AVIF + WebP sources. Marks the first qualifying
    // image per HTML file as the LCP candidate (eager + fetchpriority high).
    imageOptimization({ avifQuality: 60, avifEffort: 4 }),
  ],
});
