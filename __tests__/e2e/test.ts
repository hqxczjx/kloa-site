import { test as base, expect } from '@playwright/test';

/**
 * 公共 chromium 启动参数：playwright.config.ts（顶层 use + chromium project）与
 * 需要追加专属标志的 spec（如 player-persistence 的 autoplay 放开）共用同一份，
 * 避免 --disable* 标志多处复制后漂移。追加时展开拼数组：
 * `[...CHROMIUM_LAUNCH_ARGS, '--autoplay-policy=no-user-gesture-required']`。
 */
export const CHROMIUM_LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-sandbox',
  '--disable-setuid-sandbox',
] as const;

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

/**
 * 等待所有 astro island 完成水合。networkidle 只代表网络静默，React island 的
 * JS 可能尚未执行：水合前 fill 的值会被初始 state 重置吞掉（DOM 有值但 state 空，
 * 受控按钮保持 disabled），表现为随机的 toBeEnabled 超时。astro-island 水合
 * 完成后会移除 ssr 属性，以此为准。
 */
export async function waitForHydration(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const islands = document.querySelectorAll('astro-island');
    return islands.length > 0 && [...islands].every((el) => !el.hasAttribute('ssr'));
  });
}

export { expect };
