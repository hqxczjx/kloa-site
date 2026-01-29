import { useState, useMemo } from 'react';
import { Search, Copy, Music } from 'lucide-react';
import { pinyin } from 'pinyin-pro';
import { toast } from 'sonner';

interface Song {
  title: string;
  artist: string;
  date: string;
  url: string;
  tags: string[];
}

interface SongListProps {
  songs: Song[];
}

export default function SongList({ songs }: SongListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedSongId, setCopiedSongId] = useState<string | null>(null);

  // Get all unique tags with language tags first
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    songs.forEach(song => {
      song.tags.forEach(tag => tagSet.add(tag));
    });

    const tags = Array.from(tagSet);
    const languageTags = ['中文', '日语', '英语', '韩语'];

    // Separate language tags and other tags
    const langTags = tags.filter(tag => languageTags.includes(tag));
    const otherTags = tags.filter(tag => !languageTags.includes(tag));

    // Sort language tags by predefined order
    const sortedLangTags = langTags.sort((a, b) => {
      return languageTags.indexOf(a) - languageTags.indexOf(b);
    });

    // Sort other tags alphabetically
    const sortedOtherTags = otherTags.sort((a, b) => a.localeCompare(b, 'zh-CN'));

    return [...sortedLangTags, ...sortedOtherTags];
  }, [songs]);

  // Filter songs based on search and tag
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // Tag filter
      if (selectedTag && !song.tags.includes(selectedTag)) {
        return false;
      }

      // Search filter (Pinyin + Chinese)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleLower = song.title.toLowerCase();
        const artistLower = song.artist.toLowerCase();

        // Direct match
        if (titleLower.includes(query) || artistLower.includes(query)) {
          return true;
        }

        // Pinyin match
        const titlePinyin = pinyin(song.title, { toneType: 'none', type: 'array' }).join('').toLowerCase();
        const artistPinyin = pinyin(song.artist, { toneType: 'none', type: 'array' }).join('').toLowerCase();

        if (titlePinyin.includes(query) || artistPinyin.includes(query)) {
          return true;
        }

        return false;
      }

      return true;
    });
  }, [songs, searchQuery, selectedTag]);

  const handleCopy = async (song: Song, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Flash effect
    setCopiedSongId(song.url);
    setTimeout(() => setCopiedSongId(null), 300);

    try {
      await navigator.clipboard.writeText(song.title);

      // Themed toast message
      toast.success(`已复制: ${song.title}`, {
        description: '快去直播间点歌吧!',
        duration: 3000,
        position: 'bottom-center',
        classNames: {
          toast: 'duality-toast',
          description: 'duality-toast-description',
          icon: 'duality-toast-icon',
        },
      });
    } catch (err) {
      toast.error('复制失败，请重试');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Search Bar */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="搜索歌曲（支持拼音）..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-transparent outline-none placeholder-(--text-secondary)"
            style={{
              color: 'var(--text-primary)',
              fontSize: '1rem',
            }}
          />
        </div>
      </div>

      {/* Tag Filter */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
            selectedTag === null
              ? 'bg-linear-to-r from-pink-500 to-blue-500 text-white'
              : ''
          }`}
          style={
            selectedTag === null
              ? {}
              : {
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                }
          }
        >
          全部
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
              selectedTag === tag
                ? 'bg-linear-to-r from-pink-500 to-blue-500 text-white'
                : ''
            }`}
            style={
              selectedTag === tag
                ? {}
                : {
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                  }
            }
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Song List View */}
      <ul className="divide-y divide-gray-200/20 dark:divide-blue-900/30">
        {filteredSongs.map((song, index) => (
          <li
            key={song.url}
            onClick={(e) => handleCopy(song, e)}
            className={`
              group relative flex items-center justify-between py-4 px-4 rounded-lg transition-all duration-200 cursor-pointer
              ${copiedSongId === song.url ? 'song-item-copied' : 'song-item'}
            `}
            style={{
              animationDelay: `${index * 30}ms`,
            }}
          >
            {/* Click flash effect overlay */}
            <div className="absolute inset-0 bg-linear-to-r from-pink-500/10 to-blue-500/10 opacity-0 group-active:opacity-100 transition-opacity duration-150 pointer-events-none rounded-lg" />

            {/* Left: Song Title + Artist */}
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-base md:text-lg font-semibold truncate transition-colors duration-200 group-hover:text-pink-600 dark:group-hover:text-blue-400" style={{ color: 'var(--text-primary)' }}>
                {song.title}
              </h3>
              <p className="text-sm md:text-base truncate opacity-60" style={{ color: 'var(--text-secondary)' }}>
                {song.artist}
              </p>
            </div>

            {/* Right: Copy Button */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Tags (compact display) */}
              <div className="hidden sm:flex gap-1">
                {song.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-md text-xs font-medium"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Copy Icon Button */}
              <button
                onClick={(e) => handleCopy(song, e)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group-hover:shadow-lg"
                style={{
                  background: 'var(--bg-secondary)',
                }}
              >
                <Copy className="w-5 h-5 transition-colors duration-200 group-hover:text-pink-600 dark:group-hover:text-blue-400" style={{ color: 'var(--accent-primary)' }} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Empty State */}
      {filteredSongs.length === 0 && (
        <div className="text-center py-16">
          <Music className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            没有找到匹配的歌曲
          </p>
        </div>
      )}
    </div>
  );
}
