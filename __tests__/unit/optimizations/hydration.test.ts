import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('Hydration 指令优化（减少首屏 JS 执行）', () => {
  it('ToasterWrapper 用 client:idle（首屏不可见，空闲时激活）', () => {
    expect(readSrc('src/layouts/BaseLayout.astro')).toContain('<ToasterWrapper client:idle');
  });

  it('ToasterWrapper 不再用 client:load', () => {
    expect(readSrc('src/layouts/BaseLayout.astro')).not.toContain('<ToasterWrapper client:load');
  });

  it('AnniversaryCards 已静态化（P2-2）：Hero 直接渲染 Astro 组件，不再有 hydration 指令', () => {
    const hero = readSrc('src/components/astro/Hero.astro');
    expect(hero).toMatch(/import\s+AnniversaryCards\s+from\s+'\.\/AnniversaryCards\.astro'/);
    expect(hero).toContain('<AnniversaryCards />');
  });

  it('AnniversaryCards 不再使用任何 client:* 指令（首页少 1 个 React 岛）', () => {
    expect(readSrc('src/components/astro/Hero.astro')).not.toMatch(/<AnniversaryCards[^>]*client:/);
  });
});
