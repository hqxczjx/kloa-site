import { useState, useRef, useCallback } from 'react';
import { Shuffle, Heart, Moon, Sun, Ghost, Volume2 } from 'lucide-react';
import { voices, type VoiceClip } from '../../data/voices';

const iconMap: Record<string, any> = {
  Heart,
  Moon,
  Sun,
  Ghost,
  Volume2,
};

interface VoicePadProps {
  voice: VoiceClip;
  isActive: boolean;
  onPlay: () => void;
}

function VoicePad({ voice, isActive, onPlay }: VoicePadProps) {
  const Icon = iconMap[voice.icon || 'Volume2'];

  const getPadStyle = () => {
    switch (voice.category) {
      case 'angel':
        return 'bg-pink-50/50 hover:bg-pink-100 border-pink-200 text-pink-700 dark:bg-pink-950/40 dark:hover:bg-pink-900/50 dark:border-pink-500/30 dark:text-pink-200';
      case 'demon':
        return 'bg-blue-900/40 hover:bg-blue-800 border-blue-500/30 text-blue-100';
      default:
        return '';
    }
  };

  return (
    <button
      onClick={onPlay}
      className={`
        VoicePad relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl
        transition-all duration-200 hover:scale-105 active:scale-95 border-2
        ${getPadStyle()}
        ${isActive ? 'ring-2 ring-offset-2 ring-pink-500 dark:ring-blue-500' : ''}
      `}
      aria-label={`播放 ${voice.label}`}
    >
      <Icon className="w-10 h-10" />
      <span className="text-base font-semibold">{voice.label}</span>
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-blue-500/20 rounded-2xl pointer-events-none animate-pulse" />
      )}
    </button>
  );
}

export default function Soundboard() {
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'angel' | 'demon'>('all');
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const filteredVoices = voices.filter(voice =>
    selectedCategory === 'all' || voice.category === selectedCategory
  );

  const playVoice = useCallback((voice: VoiceClip) => {
    let audio = audioRefs.current.get(voice.id);

    if (!audio) {
      audio = new Audio(voice.src);
      audioRefs.current.set(voice.id, audio);

      audio.addEventListener('ended', () => {
        if (activeVoiceId === voice.id) {
          setActiveVoiceId(null);
        }
      });
    }

    if (activeVoiceId && activeVoiceId !== voice.id) {
      const currentAudio = audioRefs.current.get(activeVoiceId);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    audio.currentTime = 0;
    void audio.play();

    setActiveVoiceId(voice.id);
  }, [activeVoiceId]);

  const playRandom = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * voices.length);
    const randomVoice = voices[randomIndex];
    if (randomVoice) {
      playVoice(randomVoice);
    }
  }, [playVoice]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
        克罗雅Button
      </h1>

      <div className="glass rounded-2xl p-6 mb-8">
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {[
            { value: 'all', label: '全部', icon: Volume2 },
            { value: 'angel', label: '天使', icon: Heart },
            { value: 'demon', label: '恶魔', icon: Ghost },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedCategory(value as any)}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300
                ${selectedCategory === value
                  ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow-lg'
                  : ''
                }
              `}
              style={selectedCategory !== value ? {
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
              } : {}}
              aria-label={`筛选 ${label} 类别`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={playRandom}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 shadow-lg"
            aria-label="随机播放"
          >
            <Shuffle className="w-5 h-5" />
            随机播放
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredVoices.map(voice => (
          <VoicePad
            key={voice.id}
            voice={voice}
            isActive={activeVoiceId === voice.id}
            onPlay={() => playVoice(voice)}
          />
        ))}
      </div>

      {filteredVoices.length === 0 && (
        <div className="text-center py-16">
          <Volume2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            该类别暂无语音
          </p>
        </div>
      )}
    </div>
  );
}
