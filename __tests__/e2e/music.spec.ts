import { test, expect } from '@playwright/test';

test.describe('Music Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/music');
  });

  test('should load music page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/克罗雅/);
  });

  test('should display search bar', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索歌曲（支持拼音）');
    await expect(searchInput).toBeVisible();
  });

  test('should display tag filter section', async ({ page }) => {
    await expect(page.getByText('筛选标签')).toBeVisible();
    await expect(page.getByText('全部')).toBeVisible();
  });

  test('should display song list', async ({ page }) => {
    const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
    const count = await songItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should search songs by title', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索歌曲（支持拼音）');
    await searchInput.fill('大鱼');

    // Wait for search to complete
    await page.waitForTimeout(300);

    // Check if filtered results are shown
    const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
    const firstSong = songItems.first();
    await expect(firstSong).toContainText('大鱼');
  });

  test('should search songs by artist', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索歌曲（支持拼音）');
    await searchInput.fill('Vsinger');

    await page.waitForTimeout(300);

    const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
    const count = await songItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should search songs by pinyin', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索歌曲（支持拼音）');
    await searchInput.fill('dayu');

    await page.waitForTimeout(300);

    // Pinyin search should work
    const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
    const count = await songItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter songs by tag', async ({ page }) => {
    const chineseTag = page.getByText('中文').first();
    await chineseTag.click();

    await page.waitForTimeout(300);

    // Check that filtered results are shown
    const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
    const count = await songItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should deselect tag when clicked again', async ({ page }) => {
    const chineseTag = page.getByText('中文').first();
    await chineseTag.click();
    await page.waitForTimeout(300);

    const initialCount = await page.locator('[data-testid="virtual-list"]').locator('.group').count();

    await chineseTag.click();
    await page.waitForTimeout(300);

    const newCount = await page.locator('[data-testid="virtual-list"]').locator('.group').count();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('should reset filter when "全部" is clicked', async ({ page }) => {
    const chineseTag = page.getByText('中文').first();
    await chineseTag.click();
    await page.waitForTimeout(300);

    const allTag = page.getByText('全部');
    await allTag.click();
    await page.waitForTimeout(300);

    // Should show all songs
    const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
    const count = await songItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should copy song title', async ({ page }) => {
    const firstSong = page.locator('[data-testid="virtual-list"]').locator('.group').first();
    await firstSong.click();

    // Check for toast notification
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-sonner-toast]')).toContainText('已复制');
  });

  test('should display copy button on song item', async ({ page }) => {
    const firstSong = page.locator('[data-testid="virtual-list"]').locator('.group').first();
    const copyButton = firstSong.getByTitle(/复制/);
    await expect(copyButton).toBeVisible();
  });

  test('should display empty state when no results found', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索歌曲（支持拼音）');
    await searchInput.fill('nonexistent song xyz123');

    await page.waitForTimeout(300);

    await expect(page.getByText('没有找到匹配的歌曲')).toBeVisible();
  });

  test('should clear search when input is cleared', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索歌曲（支持拼音）');
    await searchInput.fill('大鱼');
    await page.waitForTimeout(300);

    await searchInput.fill('');
    await page.waitForTimeout(300);

    // Should show all songs again
    const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
    const count = await songItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should expand and collapse tags', async ({ page }) => {
    const expandButton = page.getByText('展开');
    await expect(expandButton).toBeVisible();

    await expandButton.click();

    await expect(page.getByText('收起')).toBeVisible();

    const collapseButton = page.getByText('收起');
    await collapseButton.click();

    await expect(page.getByText('展开')).toBeVisible();
  });

  test('should combine search and tag filters', async ({ page }) => {
    const chineseTag = page.getByText('中文').first();
    await chineseTag.click();
    await page.waitForTimeout(300);

    const searchInput = page.getByPlaceholder('搜索歌曲（支持拼音）');
    await searchInput.fill('大');
    await page.waitForTimeout(300);

    // Should show filtered results
    const songItems = page.locator('[data-testid="virtual-list"]').locator('.group');
    const count = await songItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display song tags', async ({ page }) => {
    const firstSong = page.locator('[data-testid="virtual-list"]').locator('.group').first();
    const tags = firstSong.locator('.px-2.py-1');
    const count = await tags.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should scroll through song list', async ({ page }) => {
    const listContainer = page.locator('[data-testid="virtual-list"]').locator('..');
    if (listContainer) {
      await listContainer.evaluate((el: any) => el.scrollTop = 1000);
      await page.waitForTimeout(300);

      // Check that scrolling works
      const scrollTop = await listContainer.evaluate((el: any) => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    }
  });

  test('should navigate back to home', async ({ page }) => {
    const homeLink = page.getByRole('link', { name: '首页' });
    await homeLink.click();

    await expect(page).toHaveURL('/');
  });

  test('should navigate to about page', async ({ page }) => {
    const aboutLink = page.getByRole('link', { name: '关于' });
    await aboutLink.click();

    await expect(page).toHaveURL(/\/about/);
  });
});
