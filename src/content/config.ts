import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
	loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		category: z.string(),
		tags: z.array(z.string()).optional(),
	}),
});

const pages = defineCollection({
	loader: glob({ base: "./src/content/pages", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
	}),
});

export const collections = { blog, pages };
