// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkPostFigure from "./src/utils/remarkPostFigure.ts";
import remarkAdmonition from "./src/utils/remarkAdmonition.ts";
import rehypeCodeCopyButton from "./src/utils/rehypeCodeCopyButton.ts";
import rehypeMermaid from "rehype-mermaid";
import { mermaidThemeLight, mermaidThemeDark } from "./src/utils/mermaidTheme.ts";

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
          // `flowchart.padding` adds inset to each node box so site fonts
          // (Pretendard) — which are slightly wider than the build-time
          // Chromium fallback (Helvetica) used to measure text width —
          // don't overflow. Default is 8; 14 absorbs the typical mismatch.
          dark: {
            theme: "base",
            themeVariables: mermaidThemeDark,
            flowchart: { padding: 14 },
          },
          mermaidConfig: {
            theme: "base",
            themeVariables: mermaidThemeLight,
            flowchart: { padding: 14 },
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
  integrations: [sitemap()],
});
