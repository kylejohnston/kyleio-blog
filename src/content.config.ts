import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/posts',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    tendDate: z.date().optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    ogImage: z.string().optional(),
    galleryPath: z.string().optional()
  })
});

export const collections = { posts };
