import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import PersistentPlayer from '../../../src/components/react/PersistentPlayer';

describe('PersistentPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should not render when no song is loaded', () => {
      render(<PersistentPlayer />);
      expect(screen.queryByText(/song/i)).not.toBeInTheDocument();
    });
  });

  describe('Song Loading', () => {
    it('should render when a song is loaded via custom event', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://example.com/song.mp3',
        tags: ['国语'],
      };

      await act(async () => {
        const event = new CustomEvent('playSong', { detail: mockSong });
        await act(async () => {
        window.dispatchEvent(event);
      });
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });
  });

  describe('Additional Coverage Tests', () => {
    it('should handle song with empty URL', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: '',
        tags: ['国语'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    it('should handle song with invalid URL', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'not-a-valid-url',
        tags: ['国语'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    it('should handle multiple song loads', async () => {
      render(<PersistentPlayer />);

      const mockSong1 = {
        title: 'Test Song 1',
        artist: 'Test Artist',
        url: 'https://example.com/song1.mp3',
        tags: ['国语'],
      };

      await act(async () => {
        const event1 = new CustomEvent('playSong', { detail: mockSong1 });
        window.dispatchEvent(event1);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const mockSong2 = {
        title: 'Test Song 2',
        artist: 'Test Artist',
        url: 'https://example.com/song2.mp3',
        tags: ['国语'],
      };

      await act(async () => {
        const event2 = new CustomEvent('playSong', { detail: mockSong2 });
        window.dispatchEvent(event2);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
    });

    it('should handle song with very long title', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'A'.repeat(100),
        artist: 'Test Artist',

        url: 'https://example.com/song.mp3',
        tags: ['国语'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });

    it('should handle song with special characters in title', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: '测试!@#$%^&*()',
        artist: 'Test Artist',

        url: 'https://example.com/song.mp3',
        tags: ['国语'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('测试!@#$%^&*()')).toBeInTheDocument();
    });

    it('should handle song with empty artist', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: '',

        url: 'https://example.com/song.mp3',
        tags: ['国语'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    it('should handle song with very long artist name', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: 'A'.repeat(50),

        url: 'https://example.com/song.mp3',
        tags: ['国语'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(screen.getByText('A'.repeat(50))).toBeInTheDocument();
    }, 30000);

    it('should handle song with special characters in artist', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: '测试&*()$#@!',

        url: 'https://example.com/song.mp3',
        tags: ['国语'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('测试&*()$#@!')).toBeInTheDocument();
    });

    it('should handle song with empty tags', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: 'Test Artist',

        url: 'https://example.com/song.mp3',
        tags: [],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    it('should handle song with many tags', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: 'Test Artist',

        url: 'https://example.com/song.mp3',
        tags: ['国语', '日语', '英语', '粤语', '治愈', '空灵', '东方', '经典'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });

    it('should handle rapid song changes', async () => {
      render(<PersistentPlayer />);

      const mockSong1 = {
        title: 'Test Song 1',
        artist: 'Test Artist',

        url: 'https://example.com/song1.mp3',
        tags: ['国语'],
      };

      const mockSong2 = {
        title: 'Test Song 2',
        artist: 'Test Artist',

        url: 'https://example.com/song2.mp3',
        tags: ['国语'],
      };

      await act(async () => {
        const event1 = new CustomEvent('playSong', { detail: mockSong1 });
        window.dispatchEvent(event1);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      await act(async () => {
        const event2 = new CustomEvent('playSong', { detail: mockSong2 });
        window.dispatchEvent(event2);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    const SONG = { title: '互动歌', artist: '互动人', url: 'https://example.com/song.mp3', tags: ['国语'] };

    async function load() {
      await act(async () => {
        window.dispatchEvent(new CustomEvent('playSong', { detail: SONG }));
      });
    }

    // 按钮无 aria-label，借 lucide icon class（lucide-pause / lucide-x …）回溯到所在 button
    function iconBtn(container: HTMLElement, iconClass: string) {
      return container.querySelector(`.${iconClass}`)?.closest('button') as HTMLButtonElement;
    }

    // happy-dom 的 audio.currentTime/duration 默认 0 且只读，需 defineProperty 覆盖
    function setMedia(audio: HTMLAudioElement, props: { currentTime?: number; duration?: number }) {
      if (props.duration !== undefined) {
        Object.defineProperty(audio, 'duration', { value: props.duration, configurable: true, writable: true });
      }
      if (props.currentTime !== undefined) {
        Object.defineProperty(audio, 'currentTime', { value: props.currentTime, configurable: true, writable: true });
      }
    }

    it('点击主按钮切换播放/暂停，触发 audio.pause（L170 / L63-66）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      expect(audio.play).toHaveBeenCalled();
      // isPlaying=true → 主按钮为 Pause，点击切到暂停
      await act(async () => { fireEvent.click(iconBtn(container, 'lucide-pause')); });
      expect(audio.pause).toHaveBeenCalled();
    });

    it('点击静音按钮设置 audio.muted（L200 / L74）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      await act(async () => { fireEvent.click(iconBtn(container, 'lucide-volume-2')); });
      expect(audio.muted).toBe(true);
      expect(container.querySelector('.lucide-volume-x')).toBeInTheDocument();
    });

    it('后退 10s（L99-101）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      setMedia(audio, { currentTime: 30, duration: 100 });
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });
      await act(async () => { audio.dispatchEvent(new Event('timeupdate')); });
      await act(async () => { fireEvent.click(iconBtn(container, 'lucide-skip-back')); });
      expect(audio.currentTime).toBe(20); // max(0, 30-10)
    });

    it('前进 10s（L105-107）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      setMedia(audio, { currentTime: 30, duration: 100 });
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });
      await act(async () => { audio.dispatchEvent(new Event('timeupdate')); });
      await act(async () => { fireEvent.click(iconBtn(container, 'lucide-skip-forward')); });
      expect(audio.currentTime).toBe(40); // min(100, 30+10)
    });

    it('拖动 seek 进度（L91-95）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      const range = container.querySelector('input[type="range"]') as HTMLInputElement;
      await act(async () => { fireEvent.change(range, { target: { value: '30' } }); });
      expect(audio.currentTime).toBe(30);
    });

    it('点击进度条跳转（L219-225）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      setMedia(audio, { duration: 100 });
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });
      const bar = container.querySelector('.relative.h-1') as HTMLElement;
      vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({
        left: 0, width: 100, right: 100, top: 0, bottom: 0, height: 1, x: 0, y: 0, toJSON: () => ({}),
      } as DOMRect);
      await act(async () => { fireEvent.click(bar, { clientX: 50 }); });
      expect(audio.currentTime).toBe(50); // (50/100)*100
    });

    it('关闭按钮清空当前歌曲（L146-148）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      expect(screen.getByText('互动歌')).toBeInTheDocument();
      await act(async () => { fireEvent.click(iconBtn(container, 'lucide-x')); });
      expect(screen.queryByText('互动歌')).not.toBeInTheDocument();
    });

    it('播放结束 onEnded 清空（L127）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      await act(async () => { audio.dispatchEvent(new Event('ended')); });
      expect(screen.queryByText('互动歌')).not.toBeInTheDocument();
    });

    it('timeUpdate 更新进度显示（L77-80）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      setMedia(audio, { currentTime: 25 });
      await act(async () => { audio.dispatchEvent(new Event('timeupdate')); });
      expect(screen.getByText(/0:25/)).toBeInTheDocument();
    });

    it('loadedMetadata 更新时长显示（L84-87）', async () => {
      const { container } = render(<PersistentPlayer />);
      await load();
      const audio = container.querySelector('audio') as HTMLAudioElement;
      setMedia(audio, { duration: 120 });
      await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });
      expect(screen.getByText(/2:00/)).toBeInTheDocument();
    });
  });
});
