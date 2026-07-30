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

    // Reload，theme store 水合后异步按系统偏好恢复 dark
    await page.reload();

    // 先等按钮回到 dark 状态（store 异步恢复的稳定信号，替代 networkidle + 固定 sleep）；
    // html 的 dark 类是 SSR 瞬间值，水合中可能短暂丢失，故以按钮为准
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    await expect(themeToggle).toHaveAttribute('aria-label', '切换到天使模式');

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

    // Reload，theme store 水合后异步恢复 dark
    await page.reload();

    // 先等按钮回到 dark 状态（store 异步恢复的稳定信号，替代 networkidle + 固定 sleep）
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
});
