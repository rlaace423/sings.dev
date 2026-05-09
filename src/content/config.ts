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
		summary: z.string().optional(),
		draft: z.boolean().optional().default(false),
		series: z
			.object({
				id: z.string(),
				index: z.number().int().positive(),
				total: z.number().int().positive(),
				subtitle: z.string().optional(),
			})
			.optional(),
	}),
});

const pages = defineCollection({
	loader: glob({ base: "./src/content/pages", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		identity: z
			.object({
				name: z.string(),
				tagline: z.string(),
				homeSummary: z.string(),
				summary: z.string(),
				photo: z.object({
					src: z.string(),
					alt: z.string(),
				}),
				socials: z
					.array(
						z.object({
							type: z.enum(["github", "email", "linkedin", "instagram"]),
							href: z.string(),
							label: z.string().optional(),
						}),
					)
					.default([]),
				education: z
					.array(
						z.object({
							school: z.string(),
							degree: z.string(),
							start: z.string().optional(),
							end: z.string().optional(),
							description: z.string().optional(),
						}),
					)
					.default([]),
				experience: z
					.array(
						z.object({
							company: z.string(),
							role: z.string(),
							start: z.string(),
							end: z.string(),
							description: z.string(),
						}),
					)
					.default([]),
			})
			.optional(),
	}),
});

export const collections = { blog, pages };
