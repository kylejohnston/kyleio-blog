import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.date(),
    tendDate: z.date().optional(),
    tags: z.array(z.string()),
    draft: z.boolean().optional()
  })
});

export const collections = { posts };