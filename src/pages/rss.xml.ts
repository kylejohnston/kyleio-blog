import { getContainerRenderer as getMDXRenderer } from "@astrojs/mdx";
import rss, { type RSSFeedItem } from "@astrojs/rss";
import type { APIContext } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { getCollection } from "astro:content";
import { micromark } from "micromark";
import { transform, walk } from "ultrahtml";
import sanitize from "ultrahtml/transformers/sanitize";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "../consts";

// Eagerly import all gallery images so we can include them in RSS feeds.
const allGalleryImages = import.meta.glob<{ default: ImageMetadata }>(
  ["../assets/posts/**/*.webp", "../assets/projects/**/*.webp"],
  { eager: true }
);

function getGalleryHtml(galleryPath: string, baseUrl: string): string {
  const images = Object.entries(allGalleryImages)
    .filter(([path]) => path.includes(`/${galleryPath}/`))
    .sort(([a], [b]) => a.localeCompare(b));

  if (images.length === 0) return "";

  const imgTags = images
    .map(([path, mod]) => {
      const filename =
        path.split("/").pop()?.replace(/\.\w+$/, "") || "";
      const alt = filename
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const src = mod.default.src.startsWith("/")
        ? baseUrl + mod.default.src
        : mod.default.src;
      return `<img src="${src}" alt="${alt}" width="${mod.default.width}" height="${mod.default.height}" />`;
    })
    .join("\n");

  return `<div>${imgTags}</div>`;
}

// Remove MDX/JSX components (<Capital ... /> or <Capital ...>...</Capital>) from
// a markdown body. Unlike a plain regex, this scanner respects strings, template
// literals, and `{...}` JSX expressions, so `>` characters inside props (e.g.
// embedded HTML in a `captions` object) don't terminate the match prematurely.
function stripMdxComponents(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    if (input[i] === "<" && /[A-Z]/.test(input[i + 1] ?? "")) {
      const end = skipComponent(input, i);
      if (end > i) {
        i = end;
        continue;
      }
    }
    out += input[i];
    i++;
  }
  return out;
}

function skipComponent(input: string, start: number): number {
  let p = start + 1;
  const nameStart = p;
  while (p < input.length && /[A-Za-z0-9_.]/.test(input[p])) p++;
  const name = input.slice(nameStart, p);
  if (!name || !/^[A-Z]/.test(name)) return start;

  const opening = readTagBody(input, p);
  if (!opening) return start;
  if (opening.selfClosing) return opening.end;

  let depth = 1;
  let q = opening.end;
  while (q < input.length) {
    if (input[q] === "<") {
      // Closing tag </Name>?
      if (
        input[q + 1] === "/" &&
        input.slice(q + 2, q + 2 + name.length) === name
      ) {
        const after = input[q + 2 + name.length];
        if (after === ">" || after === undefined || /\s/.test(after)) {
          const close = input.indexOf(">", q + 2 + name.length);
          if (close === -1) return start;
          depth--;
          if (depth === 0) return close + 1;
          q = close + 1;
          continue;
        }
      }
      // Nested same-name opening tag?
      if (input.slice(q + 1, q + 1 + name.length) === name) {
        const after = input[q + 1 + name.length] ?? "";
        if (after === ">" || after === "/" || /\s/.test(after)) {
          const nested = readTagBody(input, q + 1 + name.length);
          if (nested) {
            if (!nested.selfClosing) depth++;
            q = nested.end;
            continue;
          }
        }
      }
    }
    q++;
  }
  return start;
}

function readTagBody(
  input: string,
  p: number
): { end: number; selfClosing: boolean } | null {
  let braces = 0;
  let str: string | null = null;
  while (p < input.length) {
    const c = input[p];
    if (str !== null) {
      if (c === "\\") {
        p += 2;
        continue;
      }
      if (c === str) str = null;
      p++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      str = c;
      p++;
      continue;
    }
    if (c === "{") {
      braces++;
      p++;
      continue;
    }
    if (c === "}") {
      if (braces > 0) braces--;
      p++;
      continue;
    }
    if (braces === 0) {
      if (c === "/" && input[p + 1] === ">") return { end: p + 2, selfClosing: true };
      if (c === ">") return { end: p + 1, selfClosing: false };
    }
    p++;
  }
  return null;
}

