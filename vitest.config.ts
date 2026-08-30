import { defineConfig } from 'vitest/config';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// 官方 preset 默认只对 client consumer 环境生效（applyToEnvironmentHook），而 vitest
// 跑测试用的是 ssr consumer——放开环境限制后测试代码才会真正经过 compiler（已用
// memo_cache_sentinel 探针在 vitest 运行内验证：SongList/PersistentPlayer 均编译）。
const rcPreset = reactCompilerPreset();
rcPreset.rolldown.applyToEnvironmentHook = () => true;

export default defineConfig({
  // 与 astro.config.mjs 保持同一 React Compiler 配置（P1-2）。vitest 用的是项目自己的
  // @vitejs/plugin-react 6 实例（rolldown 版，已无 babel 选项；@astrojs/react 内置的
  // 是 5.2 仍走 babel）——6.x 官方挂法是 @rolldown/plugin-babel + reactCompilerPreset，
  // 让单测直接跑 compiler 编译后的代码，行为验证覆盖自动 memo 产物。
  plugins: [
    react(),
    babel({ presets: [rcPreset] }),
  ],
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
