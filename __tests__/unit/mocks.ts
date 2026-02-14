import { vi } from 'vitest';

// Mock toast function
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

// Mock pinyin function
export const mockPinyin = vi.fn((text: string, options?: any) => {
  if (!text) return '';
  // Simple mock: return text with some pinyin-like transformation
  // For testing purposes, we'll just return lowercase text
  return text.toLowerCase();
});

// Mock custom event
export const mockDispatchEvent = vi.fn();

// Helper to create mock song
export const createMockSong = (overrides = {}) => ({
  title: 'Test Song',
  artist: 'Test Artist',
  date: '2024-01-15',
  tags: ['中文', '测试'],
  ...overrides,
});

// Helper to create mock songs array
export const createMockSongs = (count: number = 10) => {
  return Array.from({ length: count }, (_, i) => ({
    title: `Song ${i + 1}`,
    artist: `Artist ${i + 1}`,
    date: '2024-01-15',
    tags: ['中文', `Tag${i + 1}`],
  }));
};
