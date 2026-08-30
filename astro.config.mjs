import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Used for canonical URLs, sitemap & Open Graph (og:url).
  site: 'https://kloa.fans',
  integrations: [
    // P1-2 React Compiler：@astrojs/react 原生暴露 babel 入口，直接透传给其内置
    // @vitejs/plugin-react 实例——不在 vite.plugins 重挂第二个 plugin-react（会与
    // 集成内置实例冲突）。target:'19' 用 react 自带的 compiler-runtime（无运行时垫片）；
    // panicThreshold 默认 'none'：编译不了的组件自动跳过，不阻塞构建（渐进采用）。
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
    sitemap(),
  ],
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
