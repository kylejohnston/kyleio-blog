// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

// Dev-only plugin for reading and saving posts
function devPostPlugin() {
  return {
    name: 'dev-post-plugin',
    configureServer(server) {
      // Read endpoint - get raw file content
      server.middlewares.use('/api/read-post', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const url = new URL(req.url, 'http://localhost');
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

          const postsDir = join(process.cwd(), 'src/content/posts');
          let content;
          let filePath;

          try {
            filePath = join(postsDir, `${slug}.mdx`);
            content = await readFile(filePath, 'utf-8');
          } catch {
            filePath = join(postsDir, `${slug}.md`);
            content = await readFile(filePath, 'utf-8');
          }

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
      server.middlewares.use('/api/save-post', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
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

            // Determine file path - try .mdx first, then .md
            const postsDir = join(process.cwd(), 'src/content/posts');
            let filePath = join(postsDir, `${slug}.mdx`);

            try {
              await access(filePath);
            } catch {
              filePath = join(postsDir, `${slug}.md`);
            }

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
  integrations: [mdx(), react()],
  experimental: {
    liveContentCollections: true,
    fonts: [
      {
        provider: fontProviders.google(),
        name: "IBM Plex Mono",
        cssVariable: "--font-mono",
      },
      {
        provider: fontProviders.google(),
        name: "IBM Plex Sans",
        weights: [400, 500],
        cssVariable: "--font-sans",
      },
      {
        provider: fontProviders.google(),
        name: "Newsreader",
        weights: [400, 700],
        cssVariable: "--font-text",
      }
    ]
  },
  vite: {
    plugins: [tailwindcss(), devPostPlugin()]
  },
});
