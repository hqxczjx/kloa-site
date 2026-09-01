import { test, expect, waitForHydration } from './test';

const STORYBOARD = { frames: ['f0', 'f1', 'f2', 'f3'], motions: ['m0', 'm1', 'm2'] };

test.describe('AI 小剧场页', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/storyboard', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STORYBOARD),
      })
    );
    await page.route('**/api/image', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://cdn/kf.png' }),
      })
    );
    await page.route('**/api/video', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ video_id: 'v1' }),
      })
    );
    await page.route('**/api/video/status*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'completed', progress: 100, url: 'https://cdn/seg.mp4' }),
      })
    );
  });

  test('全链路生成并连播', async ({ page }) => {
    await page.goto('/ai/story/');
    // goto 后岛未水合前 fill 的值会被初始 state 重置吞掉（受控按钮保持 disabled）
    await waitForHydration(page);
    const textarea = page.getByPlaceholder(/故事创意/);
    await textarea.click();
    await textarea.type('克罗雅在花园里追蝴蝶');
    const button = page.getByRole('button', { name: /生成小剧场/ });
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.getByTestId('story-video-0')).toHaveAttribute('src', 'https://cdn/seg.mp4');
    await expect(page.getByText('小剧场完成')).toBeVisible();
    // 段切换
    await page.getByRole('button', { name: '第 2 段' }).click();
    await expect(page.getByTestId('story-video-1')).toHaveAttribute('src', 'https://cdn/seg.mp4');
  });

  test('分镜失败提示', async ({ page }) => {
    await page.unroute('**/api/storyboard');
    await page.route('**/api/storyboard', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: '分镜生成失败，请重试' }),
      })
    );
    await page.goto('/ai/story/');
    // goto 后岛未水合前 fill 的值会被初始 state 重置吞掉（受控按钮保持 disabled）
    await waitForHydration(page);
    const textarea = page.getByPlaceholder(/故事创意/);
    await textarea.click();
    await textarea.type('x');
    await page.getByRole('button', { name: /生成小剧场/ }).click();
    await expect(page.getByText('分镜生成失败，请重试')).toBeVisible();
  });

  // 点导航/入口卡软导航进入本页（非 goto），断言页面专属元素可见，证明 swap 落定
  test('软导航进入小剧场页（swap 内容落定）', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'AI 实验室', exact: true }).first().click();
    await expect(page).toHaveURL(/\/ai\/$/);
    await page.getByRole('link', { name: /克罗雅小剧场/ }).click();

    await expect(page).toHaveURL(/\/ai\/story\//);
    await expect(page.getByPlaceholder(/故事创意/)).toBeVisible();
  });
});
