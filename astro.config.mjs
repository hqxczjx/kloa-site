import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Used for canonical URLs, sitemap & Open Graph (og:url).
  site: 'https://kloa.fans',
  integrations: [react(), sitemap()],
  output: 'static',
  // Prefetch: links entering the viewport are fetched ahead of time so page
  // navigation is near-instant on this fully static site.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  // Tailwind v4 via its official Vite plugin (replaces @tailwindcss/postcss,
  // which clashed with Vite 8's postcss-import). v4 ships its own prefixing,
  // so autoprefixer is no longer needed.
  vite: {
    plugins: [tailwindcss()],
  },
});
