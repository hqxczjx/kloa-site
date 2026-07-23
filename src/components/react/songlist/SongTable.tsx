import { useState, useEffect } from 'react';
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
  scrollToIndex?: number | null;
  onScrollToHandled?: () => void;
}

const COLUMNS: { key: SortKey; label: string; sortable: boolean }[] = [
  { key: 'language', label: '语言', sortable: true },
  { key: 'title', label: '歌名', sortable: true },
  { key: 'artist', label: '歌手', sortable: true },
  { key: 'genre', label: '流派', sortable: true },
  { key: 'default', label: 'SC', sortable: false },
];

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = () => setMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

function SortHeader({ sort, onSortChange }: { sort: SortState; onSortChange: (k: SortKey) => void }) {
  return (
    <div className="song-thead">
      {COLUMNS.map((c) => {
        const active = sort.key === c.key;
        if (!c.sortable) {
          return <span key={c.key} className="sort-col">{c.label}</span>;
        }
        const label = active
          ? `${c.label}，当前${sort.dir === 'asc' ? '升序' : '降序'}`
          : `${c.label}，点击排序`;
        return (
          <button
            key={c.key}
            type="button"
            className={`sort-col ${active ? 'is-active' : ''}`}
            aria-label={label}
            onClick={() => onSortChange(c.key)}
          >
            {c.label}
            {active && <span className="sort-arrow" aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function SongTable({
  songs, query, sort, onSortChange, onCopy, copiedId, scrollToIndex, onScrollToHandled,
}: SongTableProps) {
  const isMobile = useIsMobile();
  const variant = isMobile ? 'card' : 'row';
  const itemHeight = isMobile ? 108 : 52;

  if (songs.length === 0) {
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
    </div>
  );
}
