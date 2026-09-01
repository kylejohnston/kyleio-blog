import { getCollection, type CollectionEntry } from 'astro:content';

export function getPublishedPosts(): Promise<CollectionEntry<'posts'>[]> {
  return getCollection('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
}

export function sortByDate<T extends CollectionEntry<'posts'>>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const dateA = (a.data.tendDate ?? a.data.pubDate).getTime();
    const dateB = (b.data.tendDate ?? b.data.pubDate).getTime();
    return dateB - dateA;
  });
}
