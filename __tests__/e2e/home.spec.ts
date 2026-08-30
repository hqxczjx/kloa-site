import { test, expect } from './test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure consistent initial state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    // Set system preference to light before each test
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
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

    // 主题写入 localStorage（自动等待，替代固定 sleep）
    await expect.poll(
      async () => await page.evaluate(() => localStorage.getItem('theme'))
    ).toBe('dark');

    // Reload，theme store 水合后异步从 localStorage 恢复
    await page.reload();

    // 先等按钮回到 dark 状态（store 异步恢复的稳定信号，替代 networkidle + 固定 sleep）；
    // html 的 dark 类是 SSR 瞬间值，水合中可能短暂丢失，故以按钮为准
    const themeToggleAfterReload = page.locator('button[aria-label*="切换"]').first();
    await expect(themeToggleAfterReload).toHaveAttribute('aria-label', /切换到天使模式/);

    // store 恢复后 html 带 dark 类
    await expect(page.locator('html')).toHaveClass(/dark/);
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

  test('should display song list section on home (scroll to see)', async ({ page }) => {
    // 首页应内嵌歌单区
    const songSection = page.locator('#songs');
    await expect(songSection).toBeAttached();

    // 滚动到歌单区
    await songSection.scrollIntoViewIfNeeded();

    // 歌曲行可见（SongList 水合 + VirtualList 渲染可见行）
    await expect(page.locator('[data-testid="song-row"]').first()).toBeVisible();
  });

  test('should scroll to song list via hero CTA (no navigation)', async ({ page }) => {
    const cta = page.getByRole('link', { name: /进入歌单/ });
    await expect(cta).toBeVisible();

    await cta.click();

    // 仍停留在首页，URL 含 #songs（锚点跳转，非 /music 导航）
    await expect(page).toHaveURL(/#songs/);
    await expect(page).not.toHaveURL(/\/music/);
  });

  test('纪念日卡片倒计时在软导航往返后仍回填（data-astro-rerun）', async ({ page }) => {
    // 回归：ClientRouter 按 textContent 去重内联脚本且软导航不重执行——离开首页
    // 再返回时 swap 进来的是新 SSR DOM，两张卡的「距离 N 天」停在占位「—」。
    // data-astro-rerun 让 router 在 swap 后重新执行内联倒计时（纯重算幂等）。
    // 卡片 hidden md:block，仅桌面视口渲染，显式设桌面尺寸。
    await page.setViewportSize({ width: 1280, height: 720 });

    const days = page.locator('[data-anniv-days]');
    await expect(days).toHaveCount(2);
    // 初始硬加载：浏览器正常执行内联脚本，占位被覆盖
    await expect(days).toHaveText([/天$/, /天$/]);

    // 软导航去 /about（点站内链接触发 ClientRouter，非 page.goto）
    await page.getByRole('link', { name: '关于' }).first().click();
    await expect(page).toHaveURL(/\/about/);

    // 软导航返回首页：等 swap 完成（URL + 内容都换成首页）
    await page.getByRole('link', { name: '首页' }).first().click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('克罗雅');

    // 新 SSR DOM 的占位被重执行的脚本回填，而非永久停留「—」
    await expect(days).toHaveText([/天$/, /天$/]);
  });
});
