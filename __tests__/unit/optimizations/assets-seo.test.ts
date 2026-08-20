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

  it('robots.txt 启用了 sitemap 引用', () => {
    const robots = readSrc('public/robots.txt');
    expect(robots).toMatch(/^Sitemap:\s*https:\/\//m);
  });
});
