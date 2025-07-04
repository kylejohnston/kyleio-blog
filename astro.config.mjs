// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import rssFullTextIntegration from './src/integrations/rssFullText.js';


// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx(),
    rssFullTextIntegration({
      postsDir: './src/content/posts', // adjust if needed
      output: 'rss.xml',
      siteUrl: 'https://kyleio.com',
      channel: {
        title: 'Kyle IO, a creative journal',
        description: 'A collection of things I\'ve made, written, and that spark my curiosity',
        language: 'en-us'
      }
    })
 ],
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "IBM Plex Mono",
        cssVariable: "--font-plex-mono",
      },
      {
        provider: fontProviders.google(),
        name: "IBM Plex Sans",
        weights: [400, 500],
        cssVariable: "--font-plex-sans",
      },
      {
        provider: "local",
        name: "Custom",
        cssVariable: "--font-custom",
        variants: [
            {
                weight: 400,
                style: "normal",
                src: ["./src/assets/fonts/Ginestra-Black.otf"]
            }]
        }
    ]
},
vite: {
  plugins: [tailwindcss()]
},
site: 'https://kyleio.com',
});