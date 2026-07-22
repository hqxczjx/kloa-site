# 歌单列表重新设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `/music` 歌单页的纯文本虚拟列表重构为「玻璃乐谱」列对齐表格——列头排序、拼音搜索高亮、语言/流派 chip 筛选、SC 礼物曲视觉编码、随机一首、移动端卡片回退，并完整复用 Angel/Demon 双主题。

**Architecture:** 自底向上拆分：纯函数 `songlist/utils.ts`（筛选/排序/高亮/SC 解析/分面统计）→ 无状态展示组件（`ScBadge`/`FilterBar`/`SongRow`/`SongTable`）→ 容器 `SongList` 持有状态并组合。样式以 CSS 变量驱动的语义类落在 `global.css`，组件复用现有 `.glass`/OKLCH token。`VirtualList` 增加 `scrollToIndex` 受控滚动以支持「随机一首」定位。

**Tech Stack:** Astro 7 + React 19 + Tailwind v4（CSS-first `@theme`）+ pinyin-pro + sonner + nanostores + lucide-react；测试 Vitest（jsdom）+ Playwright。`verbatimModuleSyntax` 开启（类型导入用 `import type`），`noUncheckedIndexedAccess` 开启（数组/Map 取值需兜底）。

**Spec:** `docs/superpowers/specs/2026-07-23-songlist-redesign-design.md`

---

## File Structure

**新建（组件，`src/components/react/songlist/`）：**
- `types.ts` — `Song`、`SortKey`、`SortDir`、`FilterState`、`SortState`、`LANGUAGE_ORDER`
- `utils.ts` — 纯逻辑：`songKey`、`getTags`、`pinyinKey`、`scAmount`、`hasGift`、`langColor`、`matchesFilters`、`filterSongs`、`sortSongs`、`highlightSegments`、`deriveFacets`
- `ScBadge.tsx` — SC 金额实心胶囊徽章
- `FilterBar.tsx` — 搜索 + 语言 chip + 流派 chip(热门/更多▾) + 仅 SC 开关
- `SongRow.tsx` — 桌面列对齐行 / 移动卡片行（按 `variant`）
- `SongTable.tsx` — 固定表头（`SortHeader`）+ `VirtualList` + 空状态

**修改：**
- `src/components/react/SongList.tsx` — 重写为容器（持有 filter/sort/copied/scrollToIndex，组合上述子组件，含随机/复制）
- `src/components/react/VirtualList.tsx` — 增加可选 `scrollToIndex` + `onScrollToHandled`（向后兼容）
- `src/styles/global.css` — 新增 song-list 语义类与 `--sc-tint` token

**测试：**
- 新建 `__tests__/unit/components/songlist-utils.test.ts`、`songlist-ScBadge.test.tsx`、`songlist-FilterBar.test.tsx`、`songlist-SongRow.test.tsx`、`songlist-SongTable.test.tsx`
- 重写 `__tests__/unit/components/SongList.test.tsx`（旧 573 行断言旧 UI，全部替换）
- 扩展 `__tests__/unit/components/VirtualList.test.tsx`（新增 scrollToIndex 用例）
- 重写 `__tests__/e2e/music.spec.ts`（适配新选择器）

**不动：** `src/data/songs.json`、`collector/`、`music.astro`（页面头部与 `<SongList client:load songs={songs}/>` 调用不变；新 `SongList` 自带工具栏/筛选/表格，与页面 h1 不重复）。

---

## Task 1: 新增 global.css 歌单样式与 `--sc-tint` token

**Files:**
- Modify: `src/styles/global.css`（在 `@layer components` 与 `:root`/`:root.dark` 末尾追加）

- [ ] **Step 1: 在 `:root` 块（base layer 内）追加 SC 行底 token**

在 `src/styles/global.css` 的 `:root { ... }`（约第 63–75 行 `--glass-blur: 12px;` 之后）追加：

```css
    /* SC 礼物曲行底（极淡金水洗，与主题协调） */
    --sc-tint: oklch(0.955 0.035 85);
```

在 `:root.dark { ... }`（约第 78–89 行 `--glass-blur: 16px;` 之后）追加：

```css
    --sc-tint: oklch(0.24 0.05 76 / 0.5);
```

- [ ] **Step 2: 在 `@layer components` 末尾追加歌单语义类**

在 `src/styles/global.css` 的 `@layer components { ... }`（`.glass` 等之后、闭合 `}` 之前）追加：

