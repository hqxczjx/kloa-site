import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('字体加载优化（消除渲染阻塞）', () => {
  it('global.css 不再用阻塞渲染的 CSS @import 加载字体', () => {
    const css = readSrc('src/styles/global.css');
    expect(css).not.toMatch(/@import\s+url\([^)]*fonts\./i);
    expect(css).not.toContain('fonts.loli.net');
  });

  it('BaseLayout 不再加载任何远程字体（无 fonts.loli.net / 字体 stylesheet / preconnect）', () => {
    const layout = readSrc('src/layouts/BaseLayout.astro');
    expect(layout).not.toMatch(/fonts\.loli\.net/);
    expect(layout).not.toMatch(/rel="stylesheet"\s+href="https?:\/\/[^"]*font/i);
  });

  it('global.css 用本地 variable @font-face 子集（wght 600-700 单文件）+ font-display:swap', () => {
    const css = readSrc('src/styles/global.css');
    expect(css).toMatch(/url\("\/fonts\/noto-serif-sc-var\.woff2"\)/);
    expect(css).toMatch(/font-weight:\s*600\s+700\s*;/);
    // src 声明不含 tech(variations)：旧内核遇未知函数丢弃整条 src，标题静默回退系统字体
    expect(css).not.toMatch(/src:[^;]*tech\(/);
    expect(css).toMatch(/font-display:\s*swap/);
  });

  it('正文改用系统中文字栈，不再依赖 Noto Sans SC', () => {
    const css = readSrc('src/styles/global.css');
    expect(css).not.toMatch(/Noto Sans SC/);
    expect(css).toMatch(/PingFang SC|Microsoft YaHei/);
  });
});
