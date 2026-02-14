import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
        date: '2024-01-15',
        url: 'https://example.com/song.mp3',
        tags: ['中文'],
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
        date: '2024-01-15',
        url: '',
        tags: ['中文'],
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
        date: '2024-01-15',
        url: 'not-a-valid-url',
        tags: ['中文'],
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
        date: '2024-01-15',
        url: 'https://example.com/song1.mp3',
        tags: ['中文'],
      };

      await act(async () => {
        const event1 = new CustomEvent('playSong', { detail: mockSong1 });
        window.dispatchEvent(event1);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const mockSong2 = {
        title: 'Test Song 2',
        artist: 'Test Artist',
        date: '2024-01-15',
        url: 'https://example.com/song2.mp3',
        tags: ['中文'],
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
        date: '2024-01-15',
        url: 'https://example.com/song.mp3',
        tags: ['中文'],
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
        date: '2024-01-15',
        url: 'https://example.com/song.mp3',
        tags: ['中文'],
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
        date: '2024-01-15',
        url: 'https://example.com/song.mp3',
        tags: ['中文'],
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
        artist: 'A'.repeat(100),
        date: '2024-01-15',
        url: 'https://example.com/song.mp3',
        tags: ['中文'],
      };

      const event = new CustomEvent('playSong', { detail: mockSong });
      await act(async () => {
        window.dispatchEvent(event);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });

    it('should handle song with special characters in artist', async () => {
      render(<PersistentPlayer />);

      const mockSong = {
        title: 'Test Song',
        artist: '测试&*()$#@!',
        date: '2024-01-15',
        url: 'https://example.com/song.mp3',
        tags: ['中文'],
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
        date: '2024-01-15',
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
        date: '2024-01-15',
        url: 'https://example.com/song.mp3',
        tags: ['中文', '日文', '英文', '韩文', '治愈', '空灵', '东方', '经典'],
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
        date: '2024-01-15',
        url: 'https://example.com/song1.mp3',
        tags: ['中文'],
      };

      const mockSong2 = {
        title: 'Test Song 2',
        artist: 'Test Artist',
        date: '2024-01-15',
        url: 'https://example.com/song2.mp3',
        tags: ['中文'],
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
});
