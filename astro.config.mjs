import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Used for canonical URLs, sitemap & Open Graph (og:url).
  site: 'https://kloa.fans',
  integrations: [react(), sitemap()],
  output: 'static',
  // Prefetch: 全站仅 9 个页面、总体积 <1MB，全量预取代价≈0——hover 即预取，
  // 配合 ClientRouter 软导航实现近零延迟跳转（P1-1）。
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  // Tailwind v4 via its official Vite plugin (replaces @tailwindcss/postcss,
  // which clashed with Vite 8's postcss-import). v4 ships its own prefixing,
  // so autoprefixer is no longer needed.
  vite: {
    plugins: [tailwindcss()],
  },
});
