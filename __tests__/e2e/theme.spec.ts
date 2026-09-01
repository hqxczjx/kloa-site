import { test, expect } from './test';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Set system preference to light and clear localStorage before each test
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should display theme toggle button', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    await expect(themeToggle).toBeVisible();
  });

  test('should start in Angel mode (light) by default', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toContain('恶魔');

    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('should use system preference when no saved theme', async ({ page }) => {
    // Clear any saved theme first
    await page.evaluate(() => localStorage.clear());

    // Set system preference to dark
    await page.emulateMedia({ colorScheme: 'dark' });

    // Reload，head FOUC 脚本在 body 解析前按系统偏好落好 dark 类
    await page.reload();

    // 主题已同步完成（FOUC 脚本 + body 末尾 syncLabels 均为同步执行），
    // 等待仅为断言稳定性，无水合过程
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    await expect(themeToggle).toHaveAttribute('aria-label', '切换到天使模式');

    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should follow live system theme change when no saved theme', async ({ page }) => {
    // beforeEach 已 clear storage + light：初始天使态
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // 不重载，live 翻转系统偏好——body 脚本的 mql change 监听器跟随
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('button[aria-label*="切换"]').first()).toHaveAttribute('aria-label', '切换到天使模式');

    // 守卫：有显式保存值后 live 翻转不再覆盖（用户选择优先于系统偏好）
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.emulateMedia({ colorScheme: 'light' });
    // mql 监听器因 saved 存在直接 return——html 保持 dark，证明未被系统翻转
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should switch to Demon mode (dark) when clicked', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    await themeToggle.click();

    await expect(page.locator('html')).toHaveClass(/dark/);

    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toBe('切换到天使模式');
  });

  test('should switch back to Angel mode (light) when clicked again', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();

    // First click: Light -> Dark
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Second click: Dark -> Light
    await themeToggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toContain('恶魔');
  });

  test('should persist theme preference in localStorage', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();

    // Toggle to dark mode
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Check localStorage
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedTheme).toBe('dark');
  });

  test('should load saved theme on page reload', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();

    // Toggle to dark mode
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // 主题写入 localStorage（自动等待，替代固定 sleep）
    await expect.poll(
      async () => await page.evaluate(() => localStorage.getItem('theme'))
    ).toBe('dark');

    // Reload，head FOUC 脚本同步恢复 dark
    await page.reload();

    // FOUC 脚本 + syncLabels 同步完成，等待仅为断言稳定性
    const themeToggleAfterReload = page.locator('button[aria-label*="切换"]').first();
    await expect(themeToggleAfterReload).toHaveAttribute('aria-label', '切换到天使模式');

    // Theme should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should save light theme preference', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();

    // Toggle to dark mode first
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Toggle back to light mode
    await themeToggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Check localStorage
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedTheme).toBe('light');
  });

  test('should apply theme immediately on page load', async ({ page }) => {
    // Set theme to dark
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));

    // Navigate to a new page
    await page.goto('/music');

    // Theme should be applied immediately (no flash)
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should work on all pages', async ({ page }) => {
    const pages = ['/', '/music', '/about'];

    for (const url of pages) {
      // 每页重置 localStorage 并 reload，避免上一页 theme 残留干扰本页初始状态
      await page.goto(url);
      await page.evaluate(() => localStorage.removeItem('theme'));
      await page.reload();
      const themeToggle = page.locator('button[aria-label*="切换"]').first();
      await expect(themeToggle).toBeVisible();

      await themeToggle.click();
      await expect(page.locator('html')).toHaveClass(/dark/);

      await themeToggle.click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    }
  });

  test('should have correct visual styles in Angel mode', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    const toggleButton = themeToggle;

    // Check Angel mode styles
    const backgroundColor = await toggleButton.evaluate(el => {
      return window.getComputedStyle(el).background;
    });
    expect(backgroundColor).toContain('oklch(0.78');
  });

  test('should have correct visual styles in Demon mode', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    await themeToggle.click();

    const toggleButton = themeToggle;

    // Check Demon mode styles
    const backgroundColor = await toggleButton.evaluate(el => {
      return window.getComputedStyle(el).background;
    });
    expect(backgroundColor).toContain('oklch(0.72');
  });

  test('should be keyboard accessible', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    await themeToggle.focus();

    await page.keyboard.press('Enter');
    // html.dark 自动等待（替代固定 sleep）
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.keyboard.press('Enter');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  // 自 player-persistence 套件迁入：主题断言归 theme.spec，续播套件只管播放器
  test('ClientRouter 软导航后主题保持（astro:after-swap 重同步）', async ({ page }) => {
    // beforeEach 已 clear storage + light 系统偏好；reload 让 html 初始类与清空后的
    // storage 对齐后再起测
    await page.reload();

    const toggle = page.locator('button[data-theme-toggle]').first();
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // 软导航去 /music：swap 会用新文档的 SSR <html> 属性（恒天使态）覆盖当前，
    // BaseLayout 的 astro:after-swap 监听需恢复 dark 并同步按钮文案
    await page.getByRole('link', { name: '歌单', exact: true }).click();
    await expect(page).toHaveURL(/\/music/);
    await expect(page.locator('h1')).toContainText('歌单');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(toggle).toHaveAttribute('aria-label', '切换到天使模式');
  });
});
