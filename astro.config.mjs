// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

// Dev-only plugin for saving posts
function devSavePostPlugin() {
  return {
    name: 'dev-save-post',
    configureServer(server) {
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
  integrations: [mdx()],
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
    plugins: [tailwindcss(), devSavePostPlugin()]
  },
});
