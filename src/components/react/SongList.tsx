import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import type { Song, FilterState, SortState, SortKey } from './songlist/types';
import { filterSongs, sortSongs, deriveFacets, songKey } from './songlist/utils';
import FilterBar from './songlist/FilterBar';
import SongTable from './songlist/SongTable';
import { SONGS } from '../../data/generated/songs-data';

const EMPTY_FILTER: FilterState = { query: '', languages: [], genres: [], scOnly: false };

// P0-1：歌曲数据直接 import 生成模块（构建期注入拼音），不再经 astro-island props
// 序列化进 HTML——数据随本组件的 JS chunk 在 client:visible 水合时按需拉取
export default function SongList() {
  const songs = SONGS;
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortState>({ key: 'default', dir: 'asc' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const facets = useMemo(() => deriveFacets(songs), [songs]);
  const visible = useMemo(() => sortSongs(filterSongs(songs, filter), sort), [songs, filter, sort]);

  const handleCopy = useCallback(async (song: Song) => {
    const key = songKey(song);
    setCopiedId(key);
    window.setTimeout(() => setCopiedId((cur) => (cur === key ? null : cur)), 300);
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
    void handleCopy(visible[idx]!);
  }, [visible, handleCopy]);

  // 三态：不同列→升序；同列升序→降序；同列降序→回到默认（原始顺序）
  const handleSortChange = useCallback((key: SortKey) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: 'default', dir: 'asc' };
    });
  }, []);

  const toggle = (key: 'languages' | 'genres') => (value: string) =>
    setFilter((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
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

      <div className="sticky top-20 z-30 mb-4">
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
      />
    </div>
  );
}
