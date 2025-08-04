import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';

export async function GET(context: APIContext) {
  const response = await fetch(`https://api.raindrop.io/rest/v1/raindrops/58403513`, {
    headers: {
      "Authorization": `Bearer ${import.meta.env.RAINDROP_TOKEN}`
    }
  });
  const data = await response.json();
  const links = data.items;

  return rss({
    title: `${SITE_TITLE} - Links`,
    description: SITE_DESCRIPTION,
    site: `${SITE_URL}/links`,
    items: links.map((link: any) => ({
      title: link.title,
      pubDate: link.created,
      description: `<blockquote>${link.excerpt}</blockquote>${link.note ? `<p>${link.note.replace(/\n/g, '<br />')}</p>` : ''}`,
      link: link.link,
    })),
  });
}