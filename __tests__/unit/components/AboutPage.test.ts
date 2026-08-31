import { describe, it, expect } from 'vitest';
import { readSrc } from '../optimizations/helpers';

// 关于页 P2-4 静态化后为纯 SSR 标记（无状态/无脚本），有价值断言改为源标记守护
// （对齐 AnniversaryCards.test.ts 的静态标记约定），行为由 about.spec.ts e2e 覆盖。
const src = readSrc('src/components/astro/AboutPage.astro');

describe('AboutPage 静态化（P2-4，纯 SSR 无岛）', () => {
  it('渲染声明卡（天使/恶魔双模式类齐全）与主标题', () => {
    expect(src).toContain('关于本站');
    expect(src).toMatch(/disclaimer-title['"]/); // 亮色标题类
    expect(src).toContain('disclaimer-title-dark');
    expect(src).toContain('disclaimer-highlight');
    expect(src).toContain('disclaimer-highlight-dark');
    // 标题层级结构：h1 主标题 + h2 声明 + h3 卡片标题
    expect(src).toMatch(/<h1\b/);
    expect(src).toMatch(/<h2\b/);
    expect(src).toMatch(/<h3\b/);
  });

  it('Bilibili 链接保留且新窗口打开', () => {
    expect(src).toContain('href="https://space.bilibili.com/38028857"');
    expect(src).toContain('@卿家ん');
    expect(src).toContain('本网站为');
    expect(src).toContain('请勿就本网站的相关问题');
  });

  it('外链（target="_blank"）均带含 noopener 的 rel（移植自旧用例）', () => {
    const external = src.match(/target="_blank"/g) ?? [];
    // 属性可能分行书写，匹配时允许标签内空白
    const withRel = src.match(/target="_blank"\s+rel="noopener noreferrer"/g) ?? [];
    expect(external.length).toBeGreaterThan(0);
    expect(withRel.length).toBe(external.length);
  });

  it('碎碎念/联系方式/技术栈内容齐全（e2e 选择器依赖的文本）', () => {
    expect(src).toContain('开发者碎碎念');
    expect(src).toContain('联系方式');
    expect(src).toContain('Built with');
    expect(src).toContain('mailto:qwqtest1@outlook.com');
    expect(src).toContain('https://github.com/hqxczjx/kloa-site');
  });

  it('背景/装饰动画类保留（e2e 断言 .animate-pulse-slow 存在）', () => {
    const pulses = src.match(/animate-pulse-slow/g) ?? [];
    expect(pulses.length).toBe(8); // 天使 4 + 恶魔 4
    expect(src).toContain('animate-fade-down');
    expect(src).toContain('animate-heart-beat');
    expect(src).toContain('animate-fade-up');
    expect(src).toContain('animate-blur-float');
    expect(src).toContain('animate-fade-scale-center');
  });

  it('图标全部内联 SVG（含 GithubIcon），不依赖 lucide-react 运行时', () => {
    expect(src).toContain('lucide lucide-heart');
    expect(src).toContain('lucide lucide-shield-alert');
    expect(src).toContain('lucide lucide-message-circle');
    expect(src).toContain('lucide lucide-github-icon lucide-github');
    expect(src).not.toContain("from 'lucide-react'");
    expect(src).not.toMatch(/<script/); // 纯静态页零脚本
  });
});
