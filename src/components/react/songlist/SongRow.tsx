import type { Song } from './types';
import { scAmount, langColor, highlightSegments } from './utils';
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
  const classNames = [
    'song-row',
    variant === 'row' ? 'song-row-grid' : 'song-card',
    sc ? 'is-sc' : '',
    copied ? 'is-copied' : '',
  ].filter(Boolean).join(' ');
  const langClass = `sl-chip is-${langColor(lang)}`;

  const handle = () => onCopy(song);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handle();
    }
  };

  if (variant === 'card') {
    return (
      <div
        className={classNames}
        data-testid="song-row"
        onClick={handle}
        onKeyDown={handleKeyDown}
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
            {song.genres.map((g) => (
              <span key={g} className="genre-tag">{g}</span>
            ))}
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
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`点歌 ${song.title}`}
    >
      <span className={lang ? langClass : ''}>{lang}</span>
      <span className="col-title"><Highlight text={song.title} query={query} /></span>
      <span className="col-artist"><Highlight text={song.artist} query={query} /></span>
      <span className="col-genres">
        {song.genres.map((g) => (
          <span key={g} className="genre-tag">{g}</span>
        ))}
      </span>
      <span>{sc && <ScBadge amount={sc} />}</span>
    </div>
  );
}
