import { test, expect, waitForHydration } from './test';

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
    // networkidle 只代表网络静默，不保证岛已水合（点风格按钮太早会丢点击）
    await waitForHydration(page);

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
    // networkidle 只代表网络静默，不保证岛已水合（点风格按钮太早会丢点击）
    await waitForHydration(page);

    await page.getByRole('button', { name: '水彩手绘' }).click();
    await page.getByRole('button', { name: /生成/ }).click();

    await expect(page.getByText('繁忙')).toBeVisible();
  });

  // 点导航/入口卡软导航进入本页（非 goto），断言页面专属元素可见，证明 swap 落定
  test('软导航进入绘图页（swap 内容落定）', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'AI 实验室', exact: true }).first().click();
    await expect(page).toHaveURL(/\/ai\/$/);
    await page.getByRole('link', { name: /给克罗雅换装/ }).click();

    await expect(page).toHaveURL(/\/ai\/image\//);
    await expect(page.getByRole('button', { name: '水彩手绘' })).toBeVisible();
  });
});
