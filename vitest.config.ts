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
      // 2026-08 测试审计后（删 87 个零价值用例、补 26 个高价值用例）：
      // 当前实际：statements 96.57 / branches 90.51 / functions 98.68 / lines 98.75
      // 门槛留 1.5-2.5% 余量防回退（新文件不写测试即红），小幅波动不受影响
      thresholds: {
        statements: 95,
        branches: 88,
        functions: 97,
        lines: 98,
      },
    },
  },
});
