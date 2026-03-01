import { test, expect } from '@playwright/test';

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
    await page.reload();

    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toBe('切换到天使模式');

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

    // Reload page
    await page.reload();

    // Theme should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Get fresh reference to the element
    const themeToggleAfterReload = page.locator('button[aria-label*="切换"]').first();
    const ariaLabel = await themeToggleAfterReload.getAttribute('aria-label');
    expect(ariaLabel).toBe('切换到天使模式');
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
      await page.goto(url);
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

    // Wait for focus to be applied
    await page.waitForTimeout(100);

    await page.keyboard.press('Enter');
    // Wait for theme to change
    await page.waitForTimeout(1000);
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.keyboard.press('Enter');
    // Wait for theme to change back
    await page.waitForTimeout(1000);
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