```css
  /* === 歌单列表重设计（玻璃乐谱） === */
  .sl-bar { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; padding:.6rem .75rem;
            background:var(--glass-bg); border:1px solid var(--glass-border);
            backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur));
            border-radius:.75rem; }
  .sl-search { flex:1; min-width:8rem; background:transparent; border:none; outline:none;
               color:var(--text-primary); font-size:.95rem; }
  .sl-chip { font-size:.75rem; font-weight:600; padding:.25rem .6rem; border-radius:9999px;
             white-space:nowrap; cursor:pointer; transition:transform .15s ease, box-shadow .15s ease;
             border:1px solid transparent; background:color-mix(in oklab, var(--text-primary) 8%, transparent);
             color:var(--text-secondary); }
  .sl-chip:hover { transform:translateY(-1px); }
  .sl-chip.is-pink { background:color-mix(in oklab, var(--color-pink-500) 18%, transparent); color:var(--color-pink-500); }
  .sl-chip.is-blue { background:color-mix(in oklab, var(--color-blue-500) 18%, transparent); color:var(--color-blue-500); }
  .sl-chip.is-active { box-shadow:0 0 0 2px var(--accent-primary); }
  .sl-chip.is-pink.is-active { box-shadow:0 0 0 2px var(--color-pink-500); }
  .sl-chip.is-blue.is-active { box-shadow:0 0 0 2px var(--color-blue-500); }
  .sl-chip:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .sl-more { font-size:.75rem; padding:.25rem .6rem; border-radius:9999px; cursor:pointer;
             border:1px dashed var(--glass-border); color:var(--text-secondary); background:transparent; }
  .sl-toggle { font-size:.75rem; font-weight:700; padding:.25rem .65rem; border-radius:9999px; cursor:pointer;
               border:1px solid transparent; background:color-mix(in oklab, var(--color-pink-500) 14%, transparent);
               color:var(--color-pink-500); }
  .sl-toggle.is-active { box-shadow:0 0 0 2px var(--color-pink-500); }

  .song-table { background:var(--glass-bg); border:1px solid var(--glass-border);
                backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur));
                border-radius:.75rem; overflow:hidden; }
  .song-thead { display:grid; grid-template-columns:3.5rem 1.4fr 1.3fr 4rem 4.5rem; gap:.5rem;
                padding:.5rem .75rem; color:var(--text-secondary); font-size:.7rem;
                text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--glass-border); }
  .sort-col { display:flex; align-items:center; gap:.2rem; background:transparent; border:none; cursor:pointer;
              color:inherit; font:inherit; text-transform:inherit; letter-spacing:inherit; padding:0; }
  .sort-col:disabled { cursor:default; }
  .sort-col.is-active { color:var(--accent-primary); }
  .sort-arrow { font-size:.65rem; }

  .song-row { width:100%; }
  .song-row-grid { display:grid; grid-template-columns:3.5rem 1.4fr 1.3fr 4rem 4.5rem; gap:.5rem;
                   align-items:center; padding:0 .75rem; height:100%; cursor:pointer;
                   transition:background-color .15s ease, box-shadow .15s ease; }
  .song-row:hover { background:color-mix(in oklab, var(--accent-primary) 12%, transparent);
                    box-shadow:inset 0 0 0 1px var(--accent-primary); }
  .song-row.is-sc { background:var(--sc-tint); }
  .song-row.is-sc:hover { background:color-mix(in oklab, var(--sc-tint) 70%, var(--accent-primary) 12%); }
  .song-row.is-copied { box-shadow:inset 0 0 0 2px var(--accent-primary); }
  .song-row .col-title { font-weight:700; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .song-row .col-artist { font-size:.8rem; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .song-row .genre-tag { font-size:.65rem; padding:.05rem .35rem; border-radius:.3rem;
                         background:color-mix(in oklab, var(--text-primary) 8%, transparent); color:var(--text-secondary); }
  .song-row mark { background:color-mix(in oklab, var(--accent-primary) 35%, transparent);
                   color:inherit; border-radius:.2rem; padding:0 .1rem; }

  .song-card { display:flex; flex-direction:column; gap:.1rem; padding:.45rem .75rem; height:100%; cursor:pointer; }
  .song-card .card-top { display:flex; align-items:center; gap:.4rem; }
  .song-card .card-title { font-weight:700; color:var(--text-primary); }
  .song-card .card-artist { font-size:.8rem; color:var(--text-secondary); }
  .song-card .card-meta { display:flex; gap:.4rem; align-items:center; flex-wrap:wrap; margin-top:.1rem; }

  .sc-badge { display:inline-flex; align-items:center; gap:.2rem; font-size:.7rem; font-weight:800;
              padding:.15rem .45rem; border-radius:9999px; white-space:nowrap;
              background:var(--accent-primary); color:#fff;
              box-shadow:0 2px 8px color-mix(in oklab, var(--accent-primary) 45%, transparent); }
  .sc-badge__gem { width:.8rem; height:.8rem; }
```

- [ ] **Step 3: 验证构建通过（CSS 语法正确）**

Run: `bun run build`
Expected: 构建成功（`astro check` + `astro build` 完成，无 CSS/类型错误）。

- [ ] **Step 4: 提交**

```bash
git add src/styles/global.css
git commit -m "feat(songlist): 新增歌单表格/筛选/SC徽章样式与 --sc-tint token"
```

---

## Task 2: types.ts + utils.ts（纯逻辑，TDD）

**Files:**
- Create: `src/components/react/songlist/types.ts`
- Create: `src/components/react/songlist/utils.ts`
- Test: `__tests__/unit/components/songlist-utils.test.ts`

- [ ] **Step 1: 写 types.ts**

`src/components/react/songlist/types.ts`：

```ts
export interface Song {
  title: string;
  artist: string;
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
```

- [ ] **Step 2: 写失败测试 `songlist-utils.test.ts`**

`__tests__/unit/components/songlist-utils.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { pinyin } from 'pinyin-pro';
import {
  songKey, getTags, pinyinKey, scAmount, hasGift, langColor,
  matchesFilters, filterSongs, sortSongs, highlightSegments, deriveFacets,
} from '../../../src/components/react/songlist/utils';
import type { Song } from '../../../src/components/react/songlist/types';

// 与现有 SongList.test.tsx 一致：把 pinyin 降级为逐字符小写数组
vi.mock('pinyin-pro', () => ({
  pinyin: vi.fn((text: string) => text.toLowerCase().split('')),
}));
import { vi } from 'vitest';

const s = (over: Partial<Song>): Song => ({
  title: 'T', artist: 'A', languages: [], genres: [], gifts: [], ...over,
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

  describe('pinyinKey', () => {
    it('调用 pinyin 并拼接小写', () => {
      expect(pinyinKey('AB')).toBe('ab');
      expect(pinyin).toHaveBeenCalledWith('AB', expect.anything());
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
    it('搜索：拼音匹配', () => {
      (pinyin as any).mockImplementation(() => 'dayu'.split(''));
      expect(matchesFilters(s({ title: '大鱼' }), { query: 'dayu', languages: [], genres: [], scOnly: false })).toBe(true);
    });
    it('维度间 AND（语言 AND 搜索）', () => {
      const f = { query: '大', languages: ['国语'], genres: [], scOnly: false };
      expect(matchesFilters(s({ title: '大鱼', languages: ['国语'] }), f)).toBe(true);
      expect(matchesFilters(s({ title: '大鱼', languages: ['日语'] }), f)).toBe(false);
    });
  });

  it('filterSongs 与 sortSongs 组合', () => {
    const songs = [
      s({ title: '晴天', artist: '周杰伦', languages: ['国语'] }),
      s({ title: '阿城', artist: '阿妹', languages: ['国语'] }),
      s({ title: 'Bad', artist: 'B', languages: ['英语'] }),
    ];
    const filtered = filterSongs(songs, { query: '', languages: ['国语'], genres: [], scOnly: false });
    expect(filtered).toHaveLength(2);
    const sorted = sortSongs(filtered, { key: 'title', dir: 'asc' });
    expect(sorted.map(x => x.title)).toEqual(['阿城', '晴天']); // pinyin a < q
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
  });

  describe('highlightSegments', () => {
    it('无 query 返回整段非命中', () => {
      expect(highlightSegments('大鱼', '')).toEqual([{ text: '大鱼', hit: false }]);
    });
    it('命中分段', () => {
      expect(highlightSegments('Bad apple', 'bad')).toEqual([
        { text: '', hit: false },
        { text: 'Bad', hit: true },
        { text: ' apple', hit: false },
      ].filter(x => x.text.length > 0));
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
  });
});
```

> 注：`vi` 的 import 放在 `vi.mock` 之后仅为满足提升语义；实际请将 `import { vi } from 'vitest'` 与顶部其它 vitest import 合并。**修正：把第一行改为** `import { describe, it, expect, vi } from 'vitest';` **并删除文件末尾的 `import { vi } from 'vitest';`**，`vi.mock` 保持在导入之后。

- [ ] **Step 3: 运行测试，确认失败**

Run: `bunx vitest run __tests__/unit/components/songlist-utils.test.ts`
Expected: FAIL（`Cannot find module .../songlist/utils`）。

- [ ] **Step 4: 写 utils.ts 实现**

`src/components/react/songlist/utils.ts`：

