import { defineLiveCollection } from 'astro:content';
import { RAINDROP_TOKEN } from 'astro:env/server';
import type { LiveLoader } from 'astro/loaders';
import { RAINDROP_COLLECTION_ID } from './consts';

export interface Raindrop {
  id: string;
  title: string;
  link: string;
  created: string;
  tags: string[];
  excerpt?: string;
  note?: string;
  type?: string;
}

interface RaindropApiItem {
  _id: string;
  title: string;
  link: string;
  created: string;
  tags?: string[];
  excerpt?: string;
  note?: string;
  type?: string;
}

async function raindropRequest(
  url: string,
  token: string
): Promise<{ data: any } | { error: Error }> {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { errorMessage?: string };
      return {
        error: new Error(`API Error: ${errorData.errorMessage || response.statusText}`),
      };
    }

    return { data: await response.json() };
  } catch (error) {
    return {
      error: new Error(`Failed to reach Raindrop.io: ${error instanceof Error ? error.message : String(error)}`),
    };
  }
}

function mapRaindrop(item: RaindropApiItem): Raindrop {
  return {
    id: item._id,
    title: item.title,
    link: item.link,
    created: item.created,
    tags: item.tags || [],
    excerpt: item.excerpt || '',
    note: item.note || '',
    type: item.type || 'link',
  };
}

export function raindropLoader(config: { token: string | undefined }): LiveLoader<Raindrop, { id: string }> {
  return {
    name: 'raindrop-loader',
    loadCollection: async () => {
      if (!config.token) {
        return { error: new Error('RAINDROP_TOKEN environment variable is not set') };
      }

      const result = await raindropRequest(
        `https://api.raindrop.io/rest/v1/raindrops/${RAINDROP_COLLECTION_ID}`,
        config.token
      );
      if ('error' in result) return result;

      const items = result.data.items;
      if (!Array.isArray(items)) {
        return { error: new Error('Unexpected API response structure - no items array found') };
      }

      return {
        entries: items.map((item: RaindropApiItem) => ({
          id: item._id,
          data: mapRaindrop(item),
        })),
      };
    },
    loadEntry: async ({ filter }) => {
      if (!config.token) {
        return { error: new Error('RAINDROP_TOKEN environment variable is not set') };
      }

      const result = await raindropRequest(
        `https://api.raindrop.io/rest/v1/raindrop/${filter.id}`,
        config.token
      );
      if ('error' in result) return result;

      const item = result.data.item;
      if (!item) {
        return { error: new Error('Raindrop not found') };
      }

      return { id: item._id, data: mapRaindrop(item) };
    },
  };
}

const raindrops = defineLiveCollection({
  loader: raindropLoader({ token: RAINDROP_TOKEN }),
});

export const collections = { raindrops };
