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

  it('public/_headers 标注 inert：run_worker_first 下 Worker 响应不吃 _headers', () => {
    expect(existsSync(srcPath('public/_headers'))).toBe(true);
    // 真Source 在 worker/index.ts；_headers 仅作策略文档，须注明防误信
    const headers = readSrc('public/_headers');
    expect(headers).toMatch(/run_worker_first/);
    expect(headers).toMatch(/worker\/index\.ts/);
  });

  it('HTML 保持浏览器层 must-revalidate + 边缘层 SWR（P0-5，真源 worker）', () => {
    const workerSrc = readSrc('worker/index.ts');
    // 浏览器层：删掉会落入不可控的启发式缓存，必须保留 304 快速校验
    expect(workerSrc).toMatch(/max-age=0,\s*must-revalidate/);
    // 边缘层：重复访问零 RTT，最多 10 分钟陈旧，SWR 回源刷新 1 天
    expect(workerSrc).toMatch(/max-age=600,\s*stale-while-revalidate=86400/);
  });

  it('安全五头 + /_astro/* immutable 在 worker 全站生效（P1-4，真源 worker）', () => {
    const workerSrc = readSrc('worker/index.ts');
    expect(workerSrc).toContain("['x-content-type-options', 'nosniff']");
    expect(workerSrc).toContain("['referrer-policy', 'strict-origin-when-cross-origin']");
    expect(workerSrc).toContain("['x-frame-options', 'DENY']");
    expect(workerSrc).toContain("['permissions-policy', 'camera=(), microphone=(), geolocation=()']");
    expect(workerSrc).toContain("['strict-transport-security', 'max-age=31536000']");
    // 指纹化产物 immutable（SET 单值，修复线上双值 cache-control）
    expect(workerSrc).toMatch(/max-age=31536000,\s*immutable/);
  });

  it('/fonts/*、/images/* 在 worker 有显式缓存策略（堵 ASSETS 层 _headers /* 兜底注入）', () => {
    const workerSrc = readSrc('worker/index.ts');
    // 未映射资产会被 ASSETS 层按 _headers 注入 /* 的 must-revalidate，
    // 预加载字体（P1-5）每次重访都会 304——名称稳定的目录须显式覆盖。
    expect(workerSrc).toMatch(/startsWith\('\/fonts\/'\)/);
    expect(workerSrc).toMatch(/startsWith\('\/images\/'\)/);
    expect(workerSrc).toMatch(/max-age=604800/);
    // _headers 策略文档同步收录
    const headers = readSrc('public/_headers');
    expect(headers).toMatch(/\/fonts\/\*/);
    expect(headers).toMatch(/\/images\/\*/);
  });

  it('BaseLayout 预加载 variable 字体（P1-5：preload + font-display:swap 终态）', () => {
    const layout = readSrc('src/layouts/BaseLayout.astro');
    expect(layout).toMatch(
      /<link rel="preload" as="font" type="font\/woff2" crossorigin href="\/fonts\/noto-serif-sc-var\.woff2"/,
    );
    // preload 的目标必须真实存在，否则白花一次往返还告警
    expect(existsSync(srcPath('public/fonts/noto-serif-sc-var.woff2'))).toBe(true);
  });

  it('robots.txt 启用了 sitemap 引用', () => {
    const robots = readSrc('public/robots.txt');
    expect(robots).toMatch(/^Sitemap:\s*https:\/\//m);
  });
});
