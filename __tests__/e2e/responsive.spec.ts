import { test, expect } from './test';

test.describe('Responsive Design', () => {
  test.describe('Desktop Viewport (1280x720)', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should render desktop layout correctly', async ({ page }) => {
      await page.goto('/');

      const desktopNav = page.locator('nav').filter({ has: page.getByRole('link', { name: '首页' }) });
      await expect(desktopNav).toBeVisible();
      await expect(page.getByRole('link', { name: '首页', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '歌单', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '关于', exact: true })).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
      // 移动端底部导航在桌面隐藏
      await expect(page.locator('nav.fixed.bottom-0')).not.toBeVisible();
    });
  });

  test.describe('Tablet Viewport (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should render tablet layout correctly', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('link', { name: '首页' })).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  });

  test.describe('Mobile Viewport (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should render mobile layout correctly', async ({ page }) => {
      await page.goto('/');

      // 移动端底部导航可见
      await expect(page.locator('nav.fixed.bottom-0')).toBeVisible();
      // 导航图标可见
      await expect(page.getByRole('link', { name: '首页', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '歌单', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: '关于', exact: true })).toBeVisible();
      // 桌面导航在移动端隐藏
      await expect(page.locator('nav.hidden.md\\:flex')).not.toBeVisible();
      // 页脚在移动端隐藏
      await expect(page.locator('footer')).not.toBeVisible();
      // 主题切换按钮可见，且位于右上角
      const themeToggle = page.locator('[data-testid="mobile-theme-toggle"] button').first();
      await expect(themeToggle).toBeVisible();
      const box = await themeToggle.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.x).toBeGreaterThan(280); // Adjusted threshold for mobile viewport
        expect(box.y).toBeLessThan(50); // Should be near the top
      }
    });
  });

  test.describe('Music Page on Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should render music page elements', async ({ page }) => {
      await page.goto('/music', { waitUntil: 'domcontentloaded' });

      await expect(page.getByPlaceholder('搜索歌名 / 歌手 / 拼音…')).toBeVisible();
      await expect(page.getByTestId('filter-bar')).toBeVisible();
      await expect(page.getByLabel('筛选语言: 国语')).toBeVisible();
      const songItems = page.locator('[data-testid="virtual-list"]').locator('[data-testid="song-row"]');
      await expect(songItems.first()).toBeVisible();
    });

    test('should scroll through song list', async ({ page }) => {
      await page.goto('/music', { waitUntil: 'domcontentloaded' });

      const listContainer = page.locator('[data-testid="virtual-list"]');
      await expect(listContainer).toBeVisible();
      await expect(page.locator('[data-testid="song-row"]').first()).toBeVisible();
      // 容器为固定内联高度，等内容渲染即可（clientHeight > 0）
      await expect.poll(
        async () => await listContainer.evaluate((el: any) => el.clientHeight)
      ).toBeGreaterThan(0);

      // 固定内联高度，等内容渲染即可：确保内容溢出、可滚动
      await expect.poll(
        async () => await listContainer.evaluate((el) => el.scrollHeight - el.clientHeight)
      ).toBeGreaterThan(0);

      // 真实滚动（hover + wheel 触发原生 scroll → React onScroll）；
      // 程序化设 scrollTop 不触发合成事件，且在未定型容器上会被钳为 0
      await listContainer.hover();
      await page.mouse.wheel(0, 500);
      await expect.poll(
        async () => await listContainer.evaluate((el) => el.scrollTop)
      ).toBeGreaterThan(0);
    });
  });

  test.describe('About Page on Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should render about page and be scrollable', async ({ page }) => {
      await page.goto('/about');

      await expect(page.getByText('关于本站')).toBeVisible();
      await expect(page.getByRole('heading', { name: '本站声明' }).first()).toBeVisible();

      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      expect(bodyHeight).toBeGreaterThan(viewportHeight);
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle landscape and portrait orientation', async ({ page }) => {
      // 横屏
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/');
      await expect(page.locator('main')).toBeVisible();

      // 切到竖屏，同一页面重排后 main 仍应可见
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Touch Interactions', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

    test('should handle tap on navigation links', async ({ page }) => {
      await page.goto('/');

      const musicLink = page.getByRole('link', { name: '歌单', exact: true });
      await expect(musicLink).toBeVisible();
      await musicLink.tap();

      await expect(page).toHaveURL(/\/music/);
    });

    test('should handle tap on theme toggle', async ({ page }) => {
      await page.goto('/');

      const themeToggle = page.locator('[data-testid="mobile-theme-toggle"] button').first();
      await expect(themeToggle).toBeVisible();
      await themeToggle.tap();

      await expect(page.locator('html')).toHaveClass(/dark/);
    });
  });

  // 默认视口（chromium project 的 Desktop Chrome 1280x720，桌面导航可见）：
  // 点导航链接软导航回首页，断言首页专属内容可见，证明 ClientRouter swap 落定
  test('should soft-navigate back to home (swap landed)', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('link', { name: '首页', exact: true }).first().click();

    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('克罗雅');
  });
});
