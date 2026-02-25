import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('should load about page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/克罗雅/);
  });

  test('should display page title', async ({ page }) => {
    await expect(page.getByText('关于本站')).toBeVisible();
  });

  test('should display disclaimer section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '本站声明' }).first()).toBeVisible();
  });

  test('should display disclaimer content', async ({ page }) => {
    await expect(page.getByText(/本网站为/).first()).toBeVisible();
    await expect(page.getByText(/克罗雅/).first()).toBeVisible();
  });

  test('should display warning message', async ({ page }) => {
    await expect(page.getByText(/请勿就本网站的相关问题/).first()).toBeVisible();
  });

  test('should display Bilibili link', async ({ page }) => {
    const link = page.getByText('@卿家ん');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://space.bilibili.com/38028857');
  });

  test('should open Bilibili link in new tab', async ({ page }) => {
    const link = page.getByText('@卿家ん');
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('should display technology section', async ({ page }) => {
    await expect(page.getByText(/Built with/)).toBeVisible();
  });

  test('should display features section', async ({ page }) => {
    await expect(page.getByText(/开发者碎碎念/)).toBeVisible();
  });

  test('should display contact section', async ({ page }) => {
    await expect(page.getByText(/联系方式/)).toBeVisible();
  });

  test('should display heart icon', async ({ page }) => {
    const heartIcon = page.locator('svg').first();
    await expect(heartIcon).toBeVisible();
  });

  test('should display background effects', async ({ page }) => {
    const effects = page.locator('.animate-pulse-slow');
    const count = await effects.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to home page', async ({ page }) => {
    const homeLink = page.getByRole('link', { name: '首页' });
    await homeLink.click();

    await expect(page).toHaveURL('/');
  });

  test('should navigate to music page', async ({ page }) => {
    const musicLink = page.getByRole('link', { name: '歌单' });
    await musicLink.click();

    await expect(page).toHaveURL(/\/music/);
  });

  test('should display footer on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should have proper heading structure', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile navigation is visible
    const mobileNav = page.locator('nav.md\\:hidden');
    await expect(mobileNav).toBeVisible();

    // Check content is still visible
    await expect(page.getByText('关于本站')).toBeVisible();
  });
});
