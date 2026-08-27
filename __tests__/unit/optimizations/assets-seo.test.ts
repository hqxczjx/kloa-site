import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { readSrc, srcPath } from './helpers';
describe('资源与 SEO 补全', () => {
  it('favicon.svg 存在（BaseLayout 已引用，原缺失 404）', () => {
    expect(existsSync(srcPath('public/favicon.svg'))).toBe(true);
  });

  it('配置了 site URL（SEO canonical / sitemap 基础）', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/site\s*:\s*['"]https?:\/\//);
  });

  it('集成了 sitemap（astro.config）', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/sitemap/);
  });

  it('BaseLayout 含 Open Graph meta（社交分享预览）', () => {
    const layout = readSrc('src/layouts/BaseLayout.astro');
    expect(layout).toMatch(/og:title/);
    expect(layout).toMatch(/og:description/);
    expect(layout).toMatch(/og:type/);
  });

  it('BaseLayout 含 canonical link', () => {
    expect(readSrc('src/layouts/BaseLayout.astro')).toMatch(/rel="canonical"/);
  });

  it('public/_headers 配置了 Cloudflare 缓存策略', () => {
    expect(existsSync(srcPath('public/_headers'))).toBe(true);
    const headers = readSrc('public/_headers');
    expect(headers).toMatch(/Cache-Control/);
    expect(headers).toMatch(/immutable|max-age/);
  });

  it('HTML 保持浏览器层 must-revalidate + 边缘层 SWR（P0-5）', () => {
    const headers = readSrc('public/_headers');
    // 浏览器层：删掉会落入不可控的启发式缓存，必须保留 304 快速校验
    expect(headers).toMatch(/Cache-Control:\s*public,\s*max-age=0,\s*must-revalidate/);
    // 边缘层：重复访问零 RTT，最多 10 分钟陈旧，SWR 回源刷新 1 天
    expect(headers).toMatch(/CDN-Cache-Control:\s*public,\s*max-age=600,\s*stale-while-revalidate=86400/);
  });

  it('robots.txt 启用了 sitemap 引用', () => {
    const robots = readSrc('public/robots.txt');
    expect(robots).toMatch(/^Sitemap:\s*https:\/\//m);
  });
});
