import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, X } from 'lucide-react';

interface Song {
  title: string;
  artist: string;
  date: string;
  url: string;
  tags: string[];
}

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isMuted: boolean;
  progress: number;
  duration: number;
}

const initialPlayerState: PlayerState = {
  currentSong: null,
  isPlaying: false,
  isMuted: false,
  progress: 0,
  duration: 0,
};

export default function PersistentPlayer() {
  const [playerState, setPlayerState] = useState<PlayerState>(initialPlayerState);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Listen for custom playSong event from SongList
  useEffect(() => {
    const handlePlaySong = (e: Event) => {
      const song = (e as CustomEvent).detail as Song;
      setPlayerState(prev => ({
        ...prev,
        currentSong: song,
        isPlaying: true,
        progress: 0,
        duration: 0,
      }));
    };

    window.addEventListener('playSong', handlePlaySong);
    return () => {
      window.removeEventListener('playSong', handlePlaySong);
    };
  }, []);

  const { currentSong, isPlaying, isMuted, progress, duration } = playerState;

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.url;
      audioRef.current.play().catch(console.error);
    }
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = isMuted;
  }, [isMuted]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setPlayerState(prev => ({ ...prev, progress: audio.currentTime || 0 }));
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      setPlayerState(prev => ({ ...prev, duration: audio.duration || 0 }));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setPlayerState(prev => ({ ...prev, progress: newTime }));
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSkipBack = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, progress - 10);
    }
  };

  const handleSkipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, progress + 10);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t backdrop-blur-md transition-all duration-300">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlayerState(initialPlayerState)}
      />

      {/* Song Info */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, oklch(0.78 0.10 15), oklch(0.72 0.12 15))' }}>
            <Play className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {currentSong.title}
            </p>
            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
              {currentSong.artist}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPlayerState(initialPlayerState);
          }}
          className="p-2 rounded-full transition-all duration-300 hover:scale-110"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Skip Back */}
        <button
          onClick={handleSkipBack}
          className="p-2 rounded-full transition-all duration-300 hover:scale-110"
          style={{ color: 'var(--text-secondary)' }}
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, oklch(0.78 0.10 15), oklch(0.72 0.12 15))',
            boxShadow: '0 4px 12px oklch(0.72 0.12 15 / 0.3)',
          }}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>

        {/* Skip Forward */}
        <button
          onClick={handleSkipForward}
          className="p-2 rounded-full transition-all duration-300 hover:scale-110"
          style={{ color: 'var(--text-secondary)' }}
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Time Display */}
        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {formatTime(progress)} / {formatTime(duration)}
        </div>

        {/* Mute Toggle */}
        <button
          onClick={() => setPlayerState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
          className="p-2 rounded-full transition-all duration-300 hover:scale-110"
          style={{ color: isMuted ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-3">
        <div
          className="relative h-1 rounded-full cursor-pointer transition-all duration-300"
          style={{
            background: 'var(--glass-border)',
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const newProgress = (x / rect.width) * duration;
            setPlayerState(prev => ({ ...prev, progress: newProgress }));
            if (audioRef.current) {
              audioRef.current.currentTime = newProgress;
            }
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, oklch(0.78 0.10 15), oklch(0.72 0.08 240))',
            }}
          />
          <input
            type="range"
            min="0"
            max={duration}
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
