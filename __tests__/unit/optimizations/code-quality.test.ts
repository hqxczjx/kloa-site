import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('清理未使用变量（消除 astro check hint）', () => {
  it('SongList renderItem 不再声明未使用的 index 参数', () => {
    const src = readSrc('src/components/react/SongList.tsx');
    expect(src).not.toMatch(/renderItem=\{\(song,\s*index\)/);
  });
});
