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
  integrations: [sitemap()],
});
