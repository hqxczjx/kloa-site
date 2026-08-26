import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { readSrc, srcPath } from './helpers';

describe('歌曲数据外置独立 chunk（P0-1，HTML -133KB）', () => {
  it('SongList 直接 import 生成数据模块，不再声明 songs props', () => {
    const src = readSrc('src/components/react/SongList.tsx');
    expect(src).toMatch(/from '\.\.\/\.\.\/data\/generated\/songs-data'/);
    expect(src).not.toMatch(/songs\s*:\s*Song\[\]/);
  });

  it('SongListSection 的 island 不再通过 props 传歌曲数据（序列化进 HTML ~133KB）', () => {
    const astro = readSrc('src/components/astro/SongListSection.astro');
    expect(astro).toContain('<SongList client:visible />');
    expect(astro).not.toMatch(/songs=\{/);
    expect(astro).not.toMatch(/from '\.\.\/\.\.\/data\/songs\.json'/);
  });

  it('pinyin.server.ts 已删除（pinyin-pro 仅构建期 scripts 使用，不进客户端 bundle）', () => {
    expect(existsSync(srcPath('src/components/react/songlist/pinyin.server.ts'))).toBe(false);
  });

  it('生成产物已 gitignore（由消费脚本各自生成）', () => {
    expect(readSrc('.gitignore')).toMatch(/src\/data\/generated\//);
  });
});
