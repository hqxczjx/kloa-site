import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Setup before each test
beforeEach(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock as unknown as Storage,
    writable: true,
    configurable: true,
  });

  // Mock navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(() => Promise.resolve()),
    },
    writable: true,
    configurable: true,
  });

  // Mock window.scrollTo
  window.scrollTo = vi.fn();

  // Mock HTMLMediaElement (audio/video)
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = vi.fn();
});
