import { describe, it, expect } from 'vitest';
import { pinyin } from 'pinyin-pro';
import songsJson from '../../../src/data/songs.json';
import { SONGS } from '../../../src/data/generated/songs-data';

const isAscii = (t: string) => /^[\x00-\x7F]*$/.test(t);
// pinyin.server.ts（已删除）遗留的构建期逻辑锚点：中文转无声调拼音、ASCII 原样小写
const pinyinKey = (t: string) => pinyin(t, { toneType: 'none', type: 'array' }).join('').toLowerCase();

// 产物守护：scripts/generate-song-data.mjs 生成的 songs-data.ts（gitignored），
// 每次跑测试前由 package.json test 脚本重新生成，此处校验生成逻辑本身的约定
describe('generated songs-data（P0-1/P0-2 产物）', () => {
  it('与 songs.json 逐曲对应（数量 + 标题/歌手保序）', () => {
    expect(SONGS).toHaveLength(songsJson.length);
    expect(SONGS[0]).toMatchObject({ title: songsJson[0].title, artist: songsJson[0].artist });
    expect(SONGS[SONGS.length - 1]).toMatchObject({
      title: songsJson[songsJson.length - 1].title,
      artist: songsJson[songsJson.length - 1].artist,
    });
  });

  it('纯 ASCII 标题/歌手省略拼音字段，非 ASCII 必有拼音（P0-2）', () => {
    expect(SONGS.some((s) => s.titlePinyin === undefined)).toBe(true); // 数据集确有 ASCII 标题
    for (const s of SONGS) {
      if (isAscii(s.title)) expect(s.titlePinyin).toBeUndefined();
      else expect(typeof s.titlePinyin).toBe('string');
      if (isAscii(s.artist)) expect(s.artistPinyin).toBeUndefined();
      else expect(typeof s.artistPinyin).toBe('string');
    }
  });

  it('拼音与 pinyin-pro 真实输出一致（抽样，含 pinyin.server.ts 行为锚点）', () => {
    // 抽样前 5 个含拼音的标题，避免全量 427 次 pinyin 转换拖慢测试
    const sample = SONGS.filter((s) => s.titlePinyin !== undefined).slice(0, 5);
    for (const s of sample) expect(s.titlePinyin).toBe(pinyinKey(s.title));
    expect(pinyinKey('大鱼')).toBe('dayu');
    expect(pinyinKey('Lemon')).toBe('lemon');
  });
});
