import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const readSrc = (rel: string): string => readFileSync(join(ROOT, rel), 'utf-8');

describe('字体加载优化（消除渲染阻塞）', () => {
  it('global.css 不再用阻塞渲染的 CSS @import 加载字体', () => {
    const css = readSrc('src/styles/global.css');
    expect(css).not.toMatch(/@import\s+url\([^)]*fonts\./i);
    expect(css).not.toContain('fonts.loli.net');
  });

  it('BaseLayout head 含字体源 preconnect（提前建连）', () => {
    const layout = readSrc('src/layouts/BaseLayout.astro');
    expect(layout).toContain('rel="preconnect"');
    expect(layout).toContain('fonts.loli.net');
  });

  it('BaseLayout head 用 <link rel="stylesheet"> 异步加载字体 CSS', () => {
    const layout = readSrc('src/layouts/BaseLayout.astro');
    expect(layout).toMatch(/fonts\.loli\.net/);
    expect(layout).toMatch(/rel="stylesheet"/);
  });

  it('字体不再加载无引用的 300 字重（精简 Sans 子集）', () => {
    const layout = readSrc('src/layouts/BaseLayout.astro');
    const fontUrlMatch = layout.match(/https:\/\/fonts\.loli\.net\/css2\?[^"']+/);
    expect(fontUrlMatch, '应在 BaseLayout 找到字体 URL').not.toBeNull();
    const fontUrl = fontUrlMatch![0];
    expect(fontUrl).not.toContain('wght@300');
    expect(fontUrl).not.toMatch(/;\s*300/);
  });
});
