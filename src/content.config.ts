import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { TAGS } from './consts';

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
    tags: z.array(z.enum(TAGS)),
    draft: z.boolean().default(false),
    ogImage: z.string().optional(),
    galleryPath: z.string().optional(),
    // id of an earlier post on this site that this post replies to.
    // Astro checks the id exists; thread rules (published parent,
    // date order, no pages) are enforced in src/lib/threads.ts.
    inReplyTo: reference('posts').optional()
  })
});

export const collections = { posts };
