import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const readSrc = (rel: string): string => readFileSync(join(ROOT, rel), 'utf-8');

describe('Prefetch 优化（页面切换秒开）', () => {
  it('astro.config.mjs 启用了 prefetch', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/prefetch\s*:/);
  });

  it('prefetch 预取所有链接（prefetchAll）', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/prefetchAll\s*:\s*true/);
  });

  it('prefetch 配置了默认策略（viewport/hover/tap/load 之一）', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/defaultStrategy\s*:\s*['"](viewport|hover|tap|load)['"]/);
  });
});
