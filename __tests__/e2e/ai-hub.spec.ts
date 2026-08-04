import { test, expect } from './test';

test.describe('AI 入口聚合页', () => {
  test('三张入口卡导航到对应子页', async ({ page }) => {
    await page.goto('/ai/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'AI 实验室' })).toBeVisible();
    await expect(page.getByTestId('ai-disclaimer')).toBeVisible();

    await page.getByRole('link', { name: /和克罗雅聊天/ }).click();
    await expect(page).toHaveURL(/\/ai\/chat\//);

    await page.goto('/ai/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /给克罗雅换装/ }).click();
    await expect(page).toHaveURL(/\/ai\/image\//);

    await page.goto('/ai/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /让克罗雅动起来/ }).click();
    await expect(page).toHaveURL(/\/ai\/video\//);
  });

  test('导航栏 AI 入口指向 /ai/', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'AI 实验室' }).first().click();
    await expect(page).toHaveURL(/\/ai\/$/);
  });
});
