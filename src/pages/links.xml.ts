import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getLiveCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_URL } from '../consts';

export async function GET(context: APIContext) {
  const { entries: raindrops, error } = await getLiveCollection('raindrops');

  if (error) {
    console.error('Error fetching links from Raindrop.io:', error.message);
  }

  const items = (raindrops ?? []).map((raindrop) => ({
    title: raindrop.data.title || 'Untitled',
    pubDate: new Date(raindrop.data.created),
    description: `<blockquote>${raindrop.data.excerpt || ''}</blockquote>${raindrop.data.note ? `<p>${raindrop.data.note.replace(/\n/g, '<br />')}</p>` : ''}`,
    link: raindrop.data.link || '#',
  }));

  return rss({
    title: `Kyle Johnston - Links`,
    description: SITE_DESCRIPTION,
    site: `${SITE_URL}/p/links`,
    items,
  });
}
