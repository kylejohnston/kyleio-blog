// src/integrations/rssFullText.js

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function renderMdxToHtml(content) {
  const compiled = await compile(content, {
    outputFormat: 'program',
    esm: true,
    rehypePlugins: [rehypeSlug, rehypeHighlight],
    remarkPlugins: [remarkGfm],
  });

  // Write to a temporary file
  const hash = crypto.createHash('md5').update(content).digest('hex');
  const tempFile = path.join(os.tmpdir(), `mdx-${hash}.mjs`);
  fs.writeFileSync(tempFile, String(compiled), 'utf-8');

  // Import the compiled module
  const { default: Content } = await import(`file://${tempFile}`);
  const html = renderToStaticMarkup(React.createElement(Content, {}));

  // Clean up the temp file
  fs.unlinkSync(tempFile);

  return html;
}

export default function rssFullTextIntegration(options = {}) {
  const {
    postsDir = path.join(__dirname, '../content/posts'),
    output = 'rss.xml',
    siteUrl = 'https://kyleio.com',
    channel = {
      title: 'Kyle IO, a creative journal',
      description: "A collection of things I've made, written, and that spark my curiosity",
      language: 'en-us'
    }
  } = options;

  return {
    name: 'astro-rss-fulltext',
    hooks: {
      'astro:build:done': async () => {
        const files = fs.readdirSync(postsDir)
          .filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

        if (files.length === 0) {
          console.warn('[astro-rss-fulltext] No posts found in', postsDir);
        }

        const items = [];

        for (const filename of files) {
          const ext = path.extname(filename);
          const filePath = path.join(postsDir, filename);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const { data, content } = matter(raw);

          // Skip drafts
          if (data.draft) continue;

          // Generate slug from filename (remove extension)
          const slug = filename.replace(/\.mdx?$/, '');

          // Use pubDate (required)
          if (!data.title || !data.pubDate) continue;

          // Render HTML
          let html = '';
          try {
            if (ext === '.mdx') {
              html = await renderMdxToHtml(content);
            } else {
              const file = await unified()
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkRehype)
                .use(rehypeSlug)
                .use(rehypeHighlight)
                .use(rehypeStringify)
                .process(content);
              html = String(file);
            }
          } catch (err) {
            console.error(`[astro-rss-fulltext] Error rendering ${filename}:`, err);
            continue;
          }

          // Optionally, rewrite image URLs to be absolute in the RSS feed
          const htmlWithAbsoluteImages = html.replace(
            /<img([^>]+)src="\/assets\//g,
            `<img$1src="${siteUrl}/assets/`
          );

          // Find first image in HTML (now with absolute URLs)
          const imgMatch = htmlWithAbsoluteImages.match(/<img[^>]+src="([^">]+)"/);
          const imageUrl = imgMatch ? imgMatch[1] : null;

          items.push(`
            <item>
              <title><![CDATA[${data.title}]]></title>
              <link>${siteUrl}/p/${slug}</link>
              <guid>${siteUrl}/p/${slug}</guid>
              <pubDate>${new Date(data.pubDate).toUTCString()}</pubDate>
              ${imageUrl ? `<enclosure url="${imageUrl}" type="image/jpeg" />` : ''}
              <description><![CDATA[${htmlWithAbsoluteImages}]]></description>
            </item>
          `);
        }

        const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${channel.title}</title>
    <link>${siteUrl}</link>
    <description>${channel.description}</description>
    <language>${channel.language}</language>
    ${items.join('\n')}
  </channel>
</rss>`;

        const outPath = path.join(process.cwd(), 'dist', output);
        fs.writeFileSync(outPath, rss, 'utf-8');
        console.log(`[astro-rss-fulltext] RSS feed generated at dist/${output}`);
      }
    }
  };
}
