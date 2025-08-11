import { defineLiveCollection } from 'astro:content';
import type { LiveLoader } from 'astro/loaders';

interface Raindrop {
  id: string;
  title: string;
  link: string;
  created: string;
  tags: string[];
  excerpt?: string;
  note?: string;
  type?: string;
}

export function raindropLoader(config: { token: string }): LiveLoader<Raindrop> {
  return {
    name: 'raindrop-loader',
    loadCollection: async () => {
      try {
        // Check if token exists
        if (!config.token) {
          return {
            error: new Error('RAINDROP_TOKEN environment variable is not set'),
          };
        }

        const response = await fetch('https://api.raindrop.io/rest/v1/raindrops/58403513', {
          headers: {
            Authorization: `Bearer ${config.token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          return {
            error: new Error(`API Error: ${errorData.errorMessage || response.statusText}`),
          };
        }

        const data = await response.json();

        // Check if data structure is as expected
        if (!data.items || !Array.isArray(data.items)) {
          return {
            error: new Error('Unexpected API response structure - no items array found'),
          };
        }

        return {
          entries: data.items.map((item: any) => ({
            id: item._id,
            data: {
              id: item._id,
              title: item.title,
              link: item.link,
              created: item.created,
              tags: item.tags || [],
              excerpt: item.excerpt || '',
              note: item.note || '',
              type: item.type || 'link',
            },
          })),
        };
      } catch (error) {
        return {
          error: new Error(`Failed to load raindrops: ${error instanceof Error ? error.message : String(error)}`),
        };
      }
    },
    loadEntry: async ({ filter }) => {
      try {
        if (!config.token) {
          return {
            error: new Error('RAINDROP_TOKEN environment variable is not set'),
          };
        }

        // Note: This endpoint gets a specific raindrop by ID
        const response = await fetch(`https://api.raindrop.io/rest/v1/raindrop/${filter.id}`, {
          headers: {
            Authorization: `Bearer ${config.token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          return {
            error: new Error(`API Error: ${errorData.errorMessage || response.statusText}`),
          };
        }

        const data = await response.json();
        
        if (!data.item) {
          return {
            error: new Error('Raindrop not found'),
          };
        }

        return {
          id: data.item._id,
          data: {
            id: data.item._id,
            title: data.item.title,
            link: data.item.link,
            created: data.item.created,
            tags: data.item.tags || [],
          },
        };
      } catch (error) {
        return {
          error: new Error(`Failed to load raindrop: ${error instanceof Error ? error.message : String(error)}`),
        };
      }
    },
  };
}

// Try multiple ways to access the token
const token = process.env.RAINDROP_TOKEN || 
             import.meta.env.RAINDROP_TOKEN || 
             import.meta.env.PUBLIC_RAINDROP_TOKEN;

const raindrops = defineLiveCollection({
  loader: raindropLoader({
    token: token as string,
  }),
});

export const collections = { raindrops };