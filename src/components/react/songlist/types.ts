export interface Song {
  title: string;
  artist: string;
  /** 服务端预生成的标题拼音（无声调小写），供搜索/排序，避免浏览器端 pinyin-pro */
  titlePinyin: string;
  artistPinyin: string;
  languages: string[];
  genres: string[];
  gifts: string[];
}

export type SortKey = 'default' | 'language' | 'title' | 'artist' | 'genre';
export type SortDir = 'asc' | 'desc';

export interface FilterState {
  query: string;
  languages: string[];
  genres: string[];
  scOnly: boolean;
}

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export interface LanguageFacet {
  value: string;
  count: number;
}

/** 语言 chip 固定顺序（用于排序与颜色映射） */
export const LANGUAGE_ORDER = ['国语', '日语', '英语', '粤语'] as const;
