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
      // json-summary 供 CI 的 vitest-coverage-report-action 读摘要
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__',
        'dist/',
        '.astro/',
        '*.config.*',
        'public/',
      ],
      // 补全 VideoStudio / ChatStudio / PersistentPlayer 交互测试后覆盖率显著提升；
      // 当前实际：statements 95 / branches 86.7 / functions 96.8 / lines 96.8
      // 门槛留约 4% 余量，避免小幅波动导致 PR 失败
      thresholds: {
        statements: 91,
        branches: 82,
        functions: 93,
        lines: 94,
      },
    },
  },
});
