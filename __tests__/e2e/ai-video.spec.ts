import { test, expect } from './test';

test.describe('AI 视频页', () => {
  test('选动作生成展示结果', async ({ page }) => {
    await page.route('**/api/video', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ video_id: 'v1' }),
      })
    );

    await page.route('**/api/video/status*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' }),
      })
    );

    await page.goto('/ai/video/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '微微笑' }).click();
    await page.getByRole('button', { name: /生成/ }).click();

    await expect(page.getByTestId('result-video')).toHaveAttribute('src', 'https://cdn/v.mp4');
  });

  test('创建失败提示', async ({ page }) => {
    await page.route('**/api/video', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI 服务繁忙，请稍后重试' }),
      })
    );

    await page.goto('/ai/video/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '微微笑' }).click();
    await page.getByRole('button', { name: /生成/ }).click();

    await expect(page.getByText('繁忙').first()).toBeVisible();
  });

  // 点导航/入口卡软导航进入本页（非 goto），断言页面专属元素可见，证明 swap 落定
  test('软导航进入视频页（swap 内容落定）', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'AI 实验室', exact: true }).first().click();
    await expect(page).toHaveURL(/\/ai\/$/);
    await page.getByRole('link', { name: /让克罗雅动起来/ }).click();

    await expect(page).toHaveURL(/\/ai\/video\//);
    await expect(page.getByRole('button', { name: '微微笑' })).toBeVisible();
  });
});
