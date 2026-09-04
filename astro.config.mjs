// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import embeds from 'astro-embed/integration';
import { unified } from '@astrojs/markdown-remark';
import { POSTS_DIR, resolvePostFilePath } from './scripts/lib/postPath.js';

// Dev-only plugin for reading and saving posts
function devPostPlugin() {
  return {
    name: 'dev-post-plugin',
    /** @param {import('vite').ViteDevServer} server */
    configureServer(server) {
      // Read endpoint - get raw file content
      server.middlewares.use('/api/read-post', async (
        /** @type {import('node:http').IncomingMessage} */ req,
        /** @type {import('node:http').ServerResponse} */ res
      ) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const slug = url.searchParams.get('slug');

          if (!slug) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing slug' }));
            return;
          }

          // Reject path traversal attempts
          if (slug.includes('/') || slug.includes('\\') || slug.startsWith('.')) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid slug' }));
            return;
          }

          const filePath = resolvePostFilePath(slug);
          if (!filePath) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Post not found' }));
            return;
          }
          const content = await readFile(filePath, 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content }));
        } catch (error) {
          console.error('Read error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read file' }));
        }
      });

      // Save endpoint
      server.middlewares.use('/api/save-post', async (
        /** @type {import('node:http').IncomingMessage} */ req,
        /** @type {import('node:http').ServerResponse} */ res
      ) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (/** @type {Buffer} */ chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { slug, content } = JSON.parse(body);

            if (!slug || typeof content !== 'string') {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing slug or content' }));
              return;
            }

            // Reject path traversal attempts and hidden files
            // Allow dots, underscores, and hyphens in slugs
            if (slug.includes('/') || slug.includes('\\') || slug.startsWith('.')) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid slug' }));
              return;
            }

            // Default new posts to .mdx; existing posts keep their extension.
            const filePath = resolvePostFilePath(slug) ?? join(POSTS_DIR, `${slug}.mdx`);

            await writeFile(filePath, content, 'utf-8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error('Save error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to save' }));
          }
        });
      });
    }
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://kyleio.com',
  prefetch: true,
  adapter: cloudflare({
    // 'compile' keeps image transforms happening at build time for
    // prerendered routes, matching current behavior. Revisit once
    // on-demand routes need runtime image transforms (would need the
    // 'cloudflare-binding' service).
    imageService: 'compile',
    // rss.xml.ts renders MDX at build time via astro/container +
    // @astrojs/mdx/container-renderer; that fails to resolve under the
    // adapter's default 'workerd' prerender sandbox ("No such module
    // chunks/@astrojs/mdx/server.js"). 'node' matches pre-adapter behavior
    // for build-time prerendering; on-demand routes still run on workerd.
    prerenderEnvironment: 'node',
  }),
  env: {
    schema: {
      RAINDROP_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  markdown: {
    // astro-embed's astro-auto-import integration only works with the
    // remark/rehype pipeline, not the new Satteri default processor.
    processor: unified(),
  },
  integrations: [embeds(), mdx(), react()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: "At Umami",
      cssVariable: "--at-umami",
      options: {
        variants: [{
          weight: '100 900',
          style: 'normal',
          src: ['./src/assets/fonts/AtUmamiVAR.woff2'],
        }],
      },
    },
    {
      provider: fontProviders.local(),
      name: "At Textual",
      cssVariable: "--at-textual",
      options: {
        variants: [{
          weight: '60 150',
          style: 'normal',
          src: ['./src/assets/fonts/AtTextualVAR.woff2'],
        }],
      },
    },
    {
      provider: fontProviders.google(),
      name: "IBM Plex Mono",
      cssVariable: "--font-mono",
    },
    {
      provider: fontProviders.google(),
      name: "IBM Plex Sans",
      weights: [400, 500],
      cssVariable: "--at-sans",
    },
    {
      provider: fontProviders.google(),
      name: "Newsreader",
      weights: [400, 700],
      cssVariable: "--font-text",
    }
  ],
  vite: {
    plugins: [tailwindcss(), devPostPlugin()]
  },
});
