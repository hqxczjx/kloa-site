import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('清理未使用变量（消除 astro check hint）', () => {
  it('AnniversaryCard 函数签名不再解构未使用的 type', () => {
    const src = readSrc('src/components/react/AnniversaryCard.tsx');
    const fnMatch = src.match(/function AnniversaryCard\(\{([^}]*)\}/);
    expect(fnMatch, '应找到 AnniversaryCard 函数签名').not.toBeNull();
    expect(fnMatch![1]).not.toMatch(/\btype\b/);
  });

  it('SongList renderItem 不再声明未使用的 index 参数', () => {
    const src = readSrc('src/components/react/SongList.tsx');
    expect(src).not.toMatch(/renderItem=\{\(song,\s*index\)/);
  });
});
