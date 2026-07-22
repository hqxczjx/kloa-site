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
