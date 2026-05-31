import type { ImageMetadata } from 'astro';

/**
 * Turn an eager import.meta.glob result into a filename-keyed ImageMetadata map.
 *
 * Usage in any .mdx post:
 *
 *   import { globImages } from '../../lib/globImages';
 *   export const pics = globImages(
 *     import.meta.glob('../../assets/projects/tools/*.webp', { eager: true })
 *   );
 *
 * Then reference individual images anywhere in the body:
 *   <Image src={pics['notebin-01']} alt="Notebin" />
 *
 * Note: import.meta.glob path must be a static string literal in the calling file —
 * Vite resolves globs at build time and cannot accept a dynamic path.
 */
export function globImages(
  glob: Record<string, { default: ImageMetadata }>
): Record<string, ImageMetadata> {
  const map: Record<string, ImageMetadata> = {};
  for (const [path, mod] of Object.entries(glob)) {
    const name = path.split('/').pop()!.replace(/\.\w+$/, '');
    map[name] = mod.default;
  }
  return map;
}
