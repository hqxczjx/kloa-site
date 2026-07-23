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

      {showMore && moreGenres.map((g) => {
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
        <button
          type="button"
          className="sl-more"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? '收起流派' : `+${moreGenres.length} 更多流派`}
        </button>
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
