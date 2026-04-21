// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkPostFigure from "./src/utils/remarkPostFigure.ts";

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
    remarkPlugins: [remarkPostFigure],
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
