import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set system preference to light before each test
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
  });

  test('should load home page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/克罗雅/);
  });

  test('should display navigation links', async ({ page }) => {
    // Desktop navigation
    await page.waitForSelector('nav', { state: 'visible' });
    const homeLink = page.getByRole('link', { name: '首页' });
    await expect(homeLink).toBeVisible();

    const musicLink = page.getByRole('link', { name: '歌单', exact: true });
    await expect(musicLink).toBeVisible();

    const aboutLink = page.getByRole('link', { name: '关于' });
    await expect(aboutLink).toBeVisible();
  });

  test('should display hero section', async ({ page }) => {
    // Check for hero content
    const heroContent = page.locator('main').first();
    await expect(heroContent).toBeVisible();
  });

  test('should navigate to music page', async ({ page }) => {
    const musicLink = page.getByRole('link', { name: '歌单', exact: true });
    await musicLink.click();

    await expect(page).toHaveURL(/\/music/);
  });

  test('should navigate to about page', async ({ page }) => {
    const aboutLink = page.getByRole('link', { name: '关于' });
    await aboutLink.click();

    await expect(page).toHaveURL(/\/about/);
  });

  test('should display theme toggle button', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();
    await expect(themeToggle).toBeVisible();
  });

  test('should toggle theme', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();

    // Check initial state (Angel mode)
    const initialAriaLabel = await themeToggle.getAttribute('aria-label');
    expect(initialAriaLabel).toBe('切换到恶魔模式');

    // Toggle to Demon mode
    await themeToggle.click();

    // Check new state
    const newAriaLabel = await themeToggle.getAttribute('aria-label');
    expect(newAriaLabel).toBe('切换到天使模式');

    // Verify dark class is added
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Toggle back
    await themeToggle.click();

    // Verify dark class is removed
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('should persist theme preference', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="切换"]').first();

    // Toggle to dark mode
    await themeToggle.click();

    // Wait for theme to be saved to localStorage
    await page.waitForTimeout(1000);

    // Verify theme was saved
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedTheme).toBe('dark');

    // Reload page
    await page.reload();

    // Wait for page to fully load and React to mount
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Theme should still be dark
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Get fresh reference to the element
    const themeToggleAfterReload = page.locator('button[aria-label*="切换"]').first();
    const ariaLabel = await themeToggleAfterReload.getAttribute('aria-label');
    expect(ariaLabel).toContain('切换到天使模式');
  });

  test('should display footer on desktop', async ({ page }) => {
    // Check viewport is desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    await expect(footer).toContainText(/©/);
    await expect(footer).toContainText(/Kloa Site/);
  });

  test('should have proper meta tags', async ({ page }) => {
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toBeTruthy();

    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toContain('width=device-width');
  });
});
