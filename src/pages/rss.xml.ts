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
  "../assets/posts/**/*.webp",
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
      const markdown = post.body
        ?.replace(/^import .+$/gm, '')       // strip import statements
        .replace(/^export .+$/gm, '')         // strip export statements
        .replace(/<[A-Z]\w*[^>]*\/>/g, '')    // strip self-closing JSX components
        .replace(/<[A-Z]\w*[^>]*>[\s\S]*?<\/[A-Z]\w*>/g, '') // strip JSX blocks
        .trim() || '';
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