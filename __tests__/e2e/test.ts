import { test as base, expect } from '@playwright/test';

/**
 * 共享 test fixture：所有 e2e 用例通过 `import { test, expect } from './test'` 使用。
 *
 * 拦截外部字体 CDN（fonts.loli.net）：该字体在 CI 或部分本地环境加载慢甚至不可达，
 * 会阻塞 page.goto 的 'load' 事件，直到 navigationTimeout 超时——表现为随机的
 * “page.goto: Timeout” flaky。abort 后浏览器立即收到失败响应，load 正常触发，
 * e2e 不再依赖字体加载（用例本就不校验字体外观，只校验 DOM/交互）。
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://fonts.loli.net/**', (route) => route.abort());
    await use(page);
  },
});

export { expect };
