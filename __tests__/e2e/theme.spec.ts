import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should display theme toggle button', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');
    await expect(themeToggle).toBeVisible();
  });

  test('should start in Angel mode (light) by default', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toContain('恶魔');

    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('should use system preference when no saved theme', async ({ page }) => {
    // Set system preference to dark
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();

    const themeToggle = page.locator('button[aria-label*="切换"]');
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toContain('天使');

    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should switch to Demon mode (dark) when clicked', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');
    await themeToggle.click();

    await expect(page.locator('html')).toHaveClass(/dark/);

    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toContain('天使');
  });

  test('should switch back to Angel mode (light) when clicked again', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');

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
    const themeToggle = page.locator('button[aria-label*="切换"]');

    // Toggle to dark mode
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Check localStorage
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedTheme).toBe('dark');
  });

  test('should load saved theme on page reload', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');

    // Toggle to dark mode
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload page
    await page.reload();

    // Theme should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);

    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toContain('天使');
  });

  test('should save light theme preference', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');

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
      await page.goto(url);
      const themeToggle = page.locator('button[aria-label*="切换"]');
      await expect(themeToggle).toBeVisible();

      await themeToggle.click();
      await expect(page.locator('html')).toHaveClass(/dark/);

      await themeToggle.click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    }
  });

  test('should have correct visual styles in Angel mode', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');
    const toggleButton = themeToggle;

    // Check Angel mode styles
    const backgroundColor = await toggleButton.evaluate(el => {
      return window.getComputedStyle(el).background;
    });
    expect(backgroundColor).toContain('oklch(0.78');
  });

  test('should have correct visual styles in Demon mode', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');
    await themeToggle.click();

    const toggleButton = themeToggle;

    // Check Demon mode styles
    const backgroundColor = await toggleButton.evaluate(el => {
      return window.getComputedStyle(el).background;
    });
    expect(backgroundColor).toContain('oklch(0.72');
  });

  test('should be keyboard accessible', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]');
    await themeToggle.focus();

    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.keyboard.press('Enter');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
