import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Setup before each test
beforeEach(() => {
  // Clean up document classes
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.remove('dark');
  }

  // Mock window.matchMedia
  Object.defineProperty(globalThis, 'matchMedia', {
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

  // Mock localStorage (ensure it's available)
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(globalThis, 'localStorage', {
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
  globalThis.scrollTo = vi.fn();

  // Mock HTMLMediaElement (audio/video)
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = vi.fn();

  // happy-dom 的 iframe 挂载时会真实请求 src（测试环境无网络 → 刷出大量 NetworkError/AbortError 噪音）；
  // 覆盖其内部 connectedToDocument 钩子跳过 loadPage，测试只校验 iframe 属性、不依赖实际加载。
  const iframeConnectedSym = Object.getOwnPropertySymbols(HTMLIFrameElement.prototype)
    .find((s) => s.description === 'connectedToDocument');
  if (iframeConnectedSym) {
    (HTMLIFrameElement.prototype as unknown as Record<symbol, () => void>)[iframeConnectedSym] = function () {};
  }
});
