import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
	// Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    tendDate: z.date().optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false)
  })
});

export const collections = { posts };