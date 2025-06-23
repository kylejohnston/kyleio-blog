import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
  const blog = await getCollection('posts');
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      // Compute RSS link from post `id`
      // This example assumes all posts are rendered as `/blog/[id]` routes
      link: `/p/${post.slug}/`,
    })),
  });
}


// import rss from '@astrojs/rss';
// import { getCollection } from 'astro:content';
// import sanitizeHtml from 'sanitize-html';
// import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
// import MarkdownIt from 'markdown-it';
// const parser = new MarkdownIt();

// export async function GET(context) {
//   const posts = await getCollection('posts', ({ data }) => {
//     return !data.draft;
//   });

//   return rss({
//     title: SITE_TITLE,
//     description: SITE_DESCRIPTION,
//     site: context.site,
//     xmlns: {
//       content: "http://purl.org/rss/1.0/modules/content/",
//       dc: "http://purl.org/dc/elements/1.1/",
//       atom: "http://www.w3.org/2005/Atom"
//     },
//     items: posts
//       .sort((a, b) => {
//         const dateA = a.data.tendDate?.getTime() || a.data.pubDate.getTime();
//         const dateB = b.data.tendDate?.getTime() || b.data.pubDate.getTime();
//         return dateB - dateA;
//       })
//       .map((post) => ({
//         link: `/p/${post.slug}/`,
//         content: sanitizeHtml(parser.render(post.body), {
//           allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img'])
//         }),
//         ...post.data
//       })),
//     customData: `<atom:link href="${context.site}rss.xml" rel="self" type="application/rss+xml" />`
//   });
// }