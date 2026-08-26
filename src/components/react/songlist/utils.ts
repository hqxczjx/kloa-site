import type { Song, FilterState, SortState, SortKey, LanguageFacet } from './types';
import { LANGUAGE_ORDER } from './types';

export const songKey = (song: Song): string => `${song.title}-${song.artist}`;

export function getTags(song: Song): string[] {
  return [...song.languages, ...song.genres, ...song.gifts];
}

/** SC 金额：取 gifts 中数字最大值；无数字则回退首个原始字符串；无礼物返回 null */
export function scAmount(song: Song): string | null {
  if (!song.gifts || song.gifts.length === 0) return null;
  const nums = song.gifts
    .map((g) => parseInt(g, 10))
    .filter((n) => !Number.isNaN(n));
  if (nums.length > 0) return `${Math.max(...nums)} SC`;
  return song.gifts[0] ?? null;
}

export function hasGift(song: Song): boolean {
  return song.gifts.length > 0;
}

export type LangColor = 'pink' | 'blue' | 'gray';
export function langColor(lang: string): LangColor {
  if (lang === '国语' || lang === '粤语') return 'pink';
  if (lang === '日语') return 'blue';
  return 'gray';
}

/** 维度间 AND，维度内 OR；搜索支持 直接命中 + 拼音（ASCII 无拼音字段，回退 toLowerCase） */
export function matchesFilters(song: Song, f: FilterState): boolean {
  if (f.scOnly && !hasGift(song)) return false;
  if (f.languages.length > 0 && !song.languages.some((l) => f.languages.includes(l))) return false;
  if (f.genres.length > 0 && !song.genres.some((g) => f.genres.includes(g))) return false;
  const q = f.query.trim().toLowerCase();
  if (!q) return true;
  if (song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q)) return true;
  return (
    (song.titlePinyin ?? song.title.toLowerCase()).includes(q) ||
    (song.artistPinyin ?? song.artist.toLowerCase()).includes(q)
  );
}

export function filterSongs(songs: Song[], f: FilterState): Song[] {
  return songs.filter((s) => matchesFilters(s, f));
}

function sortKeyValue(song: Song, key: SortKey): string {
  switch (key) {
    case 'title': return song.titlePinyin ?? song.title.toLowerCase();
    case 'artist': return song.artistPinyin ?? song.artist.toLowerCase();
    case 'language': return song.languages[0] ?? '';
    case 'genre': return song.genres[0] ?? '';
    default: return '';
  }
}

export function sortSongs(songs: Song[], st: SortState): Song[] {
  if (st.key === 'default') return [...songs];
  const sorted = [...songs].sort((a, b) =>
    sortKeyValue(a, st.key).localeCompare(sortKeyValue(b, st.key), 'zh-Hans-CN'),
  );
  return st.dir === 'desc' ? sorted.reverse() : sorted;
}

export interface Segment { text: string; hit: boolean }

/** 标记直接子串命中（拼音命中不标位置，整段不高亮） */
export function highlightSegments(text: string, query: string): Segment[] {
  const q = query.trim().toLowerCase();
  if (!q) return [{ text, hit: false }];
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return [{ text, hit: false }];
  return [
    { text: text.slice(0, idx), hit: false },
    { text: text.slice(idx, idx + q.length), hit: true },
    { text: text.slice(idx + q.length), hit: false },
  ].filter((seg) => seg.text.length > 0);
}

export interface SongFacets {
  languages: LanguageFacet[];
  topGenres: string[];
  moreGenres: string[];
}

export function deriveFacets(songs: Song[]): SongFacets {
  const langCount = new Map<string, number>();
  const genreCount = new Map<string, number>();
  for (const song of songs) {
    for (const l of song.languages) langCount.set(l, (langCount.get(l) ?? 0) + 1);
    for (const g of song.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
  }
  const languages: LanguageFacet[] = LANGUAGE_ORDER
    .filter((l) => langCount.has(l))
    .map((l) => ({ value: l, count: langCount.get(l) ?? 0 }));
  const genresByFreq = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'))
    .map(([g]) => g);
  return { languages, topGenres: genresByFreq.slice(0, 8), moreGenres: genresByFreq.slice(8) };
}
