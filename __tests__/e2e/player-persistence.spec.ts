import { test, expect, type Page } from './test';

/**
 * P1-1 ClientRouter + PersistentPlayer transition:persist 续播验证。
 *
 * 站内 UI 暂无「播放」按钮（SongList 只做复制），PersistentPlayer 的公开契约是
 * window 上的 `playSong` CustomEvent（SongList 未来接入同一事件），因此用例经
 * page.evaluate 派发事件触发播放，音频源用页内生成的 WAV data URL——不依赖外网
 * 与本地音频文件，播放进度可确定性推进。
 */

// Chromium 默认 autoplay 策略可能拦截无用户手势的 programmatic play()，
// PersistentPlayer 收到事件后直接 audio.play()——放开策略保证「仍在播放」
// 断言确定性成立（args 镜像 chromium project 配置，仅本 spec 生效）。
test.use({
  launchOptions: {
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
    ],
  },
});

const SONG_TITLE = 'E2E 续播验证曲';

/** 等待 PersistentPlayer 岛（全站唯一带 transition:persist 的岛）完成水合 */
async function waitForPlayerHydrated(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('astro-island[data-astro-transition-persist]');
    return el instanceof HTMLElement && !el.hasAttribute('ssr');
  });
}

/** 派发 playSong 事件，url 为页内构造的 12s 静音 WAV data URL */
async function dispatchPlaySong(page: Page) {
  await page.evaluate((title: string) => {
    const sampleRate = 8000;
    const numSamples = sampleRate * 12;
    const bytes = new Uint8Array(44 + numSamples);
    const view = new DataView(bytes.buffer);
    const writeStr = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true); // 8-bit
    view.setUint16(34, 8, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples, true);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    window.dispatchEvent(
      new CustomEvent('playSong', {
        detail: { title, artist: 'kloa-e2e', url: 'data:audio/wav;base64,' + btoa(binary), tags: [] },
      })
    );
  }, SONG_TITLE);
}

/**
 * 派发 playSong 并等到播放器 UI 出现。astro-island 移除 ssr 属性 ≠ React
 * useEffect 已挂上 window 监听——首次派发可能落在水合 commit 与 effect 之间的
 * 窗口里被丢掉。重复派发幂等（重设同一首歌），以此消除竞态。
 */
async function playSongUntilPlayerVisible(page: Page) {
  for (let i = 0; i < 10; i++) {
    await dispatchPlaySong(page);
    try {
      await page.getByText(SONG_TITLE).waitFor({ state: 'visible', timeout: 1000 });
      return;
    } catch {
      // 监听尚未挂上，重派发
    }
  }
  throw new Error('playSong 派发后播放器未出现（监听器未挂载？）');
}

/** audio.currentTime（无元素时 -1，暂停时也返回真实进度） */
function audioTime(page: Page) {
  return page.evaluate(() => document.querySelector('audio')?.currentTime ?? -1);
}

test.describe('PersistentPlayer 续播（ClientRouter + transition:persist）', () => {
  test('/music 点歌 → 软导航回首页：播放器仍在且继续播放', async ({ page }) => {
    await page.goto('/music');
    await page.waitForLoadState('networkidle');
    await waitForPlayerHydrated(page);

    await playSongUntilPlayerVisible(page);
    // 播放已实际开始（进度推进），而非仅 UI 状态
    await expect.poll(() => audioTime(page)).toBeGreaterThan(0.3);

    // 标记当前 <audio> 节点：续播必须移动的是同一个 DOM 节点
    await page.evaluate(() => {
      const audio = document.querySelector('audio');
      if (audio) audio.dataset.persistProbe = 'original';
    });
    const timeBeforeNav = await audioTime(page);

    // 软导航回首页（ClientRouter 拦截站内链接）
    await page.getByRole('link', { name: '首页' }).first().click();
    await expect(page).toHaveURL('/');
    // 首页内容已换（Hero 的 h1），排除仅 URL 变化的假成功
    await expect(page.locator('h1')).toContainText('克罗雅');

    // 播放器 island 被移入新页面：标题仍在，且是同一个 <audio> 节点
    await expect(page.getByText(SONG_TITLE)).toBeVisible();
    expect(await page.locator('audio').evaluate((el) => el.dataset.persistProbe)).toBe('original');

    // 仍在播放：未暂停、进度越过导航前的值
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const a = document.querySelector('audio');
            if (!a) return -2;
            return a.paused ? -1 : a.currentTime;
          }),
        { timeout: 15000 }
      )
      .toBeGreaterThan(timeBeforeNav);
  });

  test('首页点歌 → /about 播放器消失 → 返回首页为全新状态（不续播）', async ({ page }) => {
    await page.goto('/');
    // 首页的 SongList 是 client:visible 且在首屏之下，不能用「全部岛水合」的
    // waitForHydration（会一直等它进视口）——只等 PersistentPlayer 岛
    await waitForPlayerHydrated(page);

    await playSongUntilPlayerVisible(page);
    await expect.poll(() => audioTime(page)).toBeGreaterThan(0.2);

    // /about 不渲染 SongListSection：persist 只在两页都渲染该 island 时生效，
    // 此处播放器随旧 DOM 一起销毁（页面结构决定的预期行为）
    await page.getByRole('link', { name: '关于' }).first().click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.locator('audio')).toHaveCount(0);
    await expect(page.getByText(SONG_TITLE)).toHaveCount(0);

    // 返回首页：全新水合的 PersistentPlayer，currentSong 为空 → 不渲染播放器
    await page.getByRole('link', { name: '首页' }).first().click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('克罗雅');
    await waitForPlayerHydrated(page);
    await expect(page.locator('audio')).toHaveCount(0);
    await expect(page.getByText(SONG_TITLE)).toHaveCount(0);
  });

  test('ClientRouter 软导航后主题保持（astro:after-swap 重同步）', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
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
