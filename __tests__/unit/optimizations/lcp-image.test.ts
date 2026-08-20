import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('LCP 图片优先级', () => {
  it('角色立绘（LCP 元素）禁止懒加载并设为高优先级', () => {
    const hero = readSrc('src/components/astro/Hero.astro');
    expect(hero).toMatch(/loading="eager"/);
    expect(hero).toMatch(/fetchpriority="high"/i);
  });
});
