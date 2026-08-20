import { describe, it, expect } from 'vitest';
import {
  songKey, getTags, scAmount, hasGift, langColor,
  matchesFilters, filterSongs, sortSongs, highlightSegments, deriveFacets,
} from '../../../../src/components/react/songlist/utils';
import type { Song } from '../../../../src/components/react/songlist/types';

const s = (over: Partial<Song>): Song => ({
  title: 'T', artist: 'A', titlePinyin: 'tp', artistPinyin: 'ap',
  languages: [], genres: [], gifts: [], ...over,
});

describe('songlist utils', () => {
  describe('songKey / getTags', () => {
    it('songKey 用 标题-歌手', () => {
      expect(songKey(s({ title: '大鱼', artist: '周' }))).toBe('大鱼-周');
    });
    it('getTags 合并三源', () => {
      expect(getTags(s({ languages: ['国语'], genres: ['流行'], gifts: ['30 SC'] })))
        .toEqual(['国语', '流行', '30 SC']);
    });
  });

  describe('scAmount / hasGift', () => {
    it('无礼物返回 null', () => {
      expect(scAmount(s({ gifts: [] }))).toBeNull();
      expect(hasGift(s({ gifts: [] }))).toBe(false);
    });
    it('单个数字礼物返回 "{n} SC"', () => {
      expect(scAmount(s({ gifts: ['30 SC'] }))).toBe('30 SC');
    });
    it('多个礼物取最大值', () => {
      expect(scAmount(s({ gifts: ['30 SC', '100 SC'] }))).toBe('100 SC');
    });
    it('非数字礼物回退原始字符串', () => {
      expect(scAmount(s({ gifts: ['会员点歌'] }))).toBe('会员点歌');
    });
  });

  describe('langColor', () => {
    it('国语/粤语=粉，日语=蓝，其它=灰', () => {
      expect(langColor('国语')).toBe('pink');
      expect(langColor('粤语')).toBe('pink');
      expect(langColor('日语')).toBe('blue');
      expect(langColor('英语')).toBe('gray');
    });
  });

  describe('matchesFilters', () => {
    it('无筛选全通过', () => {
      expect(matchesFilters(s({ languages: ['国语'] }), { query: '', languages: [], genres: [], scOnly: false })).toBe(true);
    });
    it('scOnly 过滤掉无礼物曲', () => {
      expect(matchesFilters(s({ gifts: [] }), { query: '', languages: [], genres: [], scOnly: true })).toBe(false);
      expect(matchesFilters(s({ gifts: ['30 SC'] }), { query: '', languages: [], genres: [], scOnly: true })).toBe(true);
    });
    it('语言维度内 OR', () => {
      const f = { query: '', languages: ['国语', '日语'], genres: [], scOnly: false };
      expect(matchesFilters(s({ languages: ['日语'] }), f)).toBe(true);
      expect(matchesFilters(s({ languages: ['英语'] }), f)).toBe(false);
    });
    it('流派维度内 OR', () => {
      const f = { query: '', languages: [], genres: ['摇滚', '爵士'], scOnly: false };
      expect(matchesFilters(s({ genres: ['爵士'] }), f)).toBe(true);
      expect(matchesFilters(s({ genres: ['流行'] }), f)).toBe(false);
    });
    it('搜索：标题直匹配', () => {
      expect(matchesFilters(s({ title: '大鱼' }), { query: '大', languages: [], genres: [], scOnly: false })).toBe(true);
    });
    it('搜索：歌手直匹配（大小写不敏感）', () => {
      expect(matchesFilters(s({ artist: 'LiSA' }), { query: 'lis', languages: [], genres: [], scOnly: false })).toBe(true);
    });
    it('搜索：拼音匹配（用预计算 titlePinyin）', () => {
      expect(matchesFilters(s({ title: '大鱼', titlePinyin: 'dayu' }), { query: 'dayu', languages: [], genres: [], scOnly: false })).toBe(true);
    });
    it('纯空白 query 视为无搜索', () => {
      expect(matchesFilters(s({ title: '大鱼' }), { query: '   ', languages: [], genres: [], scOnly: false })).toBe(true);
      expect(matchesFilters(s({ title: '其它' }), { query: '   ', languages: [], genres: [], scOnly: false })).toBe(true);
    });
    it('维度间 AND（语言 AND 搜索）', () => {
      const f = { query: '大', languages: ['国语'], genres: [], scOnly: false };
      expect(matchesFilters(s({ title: '大鱼', languages: ['国语'] }), f)).toBe(true);
      expect(matchesFilters(s({ title: '大鱼', languages: ['日语'] }), f)).toBe(false);
    });
  });

  it('filterSongs 与 sortSongs 组合', () => {
    const songs = [
      s({ title: '晴天', artist: '周杰伦', titlePinyin: 'qingtian', languages: ['国语'] }),
      s({ title: '阿城', artist: '阿妹', titlePinyin: 'acheng', languages: ['国语'] }),
      s({ title: 'Bad', artist: 'B', titlePinyin: 'bad', languages: ['英语'] }),
    ];
    const filtered = filterSongs(songs, { query: '', languages: ['国语'], genres: [], scOnly: false });
    expect(filtered).toHaveLength(2);
    const sorted = sortSongs(filtered, { key: 'title', dir: 'asc' });
    // 按预计算 titlePinyin 排序：'acheng' < 'qingtian'，故 阿城 < 晴天
    expect(sorted.map(x => x.title)).toEqual(['阿城', '晴天']);
  });

  describe('sortSongs', () => {
    it('default 保持原序', () => {
      const songs = [s({ title: 'B' }), s({ title: 'A' })];
      expect(sortSongs(songs, { key: 'default', dir: 'asc' }).map(x => x.title)).toEqual(['B', 'A']);
    });
    it('同键切换方向', () => {
      const songs = [s({ title: 'A' }), s({ title: 'B' })];
      expect(sortSongs(songs, { key: 'title', dir: 'asc' }).map(x => x.title)).toEqual(['A', 'B']);
      expect(sortSongs(songs, { key: 'title', dir: 'desc' }).map(x => x.title)).toEqual(['B', 'A']);
    });
    it('按 artist 排序走 artistPinyin 而非原文（utils.ts L49）', () => {
      // 拉丁歌手与中文歌手混排：按拼音 amei < zed → 阿妹在前；
      // 若误用原文比较，zh-Hans-CN 整序下拉丁恒在 CJK 之前 → Zed 在前，可区分两个字段
      const songs = [
        s({ artist: 'Zed', artistPinyin: 'zed' }),
        s({ artist: '阿妹', artistPinyin: 'amei' }),
        s({ artist: '周杰伦', artistPinyin: 'zhoujielun' }),
      ];
      expect(sortSongs(songs, { key: 'artist', dir: 'asc' }).map(x => x.artist))
        .toEqual(['阿妹', 'Zed', '周杰伦']); // amei < zed < zhoujielun
    });
    it('按 language 排序取 languages[0]（utils.ts L50）', () => {
      const songs = [
        s({ languages: ['英语'] }),
        s({ languages: ['国语'] }),
        s({ languages: ['日语'] }),
      ];
      // zh-Hans-CN 拼音序：guo < ri < ying
      expect(sortSongs(songs, { key: 'language', dir: 'asc' }).map(x => x.languages[0]))
        .toEqual(['国语', '日语', '英语']);
    });
    it('按 genre 排序取 genres[0]（utils.ts L51）', () => {
      const songs = [
        s({ genres: ['摇滚'] }),
        s({ genres: ['民谣'] }),
        s({ genres: ['流行'] }),
      ];
      // zh-Hans-CN 拼音序：liu < min < yao
      expect(sortSongs(songs, { key: 'genre', dir: 'asc' }).map(x => x.genres[0]))
        .toEqual(['流行', '民谣', '摇滚']);
    });
  });

  describe('highlightSegments', () => {
    it('无 query 返回整段非命中', () => {
      expect(highlightSegments('大鱼', '')).toEqual([{ text: '大鱼', hit: false }]);
    });
    it('命中分段', () => {
      expect(highlightSegments('Bad apple', 'bad')).toEqual([
        { text: 'Bad', hit: true },
        { text: ' apple', hit: false },
      ]);
    });
    it('不命中返回整段', () => {
      expect(highlightSegments('大鱼', 'xyz')).toEqual([{ text: '大鱼', hit: false }]);
    });
  });

  describe('deriveFacets', () => {
    it('语言按固定顺序 + 计数；流派按数量降序，热门8/其余', () => {
      const songs = [
        s({ languages: ['国语', '英语'], genres: ['流行', '影视'] }),
        s({ languages: ['国语'], genres: ['流行'] }),
        s({ languages: ['日语'], genres: ['动画'] }),
      ];
      const f = deriveFacets(songs);
      expect(f.languages.map(x => x.value)).toEqual(['国语', '日语', '英语']);
      expect(f.languages[0]).toEqual({ value: '国语', count: 2 });
      expect(f.topGenres[0]).toBe('流行');
      expect(f.topGenres).toHaveLength(3);
      expect(f.moreGenres).toEqual([]);
    });
    it('流派 >8 时切分为热门8 与其余', () => {
      const genres = ['g1','g2','g3','g4','g5','g6','g7','g8','g9','g10'];
      const songs2 = genres.map((g) => s({ languages: ['国语'], genres: [g] }));
      const f = deriveFacets(songs2);
      expect(f.topGenres).toHaveLength(8);
      expect(f.moreGenres).toHaveLength(2);
      // 按字典序：g1 < g10 < g2 < g3 < g4 < g5 < g6 < g7 < g8 < g9
      expect(f.topGenres).toEqual(['g1','g10','g2','g3','g4','g5','g6','g7']);
      expect(f.moreGenres).toEqual(['g8','g9']);
    });
  });
});
