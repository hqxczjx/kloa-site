import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('动画/过渡收敛（性能 + 无障碍）', () => {
  it('主题过渡收敛为白名单——不再存在 `*` 通配 transition 规则（P0-6）', () => {
    const css = readSrc('src/styles/global.css');
    const starBlock = css.match(/\*\s*\{[^}]*transition-property[^}]*\}/);
    expect(starBlock, '不应再存在 * 通配 transition 块（全元素过渡是主题切换掉帧来源）').toBeNull();
    // 白名单保留原有的属性集与 300ms 计时
    expect(css).toMatch(/transition-property:\s*background-color,\s*border-color,\s*color,\s*fill,\s*stroke/);
    expect(css).toMatch(/transition-duration:\s*300ms/);
  });

  it('支持 prefers-reduced-motion（对减少动画偏好用户禁用过渡/动画）', () => {
    const css = readSrc('src/styles/global.css');
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
  });
});