export async function GET(context: APIContext) {
  // Get the URL to prepend to relative site links. Based on `site` in `astro.config.mjs`.
  let baseUrl = context.site?.href || "https://kyleio.com";
  if (baseUrl.at(-1) === "/") baseUrl = baseUrl.slice(0, -1);

  // Load MDX renderer for container rendering.
  const renderers = await loadRenderers([getMDXRenderer()]);

  // Create a new Astro container that we can render components with.
  // See https://docs.astro.build/en/reference/container-reference/
  const container = await AstroContainer.create({ renderers });

  // Load the content collection entries to add to our RSS feed.
  const posts = (await getCollection("posts", ({ data, id }) => {
    // Exclude drafts and the links page
    return !data.draft && id !== 'links.mdx' && id !== 'about.md';
  })).sort((a, b) => {
    const dateA = a.data.tendDate || a.data.pubDate;
    const dateB = b.data.tendDate || b.data.pubDate;
    return dateA > dateB ? -1 : 1;
  });

  // Add RSS footer template
  const getRssFooter = (postUrl: string) => `
    <hr />
    <p style="font-size: 0.875em; color: #666;">
      Thank you for using RSS!
      <a href="mailto:hello@flow14.com">Reply via email</a>
      or <a href="${postUrl}">view this post on the web</a>.
    </p>
  `;

  // Loop over blog posts to create feed items
  const feedItems: RSSFeedItem[] = [];
  for (const post of posts) {
    let rawContent: string;
    const hasComponents = /^import .+from\s+['"]\.\.\/.*\.(?:astro|tsx|jsx)['"]/m.test(post.body || '');
    if (hasComponents) {
      // Posts with component imports can't render in the container.
      // Strip MDX syntax and render the markdown body directly.

      // Pre-pass: convert <YouTube id="X" params="start=N" /> to linked thumbnail HTML
      // before the JSX stripping regex removes them entirely.
      const bodyWithYouTube = post.body?.replace(
        /<YouTube\s+id="([^"]+)"(?:\s+params="([^"]*)")?\s*\/>/g,
        (_, videoId, params) => {
          const startMatch = params?.match(/start=(\d+)/);
          const href = startMatch
            ? `https://www.youtube.com/watch?v=${videoId}&t=${startMatch[1]}`
            : `https://www.youtube.com/watch?v=${videoId}`;
          return `<a href="${href}"><img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" alt="Watch on YouTube" /></a>`;
        }
      ) || '';

      const markdown = stripMdxComponents(
        bodyWithYouTube
          .replace(/^import .+$/gm, '')   // strip import statements
          .replace(/^export .+$/gm, '')   // strip export statements
      ).trim();
      const markdownHtml = micromark(markdown);
      if (post.data.galleryPath) {
        const galleryHtml = getGalleryHtml(post.data.galleryPath, baseUrl);
        const galleryNote = `<p><em>This post includes an interactive image gallery — <a href="${baseUrl}/p/${post.slug}/">view it on the web</a> for the full experience.</em></p>`;
        rawContent = galleryNote + markdownHtml + galleryHtml;
      } else {
        const galleryNote = `<p><em>This post includes an image gallery — <a href="${baseUrl}/p/${post.slug}/">view it on the web</a>.</em></p>`;
        rawContent = galleryNote + markdownHtml;
      }
    } else {
      const { Content } = await post.render();
      rawContent = await container.renderToString(Content);
    }
    const postUrl = `${baseUrl}/p/${post.slug}/`;

    const content = await transform(rawContent.replace(/^<!DOCTYPE html>/, ''), [
      async (node) => {
        await walk(node, (node) => {
          if (node.name === "a" && node.attributes.href?.startsWith("/")) {
            node.attributes.href = baseUrl + node.attributes.href;
          }
          if (node.name === "img" && node.attributes.src?.startsWith("/")) {
            node.attributes.src = baseUrl + node.attributes.src;
          }
          if (node.name === "lite-youtube") {
            const videoId = node.attributes.videoid;
            const params = node.attributes.params;
            const startMatch = params?.match(/start=(\d+)/);
            const href = startMatch
              ? `https://www.youtube.com/watch?v=${videoId}&t=${startMatch[1]}`
              : `https://www.youtube.com/watch?v=${videoId}`;
            node.name = "a";
            node.attributes = { href };
            node.children = [
              {
                type: 1, // element node
                name: "img",
                attributes: {
                  src: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                  alt: "Watch on YouTube",
                },
                children: [],
              },
            ];
          }
        });
        return node;
      },
      sanitize({ dropElements: ["script", "style"] }),
    ]);

    // Add footer to content
    const contentWithFooter = content + getRssFooter(postUrl);

    feedItems.push({
      ...post.data,
      link: `/p/${post.slug}/`,
      content: contentWithFooter
    });
  }

  // Return our RSS feed XML response.
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: SITE_URL,
    items: feedItems,
  });
}
