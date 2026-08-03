import { describe, it, expect } from 'vitest';
import { pinyinKey } from '../../../src/components/react/songlist/pinyin.server';

// 不 mock pinyin-pro，验证真实集成（type:'array' 配置 + 拼接）
describe('pinyinKey 真实集成', () => {
  it('把中文转成无声调拼音字符串', () => {
    expect(pinyinKey('大鱼')).toBe('dayu');
  });
  it('英文原样小写', () => {
    expect(pinyinKey('Lemon')).toBe('lemon');
  });
});