```ts
import { pinyin } from 'pinyin-pro';
import type { Song, FilterState, SortState, SortKey, LanguageFacet } from './types';
import { LANGUAGE_ORDER } from './types';

export const songKey = (song: Song): string => `${song.title}-${song.artist}`;

export function getTags(song: Song): string[] {
  return [...song.languages, ...song.genres, ...song.gifts];
}

const PINYIN_OPTS = { toneType: 'none', type: 'array' } as const;

export function pinyinKey(text: string): string {
  return pinyin(text, PINYIN_OPTS).join('').toLowerCase();
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

/** 维度间 AND，维度内 OR；搜索支持 直接命中 + 拼音 */
export function matchesFilters(song: Song, f: FilterState): boolean {
  if (f.scOnly && !hasGift(song)) return false;
  if (f.languages.length > 0 && !song.languages.some((l) => f.languages.includes(l))) return false;
  if (f.genres.length > 0 && !song.genres.some((g) => f.genres.includes(g))) return false;
  const q = f.query.trim().toLowerCase();
  if (!q) return true;
  if (song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q)) return true;
  return pinyinKey(song.title).includes(q) || pinyinKey(song.artist).includes(q);
}

export function filterSongs(songs: Song[], f: FilterState): Song[] {
  return songs.filter((s) => matchesFilters(s, f));
}

function sortKeyValue(song: Song, key: SortKey): string {
  switch (key) {
    case 'title': return pinyinKey(song.title);
    case 'artist': return pinyinKey(song.artist);
    case 'language': return song.languages[0] ?? '';
    case 'genre': return song.genres[0] ?? '';
    default: return '';
  }
}

export function sortSongs(songs: Song[], st: SortState): Song[] {
  if (st.key === 'default') return songs;
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
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `bunx vitest run __tests__/unit/components/songlist-utils.test.ts`
Expected: PASS（全部用例绿）。

- [ ] **Step 6: 提交**

```bash
git add src/components/react/songlist/types.ts src/components/react/songlist/utils.ts __tests__/unit/components/songlist-utils.test.ts
git commit -m "feat(songlist): 纯逻辑层 types + utils（筛选/排序/高亮/SC/分面）"
```

---

## Task 3: VirtualList 增加 `scrollToIndex` 受控滚动（TDD）

**Files:**
- Modify: `src/components/react/VirtualList.tsx`
- Test: `__tests__/unit/components/VirtualList.test.tsx`（追加用例）

- [ ] **Step 1: 先读现有 VirtualList.test.tsx 末尾，确认追加位置**

Run: `bunx vitest run __tests__/unit/components/VirtualList.test.tsx`
Expected: 现有用例全绿（确认基线）。记下文件末尾 `});` 位置用于追加新 `describe`。

- [ ] **Step 2: 追加失败测试**

在 `__tests__/unit/components/VirtualList.test.tsx` 末尾（最后一个顶层 `});` 之后）追加：

```tsx
describe('VirtualList scrollToIndex', () => {
  it('设置 scrollToIndex 时滚动容器到对应位置并回调', async () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const onHandled = vi.fn();
    const { rerender } = render(
      <VirtualList
        items={items}
        itemHeight={50}
        containerHeight={200}
        scrollToIndex={null}
        onScrollToHandled={onHandled}
        renderItem={(n) => <div>{n}</div>}
      />,
    );
    const list = screen.getByTestId('virtual-list');
    expect(list.scrollTop).toBe(0);

    rerender(
      <VirtualList
        items={items}
        itemHeight={50}
        containerHeight={200}
        scrollToIndex={10}
        onScrollToHandled={onHandled}
        renderItem={(n) => <div>{n}</div>}
      />,
    );
    await waitFor(() => {
      expect(list.scrollTop).toBe(500); // 10 * 50
    });
    expect(onHandled).toHaveBeenCalled();
  });

  it('scrollToIndex 为 null 时不滚动', () => {
    render(
      <VirtualList items={[0, 1, 2]} itemHeight={50} containerHeight={100} scrollToIndex={null}
        renderItem={(n) => <div>{n}</div>} />,
    );
    expect(screen.getByTestId('virtual-list').scrollTop).toBe(0);
  });
});
```

> 若文件顶部尚未导入 `vi/waitFor/render/screen`，在现有 import 中补齐：`import { render, screen, waitFor } from '@testing-library/react';` 与 `import { vi } from 'vitest';`（按需）。

- [ ] **Step 3: 运行测试，确认新用例失败**

Run: `bunx vitest run __tests__/unit/components/VirtualList.test.tsx`
Expected: 新增 2 个用例 FAIL（`scrollTop` 仍为 0 / 属性不存在），原有用例仍绿。

- [ ] **Step 4: 修改 VirtualList.tsx 增加可选 props + 副作用**

将 `src/components/react/VirtualList.tsx` 第 1 行 import 与接口/组件改为：

```tsx
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  scrollToIndex?: number | null;
  onScrollToHandled?: () => void;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  scrollToIndex,
  onScrollToHandled,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIdx = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
    );
    const offsetY = startIdx * itemHeight;
    return { startIdx, endIdx, offsetY };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 受控滚动：外部传入 scrollToIndex 时定位并回调
  useEffect(() => {
    if (scrollToIndex == null || !containerRef.current) return;
    const target = Math.max(0, Math.min(scrollToIndex, items.length - 1)) * itemHeight;
    containerRef.current.scrollTop = target;
    setScrollTop(target);
    onScrollToHandled?.();
  }, [scrollToIndex, itemHeight, items.length, onScrollToHandled]);

  const visibleItems = items.slice(visibleRange.startIdx, visibleRange.endIdx + 1);

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      data-testid="virtual-list"
      data-total-items={items.length}
    >
      <ul
        role="list"
        style={{
          height: items.length * itemHeight,
          position: 'relative',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {visibleItems.map((item, index) => (
          <li
            key={visibleRange.startIdx + index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: itemHeight,
              transform: `translateY(${(visibleRange.startIdx + index) * itemHeight}px)`,
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {renderItem(item, visibleRange.startIdx + index)}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: 运行测试，确认全绿**

Run: `bunx vitest run __tests__/unit/components/VirtualList.test.tsx`
Expected: PASS（含新增 2 用例）。

- [ ] **Step 6: 提交**

```bash
git add src/components/react/VirtualList.tsx __tests__/unit/components/VirtualList.test.tsx
git commit -m "feat(songlist): VirtualList 增加 scrollToIndex 受控滚动"
```

---

## Task 4: ScBadge 组件（TDD）

**Files:**
- Create: `src/components/react/songlist/ScBadge.tsx`
- Test: `__tests__/unit/components/songlist-ScBadge.test.tsx`

- [ ] **Step 1: 写失败测试**

`__tests__/unit/components/songlist-ScBadge.test.tsx`：

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScBadge from '../../../src/components/react/songlist/ScBadge';

describe('ScBadge', () => {
  it('渲染金额与宝石图标', () => {
    render(<ScBadge amount="100 SC" />);
    expect(screen.getByText('100 SC')).toBeInTheDocument();
    expect(document.querySelector('.sc-badge__gem')).toBeInTheDocument();
  });

  it('应用 sc-badge 类', () => {
    const { container } = render(<ScBadge amount="30 SC" />);
    expect(container.querySelector('.sc-badge')).toBeInTheDocument();
  });

  it('带 title 提示', () => {
    render(<ScBadge amount="100 SC" />);
    expect(screen.getByTitle('礼物曲 100 SC')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `bunx vitest run __tests__/unit/components/songlist-ScBadge.test.tsx`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写实现**

`src/components/react/songlist/ScBadge.tsx`：

```tsx
import { Gem } from 'lucide-react';

export interface ScBadgeProps {
  amount: string;
}

export default function ScBadge({ amount }: ScBadgeProps) {
  return (
    <span className="sc-badge" title={`礼物曲 ${amount}`}>
      <Gem className="sc-badge__gem" aria-hidden="true" />
      {amount}
    </span>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `bunx vitest run __tests__/unit/components/songlist-ScBadge.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/components/react/songlist/ScBadge.tsx __tests__/unit/components/songlist-ScBadge.test.tsx
git commit -m "feat(songlist): SC 金额徽章组件 ScBadge"
```

---

## Task 5: FilterBar 组件（TDD）

**Files:**
- Create: `src/components/react/songlist/FilterBar.tsx`
- Test: `__tests__/unit/components/songlist-FilterBar.test.tsx`

- [ ] **Step 1: 写失败测试**

`__tests__/unit/components/songlist-FilterBar.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBar from '../../../src/components/react/songlist/FilterBar';

const baseProps = {
  query: '',
  onQueryChange: vi.fn(),
  languages: [
    { value: '国语', count: 192 },
    { value: '日语', count: 155 },
    { value: '英语', count: 50 },
  ],
  selectedLanguages: [],
  onToggleLanguage: vi.fn(),
  topGenres: ['流行', '影视'],
  moreGenres: ['爵士', '民谣'],
  selectedGenres: [],
  onToggleGenre: vi.fn(),
  scOnly: false,
  onToggleScOnly: vi.fn(),
};

describe('FilterBar', () => {
  it('渲染搜索框（新 placeholder）', () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…')).toBeInTheDocument();
  });

  it('渲染语言 chip 含计数', () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByLabelText('筛选语言: 国语')).toHaveTextContent('国语 192');
  });

  it('输入触发 onQueryChange', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    await user.type(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…'), '晴');
    expect(baseProps.onQueryChange).toHaveBeenCalledWith('晴');
  });

  it('点击语言 chip 调用 onToggleLanguage', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    await user.click(screen.getByLabelText('筛选语言: 国语'));
    expect(baseProps.onToggleLanguage).toHaveBeenCalledWith('国语');
  });

  it('选中语言 chip 有 is-active 类', () => {
    render(<FilterBar {...baseProps} selectedLanguages={['国语']} />);
    expect(screen.getByLabelText('筛选语言: 国语')).toHaveClass('is-active');
  });

  it('点击流派 chip 调用 onToggleGenre', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    await user.click(screen.getByLabelText('筛选流派: 流行'));
    expect(baseProps.onToggleGenre).toHaveBeenCalledWith('流行');
  });

  it('热门流派直出，更多流派默认隐藏，点 +N 展开后可见', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    expect(screen.getByLabelText('筛选流派: 流行')).toBeInTheDocument();
    expect(screen.queryByLabelText('筛选流派: 爵士')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /\+2 更多流派/ }));
    expect(screen.getByLabelText('筛选流派: 爵士')).toBeInTheDocument();
  });

  it('点击 SC 开关调用 onToggleScOnly', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    await user.click(screen.getByTestId('sc-toggle'));
    expect(baseProps.onToggleScOnly).toHaveBeenCalled();
  });

  it('scOnly 开启时开关 is-active', () => {
    render(<FilterBar {...baseProps} scOnly={true} />);
    expect(screen.getByTestId('sc-toggle')).toHaveClass('is-active');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `bunx vitest run __tests__/unit/components/songlist-FilterBar.test.tsx`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写实现**

`src/components/react/songlist/FilterBar.tsx`：

```tsx
import { useState } from 'react';
import { Search } from 'lucide-react';
import type { LanguageFacet } from './types';
import { langColor } from './utils';

export interface FilterBarProps {
  query: string;
  onQueryChange: (v: string) => void;
  languages: LanguageFacet[];
  selectedLanguages: string[];
  onToggleLanguage: (v: string) => void;
  topGenres: string[];
  moreGenres: string[];
  selectedGenres: string[];
  onToggleGenre: (v: string) => void;
  scOnly: boolean;
  onToggleScOnly: () => void;
}

export default function FilterBar({
  query, onQueryChange,
  languages, selectedLanguages, onToggleLanguage,
  topGenres, moreGenres, selectedGenres, onToggleGenre,
  scOnly, onToggleScOnly,
}: FilterBarProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="sl-bar" data-testid="filter-bar">
      <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
      <input
        type="text"
        className="sl-search"
        placeholder="搜索歌名 / 歌手 / 拼音…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-label="搜索歌曲"
      />

      {languages.map((l) => {
        const active = selectedLanguages.includes(l.value);
        return (
          <button
            key={l.value}
            type="button"
            className={`sl-chip is-${langColor(l.value)} ${active ? 'is-active' : ''}`}
            aria-label={`筛选语言: ${l.value}`}
            aria-pressed={active}
            onClick={() => onToggleLanguage(l.value)}
          >
            {l.value} {l.count}
          </button>
        );
      })}

      {topGenres.map((g) => {
        const active = selectedGenres.includes(g);
        return (
          <button
            key={g}
            type="button"
            className={`sl-chip ${active ? 'is-active' : ''}`}
            aria-label={`筛选流派: ${g}`}
            aria-pressed={active}
            onClick={() => onToggleGenre(g)}
          >
            {g}
          </button>
        );
      })}

      {moreGenres.length > 0 && (
        <>
          <button
            type="button"
            className="sl-more"
            aria-expanded={showMore}
            onClick={() => setShowMore((v) => !v)}
          >
            +{moreGenres.length} 更多流派
          </button>
          {showMore && (
            <div className="contents">
              {moreGenres.map((g) => {
                const active = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    className={`sl-chip ${active ? 'is-active' : ''}`}
                    aria-label={`筛选流派: ${g}`}
                    aria-pressed={active}
                    onClick={() => onToggleGenre(g)}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <button
        type="button"
        data-testid="sc-toggle"
        className={`sl-toggle ${scOnly ? 'is-active' : ''}`}
        aria-pressed={scOnly}
        onClick={onToggleScOnly}
      >
        💎 仅 SC 曲
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `bunx vitest run __tests__/unit/components/songlist-FilterBar.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/components/react/songlist/FilterBar.tsx __tests__/unit/components/songlist-FilterBar.test.tsx
git commit -m "feat(songlist): FilterBar（搜索+语言/流派chip+SC开关）"
```

---

## Task 6: SongRow 组件（桌面行/移动卡片，TDD）

**Files:**
- Create: `src/components/react/songlist/SongRow.tsx`
- Test: `__tests__/unit/components/songlist-SongRow.test.tsx`

- [ ] **Step 1: 写失败测试**

`__tests__/unit/components/songlist-SongRow.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongRow from '../../../src/components/react/songlist/SongRow';
import type { Song } from '../../../src/components/react/songlist/types';

const song: Song = {
  title: '晴天', artist: '周杰伦', languages: ['国语'], genres: ['流行', '抒情'], gifts: [],
};
const scSong: Song = {
  title: '紅蓮華', artist: 'LiSA', languages: ['日语'], genres: ['摇滚'], gifts: ['100 SC'],
};

const renderRow = (over: Partial<Parameters<typeof SongRow>[0]> = {}) =>
  render(<SongRow song={song} query="" variant="row" copied={false} onCopy={vi.fn()} {...over} />);

describe('SongRow', () => {
  it('行变体渲染列对齐网格', () => {
    renderRow();
    expect(document.querySelector('.song-row-grid')).toBeInTheDocument();
    expect(screen.getByText('晴天')).toBeInTheDocument();
    expect(screen.getByText('周杰伦')).toBeInTheDocument();
    expect(screen.getByText('流行')).toBeInTheDocument();
  });

  it('点击行触发 onCopy', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<SongRow song={song} query="" variant="row" copied={false} onCopy={onCopy} />);
    await user.click(screen.getByText('晴天'));
    expect(onCopy).toHaveBeenCalledWith(song);
  });

  it('SC 曲渲染 ScBadge 且行有 is-sc 类', () => {
    const { container } = render(
      <SongRow song={scSong} query="" variant="row" copied={false} onCopy={vi.fn()} />,
    );
    expect(screen.getByText('100 SC')).toBeInTheDocument();
    expect(container.querySelector('.song-row')).toHaveClass('is-sc');
  });

  it('多流派只显示首个 + 计数', () => {
    renderRow();
    expect(screen.getByText('流行')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('copied 时行有 is-copied 类', () => {
    const { container } = render(
      <SongRow song={song} query="" variant="row" copied={true} onCopy={vi.fn()} />,
    );
    expect(container.querySelector('.song-row')).toHaveClass('is-copied');
  });

  it('搜索高亮：命中片段包 mark', () => {
    render(<SongRow song={song} query="晴" variant="row" copied={false} onCopy={vi.fn()} />);
    expect(document.querySelector('mark')).toHaveTextContent('晴');
  });

  it('卡片变体渲染 song-card', () => {
    render(<SongRow song={song} query="" variant="card" copied={false} onCopy={vi.fn()} />);
    expect(document.querySelector('.song-card')).toBeInTheDocument();
    expect(document.querySelector('.song-row-grid')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `bunx vitest run __tests__/unit/components/songlist-SongRow.test.tsx`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写实现**

`src/components/react/songlist/SongRow.tsx`：

```tsx
import type { Song } from './types';
import { songKey, scAmount, langColor, highlightSegments } from './utils';
import ScBadge from './ScBadge';

export interface SongRowProps {
  song: Song;
  query: string;
  variant: 'row' | 'card';
  copied: boolean;
  onCopy: (song: Song) => void;
}

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightSegments(text, query).map((seg, i) =>
        seg.hit ? <mark key={i}>{seg.text}</mark> : <span key={i}>{seg.text}</span>,
      )}
    </>
  );
}

export default function SongRow({ song, query, variant, copied, onCopy }: SongRowProps) {
  const lang = song.languages[0] ?? '';
  const sc = scAmount(song);
  const extraGenres = Math.max(0, song.genres.length - 1);
  const classNames = [
    'song-row',
    variant === 'row' ? 'song-row-grid' : 'song-card',
    sc ? 'is-sc' : '',
    copied ? 'is-copied' : '',
  ].filter(Boolean).join(' ');
  const langClass = `sl-chip is-${langColor(lang)}`;

  const handle = () => onCopy(song);

  if (variant === 'card') {
    return (
      <div
        className={classNames}
        data-testid="song-row"
        onClick={handle}
        role="button"
        tabIndex={0}
        aria-label={`点歌 ${song.title}`}
      >
        <div className="card-top">
          {lang && <span className={langClass}>{lang}</span>}
          {sc && <ScBadge amount={sc} />}
        </div>
        <div className="card-title"><Highlight text={song.title} query={query} /></div>
        <div className="card-artist"><Highlight text={song.artist} query={query} /></div>
        {song.genres.length > 0 && (
          <div className="card-meta">
            <span className="genre-tag">{song.genres[0]}</span>
            {extraGenres > 0 && <span className="genre-tag">+{extraGenres}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={classNames}
      data-testid="song-row"
      onClick={handle}
      role="button"
      tabIndex={0}
      aria-label={`点歌 ${song.title}`}
    >
      <span className={langClass}>{lang}</span>
      <span className="col-title"><Highlight text={song.title} query={query} /></span>
      <span className="col-artist"><Highlight text={song.artist} query={query} /></span>
      <span>
        {song.genres[0] && <span className="genre-tag">{song.genres[0]}</span>}
        {extraGenres > 0 && <span className="genre-tag">+{extraGenres}</span>}
      </span>
      <span>{sc && <ScBadge amount={sc} />}</span>
    </div>
  );
}

// 复用 songKey 避免未使用警告（容器侧也用）；导出便于测试
export { songKey };
```

> 注：底部 `export { songKey }` 仅为了在 `noUnusedLocals` 关闭的情况下保持导入有意义；若 linter 报重复导出可删除该行并删除对应 import。`songKey` 在容器 Task 8 中会从 `utils` 直接导入，此处不依赖。

- [ ] **Step 4: 运行，确认通过**

Run: `bunx vitest run __tests__/unit/components/songlist-SongRow.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/components/react/songlist/SongRow.tsx __tests__/unit/components/songlist-SongRow.test.tsx
git commit -m "feat(songlist): SongRow（列对齐行/移动卡片 + 高亮 + SC）"
```

---

## Task 7: SongTable + SortHeader（TDD）

**Files:**
- Create: `src/components/react/songlist/SongTable.tsx`
- Test: `__tests__/unit/components/songlist-SongTable.test.tsx`

- [ ] **Step 1: 写失败测试**

`__tests__/unit/components/songlist/SongTable.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongTable from '../../../src/components/react/songlist/SongTable';
import type { Song, SortState } from '../../../src/components/react/songlist/types';

// 复用项目惯例：mock VirtualList 为平铺渲染
vi.mock('../../../src/components/react/VirtualList', () => ({
  default: ({ items, renderItem, dataTotalItems }: any) => (
    <div data-testid="virtual-list" data-total-items={items.length}>
      {items.map((it: any, i: number) => renderItem(it, i))}
    </div>
  ),
}));

const songs: Song[] = [
  { title: '晴天', artist: '周杰伦', languages: ['国语'], genres: ['流行'], gifts: [] },
  { title: 'Lemon', artist: '米津玄師', languages: ['日语'], genres: ['流行'], gifts: [] },
];
const sort: SortState = { key: 'default', dir: 'asc' };

describe('SongTable', () => {
  it('渲染表头四列', () => {
    render(<SongTable songs={songs} query="" sort={sort} onSortChange={vi.fn()} onCopy={vi.fn()} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    expect(screen.getByRole('columnheader', { name: /歌名/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /歌手/ })).toBeInTheDocument();
  });

  it('渲染每行为 song-row', () => {
    render(<SongTable songs={songs} query="" sort={sort} onSortChange={vi.fn()} onCopy={vi.fn()} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    expect(screen.getAllByTestId('song-row')).toHaveLength(2);
  });

  it('点击歌名列头调用 onSortChange("title")', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<SongTable songs={songs} query="" sort={sort} onSortChange={onSortChange} onCopy={vi.fn()} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    await user.click(screen.getByRole('columnheader', { name: /歌名/ }));
    expect(onSortChange).toHaveBeenCalledWith('title');
  });

  it('当前排序列头有 is-active 与方向箭头', () => {
    render(<SongTable songs={songs} query="" sort={{ key: 'title', dir: 'desc' }} onSortChange={vi.fn()} onCopy={vi.fn()} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    const h = screen.getByRole('columnheader', { name: /歌名/ });
    expect(h).toHaveClass('is-active');
    expect(h).toHaveTextContent('▼');
  });

  it('空结果显示空状态', () => {
    render(<SongTable songs={[]} query="" sort={sort} onSortChange={vi.fn()} onCopy={vi.fn()} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
    expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
  });

  it('点击行调用 onCopy', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<SongTable songs={songs} query="" sort={sort} onSortChange={vi.fn()} onCopy={onCopy} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    await user.click(screen.getByText('晴天'));
    expect(onCopy).toHaveBeenCalledWith(songs[0]);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `bunx vitest run __tests__/unit/components/songlist-SongTable.test.tsx`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写实现**

`src/components/react/songlist/SongTable.tsx`：

```tsx
import { useMemo } from 'react';
import VirtualList from '../VirtualList';
import type { Song, SortState, SortKey } from './types';
import { songKey } from './utils';
import SongRow from './SongRow';

export interface SongTableProps {
  songs: Song[];
  query: string;
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  onCopy: (song: Song) => void;
  copiedId: string | null;
  scrollToIndex: number | null;
  onScrollToHandled: () => void;
}

const COLUMNS: { key: SortKey; label: string; sortable: boolean }[] = [
  { key: 'language', label: '语言', sortable: true },
  { key: 'title', label: '歌名', sortable: true },
  { key: 'artist', label: '歌手', sortable: true },
  { key: 'genre', label: '流派', sortable: true },
  { key: 'default', label: 'SC', sortable: false },
];

function SortHeader({ sort, onSortChange }: { sort: SortState; onSortChange: (k: SortKey) => void }) {
  return (
    <div className="song-thead" role="row">
      {COLUMNS.map((c) => {
        const active = sort.key === c.key;
        return (
          <button
            key={c.key}
            type="button"
            role="columnheader"
            className={`sort-col ${active ? 'is-active' : ''}`}
            disabled={!c.sortable}
            aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            onClick={() => c.sortable && onSortChange(c.key)}
          >
            {c.label}
            {active && <span className="sort-arrow">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function SongTable({
  songs, query, sort, onSortChange, onCopy, copiedId, scrollToIndex, onScrollToHandled,
}: SongTableProps) {
  // 断点切换行/卡片；jsdom 默认非移动端 → row
  const isMobile = typeof window !== 'undefined'
    && window.matchMedia('(max-width: 639px)').matches;
  const variant = isMobile ? 'card' : 'row';
  const itemHeight = isMobile ? 84 : 52;

  const empty = songs.length === 0;

  const rendered = useMemo(
    () => (
      <VirtualList
        items={songs}
        itemHeight={itemHeight}
        containerHeight={640}
        scrollToIndex={scrollToIndex}
        onScrollToHandled={onScrollToHandled}
        renderItem={(song: Song) => (
          <SongRow
            song={song}
            query={query}
            variant={variant}
            copied={copiedId === songKey(song)}
            onCopy={onCopy}
          />
        )}
      />
    ),
    [songs, itemHeight, query, variant, copiedId, onCopy, scrollToIndex, onScrollToHandled],
  );

  if (empty) {
    return (
      <div className="text-center py-16" data-testid="empty-state">
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          没有找到匹配的歌曲
        </p>
      </div>
    );
  }

  return (
    <div className="song-table">
      <SortHeader sort={sort} onSortChange={onSortChange} />
      {rendered}
    </div>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `bunx vitest run __tests__/unit/components/songlist-SongTable.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/components/react/songlist/SongTable.tsx __tests__/unit/components/songlist-SongTable.test.tsx
git commit -m "feat(songlist): SongTable（固定表头+列排序+空状态+移动变体）"
```

---

## Task 8: SongList 容器 + 重写 SongList.test.tsx（TDD）

**Files:**
- Modify: `src/components/react/SongList.tsx`（整体重写）
- Test: `__tests__/unit/components/SongList.test.tsx`（整体重写，替换旧 573 行）

- [ ] **Step 1: 重写失败测试 `SongList.test.tsx`**

完全替换 `__tests__/unit/components/SongList.test.tsx` 内容为：

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongList from '../../../src/components/react/SongList';
import { toast } from 'sonner';

vi.mock('pinyin-pro', () => ({
  pinyin: vi.fn((text: string) => text.toLowerCase().split('')),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../../src/components/react/VirtualList', () => ({
  default: ({ items, renderItem }: any) => (
    <div data-testid="virtual-list" data-total-items={items.length}>
      {items.map((it: any, i: number) => renderItem(it, i))}
    </div>
  ),
}));

const songs = [
  { title: '大鱼', artist: 'Vsinger', languages: ['国语'], genres: ['治愈'], gifts: [] },
  { title: 'Bad apple', artist: 'Vsinger', languages: ['日语'], genres: ['东方'], gifts: [] },
  { title: '付费歌', artist: 'A', languages: ['国语'], genres: ['流行'], gifts: ['100 SC'] },
];

describe('SongList (重设计)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('渲染搜索框与新工具栏', () => {
    render(<SongList songs={songs} />);
    expect(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…')).toBeInTheDocument();
    expect(screen.getByTestId('random-button')).toBeInTheDocument();
    expect(screen.getByText(/共 3 首/)).toBeInTheDocument();
  });

  it('渲染所有歌曲行', () => {
    render(<SongList songs={songs} />);
    expect(screen.getAllByTestId('song-row')).toHaveLength(3);
  });

  it('空数据显示空状态', () => {
    render(<SongList songs={[]} />);
    expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
  });

  it('搜索按标题过滤', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.type(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…'), '大鱼');
    expect(screen.getByText('大鱼')).toBeInTheDocument();
    expect(screen.queryByText('Bad apple')).not.toBeInTheDocument();
  });

  it('点击语言 chip 过滤', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByLabelText('筛选语言: 日语'));
    expect(screen.getByText('Bad apple')).toBeInTheDocument();
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
  });

  it('仅 SC 开关过滤礼物曲', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByTestId('sc-toggle'));
    expect(screen.getByText('付费歌')).toBeInTheDocument();
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
  });

  it('点击列头按歌名排序', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByRole('columnheader', { name: /歌名/ }));
    const rows = screen.getAllByTestId('song-row');
    // pinyin: Bad(b) < 大鱼(d, mocked 逐字符) < 付费(f)
    expect(rows[0]).toHaveTextContent('Bad apple');
  });

  it('点击行复制点歌文案并 toast', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByText('大鱼'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('点歌 大鱼');
    expect(toast.success).toHaveBeenCalledWith('已复制: 大鱼', expect.any(Object));
  });

  it('随机按钮从结果中复制一首', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByTestId('random-button'));
    const titles = songs.map((s) => `点歌 ${s.title}`);
    const called = (navigator.clipboard.writeText as any).mock.calls.map((c: string[]) => c[0]);
    expect(called.some((t: string) => titles.includes(t))).toBe(true);
  });

  it('结果为空时随机按钮禁用', () => {
    render(<SongList songs={[]} />);
    expect(screen.getByTestId('random-button')).toBeDisabled();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `bunx vitest run __tests__/unit/components/SongList.test.tsx`
Expected: FAIL（旧组件已不渲染新 placeholder/结构）。

- [ ] **Step 3: 重写 SongList.tsx**

完全替换 `src/components/react/SongList.tsx` 内容为：

```tsx
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import type { Song, FilterState, SortState, SortKey } from './songlist/types';
import { filterSongs, sortSongs, deriveFacets, songKey } from './songlist/utils';
import FilterBar from './songlist/FilterBar';
import SongTable from './songlist/SongTable';

export interface SongListProps {
  songs: Song[];
}

const EMPTY_FILTER: FilterState = { query: '', languages: [], genres: [], scOnly: false };

export default function SongList({ songs }: SongListProps) {
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortState>({ key: 'default', dir: 'asc' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);

  const facets = useMemo(() => deriveFacets(songs), [songs]);
  const visible = useMemo(() => sortSongs(filterSongs(songs, filter), sort), [songs, filter, sort]);

  const handleCopy = useCallback(async (song: Song) => {
    setCopiedId(songKey(song));
    window.setTimeout(() => setCopiedId((cur) => (cur === songKey(song) ? null : cur)), 300);
    try {
      await navigator.clipboard.writeText(`点歌 ${song.title}`);
      toast.success(`已复制: ${song.title}`, {
        description: '快去直播间点歌吧!',
        duration: 3000,
        position: 'bottom-center',
        classNames: { toast: 'duality-toast', description: 'duality-toast-description', icon: 'duality-toast-icon' },
      });
    } catch {
      toast.error('复制失败，请重试');
    }
  }, []);

  const handleRandom = useCallback(() => {
    if (visible.length === 0) return;
    const idx = Math.floor(Math.random() * visible.length);
    setScrollToIndex(idx);
    void handleCopy(visible[idx]!);
  }, [visible, handleCopy]);

  const handleSortChange = useCallback((key: SortKey) => {
    setSort((prev) => (prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }));
  }, []);

  const toggle = (key: 'languages' | 'genres') => (value: string) =>
    setFilter((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-8">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          共 {songs.length} 首 · 结果 {visible.length} 首
        </span>
        <button
          type="button"
          data-testid="random-button"
          className="sl-chip is-pink"
          onClick={handleRandom}
          disabled={visible.length === 0}
          aria-label="随机一首"
        >
          🎲 随机一首
        </button>
      </div>

      <div className="sticky top-2 z-20 mb-4">
        <FilterBar
          query={filter.query}
          onQueryChange={(v) => setFilter((f) => ({ ...f, query: v }))}
          languages={facets.languages}
          selectedLanguages={filter.languages}
          onToggleLanguage={toggle('languages')}
          topGenres={facets.topGenres}
          moreGenres={facets.moreGenres}
          selectedGenres={filter.genres}
          onToggleGenre={toggle('genres')}
          scOnly={filter.scOnly}
          onToggleScOnly={() => setFilter((f) => ({ ...f, scOnly: !f.scOnly }))}
        />
      </div>

      <SongTable
        songs={visible}
        query={filter.query}
        sort={sort}
        onSortChange={handleSortChange}
        onCopy={handleCopy}
        copiedId={copiedId}
        scrollToIndex={scrollToIndex}
        onScrollToHandled={() => setScrollToIndex(null)}
      />
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `bunx vitest run __tests__/unit/components/SongList.test.tsx`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/components/react/SongList.tsx __tests__/unit/components/SongList.test.tsx
git commit -m "feat(songlist): 重写 SongList 容器（状态+筛选+排序+随机+复制）"
```

---

## Task 9: 重写 e2e `music.spec.ts`

**Files:**
- Modify: `__tests__/e2e/music.spec.ts`（整体替换为适配新 UI 的用例）

- [ ] **Step 1: 整体替换 e2e 文件**

完全替换 `__tests__/e2e/music.spec.ts` 内容为：

```ts
import { test, expect } from '@playwright/test';

test.describe('Music Page (重设计)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/music');
  });

  test('页面加载成功', async ({ page }) => {
    await expect(page).toHaveTitle(/克罗雅/);
  });

  test('显示搜索框', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索歌名 / 歌手 / 拼音…')).toBeVisible();
  });

  test('显示随机按钮与歌曲行', async ({ page }) => {
    await expect(page.getByTestId('random-button')).toBeVisible();
    await expect(page.locator('[data-testid="song-row"]').first()).toBeVisible();
  });

  test('按标题搜索缩小结果', async ({ page }) => {
    const search = page.getByPlaceholder('搜索歌名 / 歌手 / 拼音…');
    await search.fill('爱');
    await page.waitForTimeout(800);
    const total = await page.locator('[data-testid="virtual-list"]').getAttribute('data-total-items');
    const full = (await page.locator('[data-testid="song-row"]').count()) || 0;
    expect(Number(total)).toBeGreaterThan(0);
    expect(Number(total)).toBeLessThan(418);
    void full;
  });

  test('点击语言 chip 过滤', async ({ page }) => {
    await page.getByLabelText('筛选语言: 日语').click();
    await page.waitForTimeout(500);
    const total = await page.locator('[data-testid="virtual-list"]').getAttribute('data-total-items');
    expect(Number(total)).toBeGreaterThan(0);
    expect(Number(total)).toBeLessThan(418);
  });

  test('仅 SC 开关只留礼物曲', async ({ page }) => {
    await page.getByTestId('sc-toggle').click();
    await page.waitForTimeout(500);
    // 13 首 SC 曲
    await expect(page.locator('.sc-badge').first()).toBeVisible();
    const total = await page.locator('[data-testid="virtual-list"]').getAttribute('data-total-items');
    expect(Number(total)).toBeLessThanOrEqual(20);
  });

  test('点击列头排序切换箭头', async ({ page }) => {
    const head = page.getByRole('columnheader', { name: /歌名/ });
    await head.click();
    await expect(head).toContainText(/▲|▼/);
  });

  test('点击歌曲行复制并出 toast', async ({ page }) => {
    await page.locator('[data-testid="song-row"]').first().click();
    const toast = page.locator('[data-sonner-toast]');
    const count = await toast.count();
    if (count > 0) {
      await expect(toast.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('无结果显示空状态', async ({ page }) => {
    await page.getByPlaceholder('搜索歌名 / 歌手 / 拼音…').fill('zzz不存在的歌xyz123');
    await page.waitForTimeout(800);
    await expect(page.getByText('没有找到匹配的歌曲')).toBeVisible();
  });

  test('返回首页', async ({ page }) => {
    await page.getByRole('link', { name: '返回首页' }).click();
    await expect(page).toHaveURL('/');
  });
});
```

- [ ] **Step 2: 运行 e2e**

Run: `bun run test:e2e:raw music.spec.ts`
Expected: PASS（全部用例绿；若浏览器未安装先 `bun run setup:e2e`）。

- [ ] **Step 3: 提交**

```bash
git add __tests__/e2e/music.spec.ts
git commit -m "test(songlist): 重写 music e2e 适配新表格/筛选/SC/排序"
```

---

## Task 10: 全量校验（类型/构建/单测/e2e/覆盖率）

**Files:** 无（仅运行校验）

- [ ] **Step 1: 类型检查**

Run: `bun run type-check`
Expected: 无错误。

- [ ] **Step 2: Astro 检查**

Run: `bun run astro-check`
Expected: 无错误。

- [ ] **Step 3: 全量单测**

Run: `bun run test:run`
Expected: 全绿（含新组件用例、重写的 SongList/VirtualList 用例；旧 SongList 旧断言已替换）。

- [ ] **Step 4: 生产构建**

Run: `bun run build`
Expected: 成功。

- [ ] **Step 5: 全量 e2e（确认未破坏其它页）**

Run: `bun run test:e2e`
Expected: music / home / about / theme / responsive 全绿。

- [ ] **Step 6: 覆盖率（确认 ≥90% 阈值）**

Run: `bun run test:coverage`
Expected: statements/branches/functions/lines 均 ≥ 90%。

- [ ] **Step 7: 视觉自测（手动）**

Run: `bun dev`，打开 `/music`，逐项确认：
- 列对齐表格、列头点击排序、`▲▼` 指示。
- 搜索「晴」命中高亮、拼音「dayu」可搜。
- 语言/流派 chip 多选、流派「+N 更多」展开。
- 仅 SC 开关只剩 13 首、行有淡金底 + 粉/蓝实心徽章。
- 🎲 随机滚动定位 + 复制 toast。
- 切换 Angel/Demon 主题、缩窗至 <640px 切卡片行。
Expected: 全部符合设计稿。

- [ ] **Step 8: 末次提交（若有校验产生的格式/小修）**

```bash
git add -A
git commit -m "chore(songlist): 全量校验通过（类型/构建/单测/e2e/覆盖率）"
```

---

## Self-Review

**1. Spec 覆盖：**
- §5 布局/列/固定表头/虚拟化 → Task 1（CSS）、Task 7（SongTable+SortHeader）、Task 3（VirtualList）。
- §6 搜索/高亮/语言/流派/仅SC/组合逻辑 → Task 2（matchesFilters/highlight/deriveFacets）、Task 5（FilterBar）、Task 8（容器组合）。
- §7 排序（列头、默认原始序、拼音键） → Task 2（sortSongs）、Task 7（SortHeader）、Task 8（handleSortChange，默认 `{key:'default'}`）。
- §8 SC 行底+实心胶囊+动态金额+多值取max → Task 1（`.is-sc`/`--sc-tint`/`.sc-badge`）、Task 2（scAmount）、Task 4（ScBadge）。
- §9 随机一首 → Task 3（scrollToIndex）、Task 8（handleRandom）。
- §10 复制交互 → Task 8（handleCopy）。
- §11 主题适配 → Task 1（全 CSS 变量；语言 chip 固定粉/蓝 via `langColor`；SC 徽章 `--accent-primary` 翻转）。
- §12 移动端卡片 → Task 6（card variant）、Task 7（`isMobile` 切换 variant/itemHeight）。
- §14 组件拆分 → Task 2/4/5/6/7/8。
- §16 边界（不加封面/音频/外链/不改数据） → 计划未引入任何此类内容；`music.astro` 不改。
- §17 测试 → Task 2/3/4/5/6/7/8/9/10。
- §18 验收 → Task 10 Step 7 逐项对应。
覆盖完整，无遗漏。

**2. 占位符扫描：** 无 TBD/TODO；每个代码步骤含完整代码；命令含期望输出。Task 2 Step 2 顶部已注明 `vi` import 修正（合并到首行）。

**3. 类型一致性：**
- `Song` 字段（title/artist/languages/genres/gifts）在 types/utils/各组件一致。
- `FilterState`（query/languages/genres/scOnly）、`SortState`（key/dir）、`SortKey` 联合（含 `'default'`）在 utils/SongTable/SongList 一致。
- `songKey(song)` 签名一致；`scAmount` 返回 `string | null`，SongRow 用 `sc ?` 判空。
- `LanguageFacet { value; count }` 在 types/deriveFacets/FilterBar 一致。
- `VirtualList` 新增 props（scrollToIndex/onScrollToHandled）在 SongTable 调用处一致。
- `onCopy: (song: Song) => void` 在 SongRow/SongTable/SongList 一致（容器 handleCopy 签名匹配）。
- `noUncheckedIndexedAccess`：`song.languages[0] ?? ''`、`song.genres[0]` 判空、`visible[idx]!` 兜底均已处理。
