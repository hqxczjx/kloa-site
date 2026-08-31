import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('动画/过渡收敛（性能 + 无障碍）', () => {
  it('主题过渡收敛为白名单——不再存在 `*` 通配 transition 规则（P0-6）', () => {
    const css = readSrc('src/styles/global.css');
    const starBlock = css.match(/\*\s*\{[^}]*transition-property[^}]*\}/);
    expect(starBlock, '不应再存在 * 通配 transition 块（全元素过渡是主题切换掉帧来源）').toBeNull();
    // 白名单保留原有的属性集与 300ms 计时。正则前后锚定（(?<![\w-]) 前界 + 结尾 ;）：
    // 未锚定时会命中更长属性表（如 ..., stroke, opacity）、注释文本或 --xx-transition-*
    // 之类自定义属性的子串，拼出假绿。
    expect(css).toMatch(
      /(?<![\w-])transition-property:\s*background-color,\s*border-color,\s*color,\s*fill,\s*stroke\s*;/,
    );
    expect(css).toMatch(/(?<![\w-])transition-duration:\s*300ms\s*;/);
  });

  it('支持 prefers-reduced-motion（对减少动画偏好用户禁用过渡/动画）', () => {
    const css = readSrc('src/styles/global.css');
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
  });
});
