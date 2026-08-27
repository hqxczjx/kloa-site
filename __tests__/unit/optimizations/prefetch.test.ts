import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('Prefetch 优化（页面切换秒开）', () => {
  it('astro.config.mjs 启用了 prefetch', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/prefetch\s*:/);
  });

  it('prefetch 开启全量预取（P1-1：全站 9 页 <1MB，hover 即预取近零延迟）', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/prefetchAll\s*:\s*true/);
  });

  it('prefetch 配置了默认策略（viewport/hover/tap/load 之一）', () => {
    expect(readSrc('astro.config.mjs')).toMatch(/defaultStrategy\s*:\s*['"](viewport|hover|tap|load)['"]/);
  });
});
