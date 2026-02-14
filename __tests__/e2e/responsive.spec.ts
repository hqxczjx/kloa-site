import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.describe('Desktop Viewport (1280x720)', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should display desktop navigation', async ({ page }) => {
      await page.goto('/');

      const desktopNav = page.locator('nav').filter({ has: page.getByRole('link', { name: '首页' }) });
      await expect(desktopNav).toBeVisible();
    });

    test('should display all navigation links', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('link', { name: '首页' })).toBeVisible();
      await expect(page.getByRole('link', { name: '歌单' })).toBeVisible();
      await expect(page.getByRole('link', { name: '关于' })).toBeVisible();
    });

    test('should display footer', async ({ page }) => {
      await page.goto('/');

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('should not display mobile navigation', async ({ page }) => {
      await page.goto('/');

      // Mobile bottom nav should be hidden on desktop
      const mobileNav = page.locator('nav.fixed.bottom-0');
      await expect(mobileNav).not.toBeVisible();
    });
  });

  test.describe('Tablet Viewport (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should display content properly', async ({ page }) => {
      await page.goto('/');

      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });

    test('should display navigation', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('link', { name: '首页' })).toBeVisible();
    });

    test('should display footer', async ({ page }) => {
      await page.goto('/');

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });
  });

  test.describe('Mobile Viewport (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display mobile bottom navigation', async ({ page }) => {
      await page.goto('/');

      const mobileNav = page.locator('nav.fixed.bottom-0');
      await expect(mobileNav).toBeVisible();
    });

    test('should display mobile navigation icons', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('link', { name: '首页' })).toBeVisible();
      await expect(page.getByRole('link', { name: '歌单' })).toBeVisible();
      await expect(page.getByRole('link', { name: '关于' })).toBeVisible();
    });

    test('should not display desktop navigation', async ({ page }) => {
      await page.goto('/');

      // Desktop nav should be hidden on mobile
      const desktopNav = page.locator('nav.hidden.md\\:flex');
      await expect(desktopNav).not.toBeVisible();
    });

    test('should not display footer on mobile', async ({ page }) => {
      await page.goto('/');

      const footer = page.locator('footer');
      await expect(footer).not.toBeVisible();
    });

    test('should display theme toggle on mobile', async ({ page }) => {
      await page.goto('/');

      const themeToggle = page.locator('button[aria-label*="切换"]');
      await expect(themeToggle).toBeVisible();
    });

    test('should display mobile theme toggle in top right', async ({ page }) => {
      await page.goto('/');

      const themeToggle = page.locator('button[aria-label*="切换"]');
      const box = await themeToggle.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThan(300); // Should be on the right side
      expect(box!.y).toBeLessThan(50); // Should be near the top
    });
  });

  test.describe('Music Page on Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display search bar', async ({ page }) => {
      await page.goto('/music');

      const searchInput = page.getByPlaceholder('搜索歌曲（支持拼音）');
      await expect(searchInput).toBeVisible();
    });

    test('should display tag filter', async ({ page }) => {
      await page.goto('/music');

      await expect(page.getByText('筛选标签')).toBeVisible();
      await expect(page.getByText('全部')).toBeVisible();
    });

    test('should display song list', async ({ page }) => {
      await page.goto('/music');

      const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
      const count = await songItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should scroll through song list', async ({ page }) => {
      await page.goto('/music');

      const listContainer = page.locator('[data-testid="virtual-list"]').locator('..');
      if (listContainer) {
        await listContainer.evaluate((el: any) => el.scrollTop = 500);
        await page.waitForTimeout(300);

        const scrollTop = await listContainer.evaluate((el: any) => el.scrollTop);
        expect(scrollTop).toBeGreaterThan(0);
      }
    });
  });

  test.describe('About Page on Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display page title', async ({ page }) => {
      await page.goto('/about');

      await expect(page.getByText('关于本站')).toBeVisible();
    });

    test('should display disclaimer', async ({ page }) => {
      await page.goto('/about');

      await expect(page.getByText('本站声明')).toBeVisible();
    });

    test('should be scrollable', async ({ page }) => {
      await page.goto('/about');

      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);

      expect(bodyHeight).toBeGreaterThan(viewportHeight);
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle landscape orientation', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/');

      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });

    test('should handle portrait orientation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Touch Interactions', () => {
    test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

    test('should handle tap on navigation links', async ({ page }) => {
      await page.goto('/');

      const musicLink = page.getByRole('link', { name: '歌单' });
      await musicLink.tap();

      await expect(page).toHaveURL(/\/music/);
    });

    test('should handle tap on theme toggle', async ({ page }) => {
      await page.goto('/');

      const themeToggle = page.locator('button[aria-label*="切换"]');
      await themeToggle.tap();

      await expect(page.locator('html')).toHaveClass(/dark/);
    });
  });
});
