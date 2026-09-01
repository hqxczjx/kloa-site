import { defineConfig, devices } from '@playwright/test';
import { CHROMIUM_LAUNCH_ARGS } from './__tests__/e2e/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    launchOptions: {
      args: [...CHROMIUM_LAUNCH_ARGS, '--disable-extensions', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [...CHROMIUM_LAUNCH_ARGS],
        },
      },
    },
  ],
  webServer: {
    // 用 astro build + preview（生产静态产物）而非 dev：避免 vite 逐页编译导致的
    // 加载超时/flaky，e2e 更快更稳；preview 也不触发 astro 的 AI-agent 后台 daemon。
    // 直接 astro build 跳过 astro check（类型检查由 test.yml 负责），省 ~5s。
    // 先生成 songs-data.ts（gitignored，SongList 直接 import 它）。
    command:
      'node scripts/generate-song-data.mjs && PUBLIC_ASTRO_DEV_TOOLBAR_DISABLED=true bunx astro build && bun run preview',
    url: 'http://localhost:4321',
    timeout: 120000,
  },
});
