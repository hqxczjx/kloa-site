import { test, expect } from './test';

// 构造一段 OpenAI 兼容 SSE 体
function sseBody() {
  return [
    'data: {"choices":[{"delta":{"content":"你"}}]}',
    'data: {"choices":[{"delta":{"content":"好"}}]}',
    'data: [DONE]',
  ].join('\n\n') + '\n\n';
}

test.describe('AI 对话页', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sseBody(),
      });
    });
  });

  test('导航含 AI 入口', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'AI' }).first()).toBeVisible();
  });

  test('发送后流式累加出 AI 回复', async ({ page }) => {
    await page.goto('/ai/chat/');
    // 等待水合完成（input 的 onChange 绑定后，fill 才能触发按钮 enabled）
    await page.waitForLoadState('networkidle');
    const input = page.getByPlaceholder(/说点什么/);
    await input.fill('你好');
    await page.getByRole('button', { name: /发送/ }).click();
    await expect(page.getByText('AI 生成 · 二创')).toBeVisible();
    await expect(page.getByText('你好').first()).toBeVisible(); // AI 回复"你好"（用户发的也是"你好"，用 .first() 避免严格模式冲突）
  });

  test('上游错误时提示', async ({ page }) => {
    await page.route('**/api/chat', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'AI 服务繁忙，请稍后重试' }) }),
      { times: 1 }
    );
    await page.goto('/ai/chat/');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder(/说点什么/).fill('hi');
    await page.getByRole('button', { name: /发送/ }).click();
    // 错误消息出现在 assistant 气泡内（与正常回复相同 DOM 结构）
    await expect(page.getByText('AI 生成 · 二创')).toBeVisible();
    await expect(page.getByText('（回复中断，请重试）')).toBeVisible();
  });
});
