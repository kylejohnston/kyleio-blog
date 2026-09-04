import fs from 'node:fs';
import path from 'node:path';

export const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

/**
 * Resolve the .mdx or .md file backing a post slug (checking .mdx first).
 * Returns null if neither exists.
 */
export function resolvePostFilePath(slug: string): string | null {
  for (const ext of ['.mdx', '.md']) {
    const filepath = path.join(POSTS_DIR, `${slug}${ext}`);
    if (fs.existsSync(filepath)) return filepath;
  }
  return null;
}
