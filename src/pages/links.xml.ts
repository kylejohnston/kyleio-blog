import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';

export async function GET(context: APIContext) {
  try {
    // Check if the token exists
    const token = import.meta.env.RAINDROP_TOKEN;
    if (!token) {
      console.error('RAINDROP_TOKEN environment variable is not set');
      // Return empty RSS feed instead of crashing
      return rss({
        title: `Kyle Johnston - Links`,
        description: SITE_DESCRIPTION,
        site: `${SITE_URL}/links`,
        items: [],
      });
    }

    const response = await fetch(`https://api.raindrop.io/rest/v1/raindrops/58403513`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error(`Raindrop API error: ${response.status} ${response.statusText}`);
      // Return empty RSS feed instead of crashing
      return rss({
        title: `Kyle Johnston - Links`,
        description: SITE_DESCRIPTION,
        site: `${SITE_URL}/p/links`,
        items: [],
      });
    }

    const data = await response.json();
    
    // Check if data.items exists and is an array
    const links = Array.isArray(data.items) ? data.items : [];

    return rss({
      title: `Kyle Johnston - Links`,
      description: SITE_DESCRIPTION,
      site: `${SITE_URL}/p/links`,
      items: links.map((link: any) => ({
        title: link.title || 'Untitled',
        pubDate: link.created || new Date(),
        description: `<blockquote>${link.excerpt || ''}</blockquote>${link.note ? `<p>${link.note.replace(/\n/g, '<br />')}</p>` : ''}`,
        link: link.link || '#',
      })),
    });
  } catch (error) {
    console.error('Error fetching links from Raindrop.io:', error);
    
    // Return empty RSS feed instead of crashing the build
    return rss({
      title: `Kyle Johnston - Links`,
      description: SITE_DESCRIPTION,
      site: `${SITE_URL}/p/links`,
      items: [],
    });
  }
}