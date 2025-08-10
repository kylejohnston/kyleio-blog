// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';


// https://astro.build/config
export default defineConfig({
  site: 'https://kyleio.com',
  // output: 'static', // Allows static pages + API routes
  adapter: cloudflare(),
  integrations: [mdx()],
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
});