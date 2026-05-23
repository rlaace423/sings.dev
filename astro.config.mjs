// @ts-check
import { defineConfig } from "astro/config";
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
  // Built-in responsive images: every markdown image gets `srcset` + `sizes`
  // for the breakpoints below, scaled to its rendered width. `layout:
  // constrained` keeps the image at its natural size but allows scaling down
  // for smaller viewports — appropriate for editorial content.
  image: {
    layout: "constrained",
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
