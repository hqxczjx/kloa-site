import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const readSrc = (rel: string): string => readFileSync(join(ROOT, rel), 'utf-8');

describe('Hydration 指令优化（减少首屏 JS 执行）', () => {
  it('ToasterWrapper 用 client:idle（首屏不可见，空闲时激活）', () => {
    expect(readSrc('src/layouts/BaseLayout.astro')).toContain('<ToasterWrapper client:idle');
  });

  it('ToasterWrapper 不再用 client:load', () => {
    expect(readSrc('src/layouts/BaseLayout.astro')).not.toContain('<ToasterWrapper client:load');
  });

  it('AnniversaryCards 用 client:visible（装饰卡片，进入视口才激活）', () => {
    expect(readSrc('src/components/astro/Hero.astro')).toContain('<AnniversaryCards client:visible');
  });

  it('AnniversaryCards 不再用 client:load', () => {
    expect(readSrc('src/components/astro/Hero.astro')).not.toContain('<AnniversaryCards client:load');
  });
});
