import { describe, it, expect } from 'vitest';
import { danmaku, type DanmakuCategory } from '../../../src/data/danmaku';

const validCategories: DanmakuCategory[] = ['cheer', 'meme', 'memorial'];

describe('danmaku 数据', () => {
  it('每条都有非空 id / text 与合法 category', () => {
    for (const d of danmaku) {
      expect(typeof d.id).toBe('string');
      expect(d.id.length).toBeGreaterThan(0);
      expect(typeof d.text).toBe('string');
      expect(d.text.length).toBeGreaterThan(0);
      expect(validCategories).toContain(d.category);
    }
  });

  it('id 全局唯一', () => {
    const ids = danmaku.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('三个分类都有内容', () => {
    for (const c of validCategories) {
      expect(danmaku.filter(d => d.category === c).length).toBeGreaterThan(0);
    }
  });

  it('至少一条超过 40 字（覆盖超限提示分支）', () => {
    expect(danmaku.some(d => d.text.length > 40)).toBe(true);
  });
});
