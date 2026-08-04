import { test, expect } from './test';

test.describe('AI 绘图页', () => {
  test('选风格生成展示结果', async ({ page }) => {
    await page.route('**/api/image', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://cdn/r.png' }),
      })
    );

    await page.goto('/ai/image/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '水彩手绘' }).click();
    await page.getByRole('button', { name: /生成/ }).click();

    await expect(page.getByRole('img', { name: /生成结果/ })).toHaveAttribute('src', 'https://cdn/r.png');
  });

  test('错误时提示', async ({ page }) => {
    await page.route('**/api/image', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI 服务繁忙，请稍后重试' }),
      })
    );

    await page.goto('/ai/image/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '水彩手绘' }).click();
    await page.getByRole('button', { name: /生成/ }).click();

    await expect(page.getByText('繁忙')).toBeVisible();
  });
});
