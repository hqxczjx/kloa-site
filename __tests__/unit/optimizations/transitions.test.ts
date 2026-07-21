import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const readSrc = (rel: string): string => readFileSync(join(ROOT, rel), 'utf-8');

describe('动画/过渡收敛（性能 + 无障碍）', () => {
  it('* 的 transition-property 不再包含 opacity（主题切换不涉及 opacity）', () => {
    const css = readSrc('src/styles/global.css');
    const starBlock = css.match(/\*\s*\{[^}]*transition-property[^}]*\}/);
    expect(starBlock, '应存在 * 的 transition 块').not.toBeNull();
    expect(starBlock![0]).not.toMatch(/\bopacity\b/);
  });

  it('支持 prefers-reduced-motion（对减少动画偏好用户禁用过渡/动画）', () => {
    const css = readSrc('src/styles/global.css');
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
  });
});
