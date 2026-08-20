import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('Prefetch 优化（页面切换秒开）', () => {
  it('astro.config.mjs 启用了 prefetch', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/prefetch\s*:/);
  });

  it('prefetch 关闭全量预取（prefetchAll:false，仅按需 hover/tap 预取）', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/prefetchAll\s*:\s*false/);
  });

  it('prefetch 配置了默认策略（viewport/hover/tap/load 之一）', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/defaultStrategy\s*:\s*['"](viewport|hover|tap|load)['"]/);
  });
});
