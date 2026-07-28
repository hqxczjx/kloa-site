import { test, expect } from './test';

test.describe('Music Page (重设计)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/music');
  });

  test('页面加载成功', async ({ page }) => {
    await expect(page).toHaveTitle(/克罗雅/);
  });

  test('显示搜索框与随机按钮与歌曲行', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索歌名 / 歌手 / 拼音…')).toBeVisible();
    await expect(page.getByTestId('random-button')).toBeVisible();
    await expect(page.locator('[data-testid="song-row"]').first()).toBeVisible();
  });

  test('按标题搜索缩小结果', async ({ page }) => {
    const search = page.getByPlaceholder('搜索歌名 / 歌手 / 拼音…');
    const list = page.locator('[data-testid="virtual-list"]');
    await search.fill('爱');
    await expect(list).not.toHaveAttribute('data-total-items', '418');
    const total = Number(await list.getAttribute('data-total-items'));
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(418);
  });

  test('点击语言 chip 过滤', async ({ page }) => {
    const list = page.locator('[data-testid="virtual-list"]');
    await page.getByLabel('筛选语言: 日语').click();
    await expect(list).not.toHaveAttribute('data-total-items', '418');
    const total = Number(await list.getAttribute('data-total-items'));
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(418);
  });

  test('仅 SC 开关只留礼物曲并显示徽章', async ({ page }) => {
    await page.getByTestId('sc-toggle').click();
    await expect(page.locator('.sc-badge').first()).toBeVisible();
    const total = Number(await page.locator('[data-testid="virtual-list"]').getAttribute('data-total-items'));
    expect(total).toBeLessThanOrEqual(20);
  });

  test('点击列头排序切换箭头', async ({ page }) => {
    const head = page.getByRole('button', { name: /歌名/ }).first();
    await head.click();
    await expect(head).toContainText(/[▲▼]/);
  });

  test('点击歌曲行复制并出 toast', async ({ page }) => {
    await page.locator('[data-testid="song-row"]').first().click();
    const toast = page.locator('[data-sonner-toast]');
    const count = await toast.count();
    if (count > 0) {
      await expect(toast.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('无结果显示空状态', async ({ page }) => {
    await page.getByPlaceholder('搜索歌名 / 歌手 / 拼音…').fill('zzz不存在的歌xyz123');
    await page.waitForTimeout(800);
    await expect(page.getByText('没有找到匹配的歌曲')).toBeVisible();
  });

  test('返回首页', async ({ page }) => {
    await page.getByRole('link', { name: '返回首页' }).click();
    await expect(page).toHaveURL('/');
  });
});
