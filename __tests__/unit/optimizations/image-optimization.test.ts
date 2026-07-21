import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const readSrc = (rel: string): string => readFileSync(join(ROOT, rel), 'utf-8');

describe('Hero 立绘图片优化（AVIF/WebP + 响应式 + 消除 CLS）', () => {
  it('Hero.astro 从 astro:assets 导入 Picture 组件（多格式输出）', () => {
    const hero = readSrc('src/components/astro/Hero.astro');
    expect(hero).toMatch(/import\s*\{[^}]*\bPicture\b[^}]*\}\s*from\s*['"]astro:assets['"]/);
  });

  it('Hero.astro 使用 <Picture> 组件渲染立绘', () => {
    const hero = readSrc('src/components/astro/Hero.astro');
    expect(hero).toContain('<Picture');
  });

  it('Hero.astro 配置 AVIF + WebP 双格式输出（极致压缩）', () => {
    const hero = readSrc('src/components/astro/Hero.astro');
    expect(hero).toContain("formats={['avif', 'webp']}");
  });

  it('Hero.astro 不再用指向 public 的原生 <img> 加载立绘', () => {
    const hero = readSrc('src/components/astro/Hero.astro');
    expect(hero).not.toMatch(/<img[^>]+src=["']\/images\/character/);
  });

  it('立绘源文件位于 src/images/ 以启用 Astro 图片优化管线', () => {
    const candidates = ['png', 'jpg', 'jpeg', 'webp', 'avif']
      .map((ext) => join(ROOT, `src/images/character-1.${ext}`));
    expect(candidates.some((p) => existsSync(p))).toBe(true);
  });
});
