import { test, expect } from './test';

// 独轮车弹幕页（P2-4 vanilla 化后：零自有 React 岛，交互全由内联脚本驱动）。
// 真实浏览器覆盖三件事：分类筛选、点击复制（Clipboard API + 自研 toast）、
// 投稿弹窗开合（iframe 懒加载）。对应单测：__tests__/unit/components/DanmakuBoard.test.ts。
test.describe('Danmaku Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/danmaku');
  });

  test('页面加载：标题与四档筛选按钮齐全', async ({ page }) => {
    await expect(page).toHaveTitle(/独轮车/);
    await expect(page.getByRole('heading', { name: '独轮车弹幕复制' })).toBeVisible();
    for (const label of ['全部', '应援', '整活', '纪念']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('点击「整活」只显示整活卡片，切回「全部」恢复', async ({ page }) => {
    const memeCard = page.getByRole('button', { name: '复制 今天是恶魔阵营' });
    const cheerCard = page.getByRole('button', { name: '复制 克罗雅最可爱！' });
    await expect(memeCard).toBeVisible();
    await expect(cheerCard).toBeVisible();

    await page.getByRole('button', { name: '整活' }).click();
    await expect(memeCard).toBeVisible();
    await expect(cheerCard).toBeHidden();

    await page.getByRole('button', { name: '全部' }).click();
    await expect(cheerCard).toBeVisible();
    await expect(memeCard).toBeVisible();
  });

  test('点击文案卡片复制到剪贴板并弹出自研 toast', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: '复制 克罗雅最可爱！' }).click();
    await expect(page.locator('#danmaku-toast')).toHaveText('已复制');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe('克罗雅最可爱！');
  });

  test('投稿弹窗：初始不预载问卷，打开后 iframe 懒加载并锁定滚动，Esc 关闭', async ({ page }) => {
    const dialog = page.locator('[data-contribute-dialog]');
    const trigger = page.getByRole('button', { name: '投稿' });

    // SSR 常驻但隐藏，iframe 不带 src（首开才赋值）
    await expect(dialog).toBeHidden();
    expect(await dialog.locator('iframe').getAttribute('src')).toBeNull();

    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // 锁滚动走内联样式（body 的 overflow-x 另有全局样式，计算值非纯 hidden）
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('hidden');
    await expect(dialog.locator('iframe')).toHaveAttribute(
      'src',
      'https://wj.qq.com/s2/27522632/db0v/',
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('');
  });

  // 点导航链接软导航进入本页（非 goto），断言页面专属内容可见，证明 swap 落定
  test('软导航进入独轮车页（swap 内容落定）', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '独轮车', exact: true }).first().click();

    await expect(page).toHaveURL(/\/danmaku/);
    await expect(page.getByRole('heading', { name: '独轮车弹幕复制' })).toBeVisible();
  });
});
