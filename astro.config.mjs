import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractInlineScriptTexts } from './worker/_lib/csp';

// CSP union 构建守卫（final review 跟进）：运行时 CSP 的内联脚本 hash 白名单
// 来自「sitemap 爬取的页面 + /404.html」（worker/_lib/csp.ts），而 dist 里实际
// 存在的 HTML 页面是文件系统事实——两者一旦不一致，必有页面的内联脚本不进
// 白名单 = 该页上线即被 CSP 拦截（脚本不执行、功能死）。CI 的 e2e 走 astro
// preview 不经 worker、CSP 单测用合成 fixture，都覆盖不到该缺口，构建时对账
// 是唯一防线：文件系统级脚本并集必须与 sitemap 模拟运行时并集完全相等。
function cspUnionGuard() {
  return {
    name: 'csp-union-guard',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        // node: 内置模块必须顶层静态 import：astro:build:done 时 Vite module
        // runner 已关闭，钩子内动态 import 会抛 "module runner has been closed"
        const dist = new URL(dir).pathname;

        async function walkHtml(d) {
          const out = [];
          for (const e of await readdir(d, { withFileTypes: true })) {
            const p = join(d, e.name);
            if (e.isDirectory()) out.push(...(await walkHtml(p)));
            else if (e.name.endsWith('.html')) out.push(p);
          }
          return out;
        }

        const enc = new TextEncoder();
        const sha256 = async (text) => {
          const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
          return btoa(String.fromCharCode(...new Uint8Array(digest)));
        };

        // hash → 来源描述（报错时定位到页面 + 脚本开头）
        async function unionOf(pagePaths, read) {
          const map = new Map();
          for (const p of pagePaths) {
            const html = await read(p);
            if (html === null) continue;
            for (const text of extractInlineScriptTexts(html)) {
              map.set(await sha256(text), `${p} …${text.trim().slice(0, 50)}`);
            }
          }
          return map;
        }

        const allHtml = await walkHtml(dist);
        const fsUnion = await unionOf(allHtml, (p) => readFile(p, 'utf8'));

        // 模拟运行时：sitemap-index → 子图 → 页面路径（+ /404.html），与
        // worker/_lib/csp.ts pagePathsFromSitemap 同构。sitemap 的 <loc> 是
        // 目录形式（/music/），读文件须复刻 CF 资产层的 目录→index.html 映射
        // （运行时 ASSETS.fetch 自动做，这里手动补）
        const toFile = (pathname) =>
          join(dist, (pathname.endsWith('/') ? `${pathname}index.html` : pathname).slice(1));
        const readAsset = async (pathname) => {
          try {
            return await readFile(toFile(pathname), 'utf8');
          } catch {
            return null;
          }
        };
        const indexXml = await readAsset('/sitemap-index.xml');
        if (indexXml === null) {
          throw new Error(
            '[csp-union-guard] dist 缺 sitemap-index.xml——运行时 CSP 会降级 unsafe-inline，先修 sitemap 集成',
          );
        }
        const locRe = /<loc>([^<]+)<\/loc>/g;
        const childSitemaps = [...indexXml.matchAll(locRe)]
          .map(([m, loc]) => new URL(loc).pathname)
          .filter((p) => p.endsWith('.xml'));
        const pagePaths = [...new Set(
          (await Promise.all(childSitemaps.map(async (sp) => {
            const xml = await readAsset(sp);
            return xml === null ? [] : [...xml.matchAll(locRe)].map(([m, loc]) => new URL(loc).pathname);
          }))).flat(),
        )].concat('/404.html');
        const rtUnion = await unionOf(pagePaths, readAsset);

        const missing = [...fsUnion.keys()].filter((h) => !rtUnion.has(h));
        if (missing.length > 0) {
          const detail = missing.map((h) => `  - ${fsUnion.get(h)} [${h.slice(0, 12)}…]`).join('\n');
          throw new Error(
            `[csp-union-guard] ${missing.length} 个内联脚本在 dist 存在但不在 sitemap 爬取范围内——\n` +
            '运行时 CSP 白名单会漏掉它们，对应页面上线后脚本被拦（功能死）。\n' +
            `常见原因：新页面未被 sitemap 收录。涉事脚本：\n${detail}`,
          );
        }
        // 反向差集（sitemap 有而 dist 无）不致命（那页 404），仅提示
        const stale = [...rtUnion.keys()].filter((h) => !fsUnion.has(h));
        if (stale.length > 0) logger.warn(`sitemap 含 ${stale.length} 个 dist 已不存在的脚本 hash（无害，提示）`);
        logger.info(`通过：${fsUnion.size} 个内联脚本全部在运行时白名单并集内`);
      },
    },
  };
}

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
    // 放 sitemap 之后：astro:build:done 需要读它产出的 sitemap 文件
    cspUnionGuard(),
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
