import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    testTimeout: 20000,
    setupFiles: ['./__tests__/unit/setup.ts'],
    include: ['**/__tests__/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules/',
      '__tests__/e2e',
      'dist/',
      '.astro/',
      '*.config.*',
      'public/',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__',
        'dist/',
        '.astro/',
        '*.config.*',
        'public/',
      ],
      // 门槛略低于当前实际覆盖率,留余量避免小幅波动导致 PR 失败;
      // 当前实际:statements 84 / branches 78.5 / functions 80 / lines 87
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 75,
        lines: 85,
      },
    },
  },
});
