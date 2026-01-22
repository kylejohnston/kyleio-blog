import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { formatDateForFrontmatter } from './utils.js';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

export interface PostFrontmatter {
  title: string;
  description: string;
  pubDate: string;
  tendDate?: string;
  tags: string[];
  draft: boolean;
}

export interface Post {
  filename: string;
  filepath: string;
  frontmatter: PostFrontmatter;
  content: string;
}

/**
 * Read all posts from src/content/posts/
 */
export function getAllPosts(): Post[] {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  return files.map(filename => {
    const filepath = path.join(POSTS_DIR, filename);
    const fileContent = fs.readFileSync(filepath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      filename,
      filepath,
      frontmatter: data as PostFrontmatter,
      content,
    };
  });
}

/**
 * Filter to posts with draft: true
 */
export function getDrafts(): Post[] {
  return getAllPosts().filter(post => post.frontmatter.draft === true);
}

/**
 * Extract unique tags from all posts
 */
export function getExistingTags(): string[] {
  const allPosts = getAllPosts();
  const tagSet = new Set<string>();

  for (const post of allPosts) {
    if (post.frontmatter.tags) {
      for (const tag of post.frontmatter.tags) {
        tagSet.add(tag);
      }
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * Write new draft file
 */
export function createPost(filename: string, frontmatter: PostFrontmatter, content: string = ''): string {
  const filepath = path.join(POSTS_DIR, filename);
  const fileContent = matter.stringify(content, frontmatter);
  fs.writeFileSync(filepath, fileContent);
  return filepath;
}

/**
 * Set draft: false and update pubDate or tendDate
 * If tendDate exists, update it (preserving original pubDate)
 * Otherwise, update pubDate
 */
export function publishPost(post: Post): void {
  const now = formatDateForFrontmatter();

  const updatedFrontmatter = { ...post.frontmatter, draft: false };

  if (post.frontmatter.tendDate) {
    updatedFrontmatter.tendDate = now;
  } else {
    updatedFrontmatter.pubDate = now;
  }

  const fileContent = matter.stringify(post.content, updatedFrontmatter);
  fs.writeFileSync(post.filepath, fileContent);
}

/**
 * Update tendDate on a published post
 */
export function updateTendDate(post: Post): void {
  const now = formatDateForFrontmatter();
  const updatedFrontmatter = { ...post.frontmatter, tendDate: now };
  const fileContent = matter.stringify(post.content, updatedFrontmatter);
  fs.writeFileSync(post.filepath, fileContent);
}
