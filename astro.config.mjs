// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://kyleio.com',
  integrations: [mdx()],
  experimental: {
    liveContentCollections: true,
    fonts: [
      {
        provider: fontProviders.google(),
        name: "IBM Plex Mono",
        cssVariable: "--font-mono",
      },
      {
        provider: fontProviders.google(),
        name: "IBM Plex Sans",
        weights: [400, 500],
        cssVariable: "--font-sans",
      },
      {
        provider: fontProviders.google(),
        name: "Newsreader",
        weights: [400, 700],
        cssVariable: "--font-text",
      }
    ]
},
vite: {
  plugins: [tailwindcss()]
},
});