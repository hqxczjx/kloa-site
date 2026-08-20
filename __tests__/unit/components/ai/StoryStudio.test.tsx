import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoryStudio from '../../../../src/components/react/ai/StoryStudio';

vi.mock('../../../../src/components/react/ai/api', () => ({
  createStoryboard: vi.fn().mockResolvedValue({
    frames: ['f0', 'f1', 'f2', 'f3'],
    motions: ['m0', 'm1', 'm2'],
  }),
  generateImage: vi.fn()
    .mockResolvedValueOnce('https://cdn/k0.png')
    .mockResolvedValueOnce('https://cdn/k1.png')
    .mockResolvedValueOnce('https://cdn/k2.png')
    .mockResolvedValueOnce('https://cdn/k3.png'),
  createKeyframeVideo: vi.fn()
    .mockResolvedValueOnce('vid_0')
    .mockResolvedValueOnce('vid_1')
    .mockResolvedValueOnce('vid_2'),
  getVideoStatus: vi.fn().mockResolvedValue({ status: 'completed', progress: 100, url: 'https://cdn/seg.mp4' }),
}));

describe('StoryStudio', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { generateImage, createKeyframeVideo, getVideoStatus } = await import('../../../../src/components/react/ai/api');
    vi.mocked(generateImage).mockResolvedValueOnce('https://cdn/k0.png')
      .mockResolvedValueOnce('https://cdn/k1.png')
      .mockResolvedValueOnce('https://cdn/k2.png')
      .mockResolvedValueOnce('https://cdn/k3.png');
    vi.mocked(createKeyframeVideo).mockResolvedValueOnce('vid_0')
      .mockResolvedValueOnce('vid_1')
      .mockResolvedValueOnce('vid_2');
    vi.mocked(getVideoStatus).mockResolvedValue({ status: 'completed', progress: 100, url: 'https://cdn/seg.mp4' });
  });

  it('全链路:提交创意 → 3 个连播视频 + 各段下载', async () => {
    const user = userEvent.setup();
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText(/故事创意/), '克罗雅在花园里追蝴蝶');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));

    const video = await screen.findByTestId('story-video-0');
    expect(video).toHaveAttribute('src', 'https://cdn/seg.mp4');
    expect(screen.getAllByRole('link', { name: /下载/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: '第 3 段' })).toBeEnabled();
    expect(screen.getByText('小剧场完成')).toBeInTheDocument();
  });

  it('关键帧按顺序串行生成且相邻段共享边界帧', async () => {
    const user = userEvent.setup();
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText(/故事创意/), 'x');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));
    await screen.findByTestId('story-video-0');
    const { createKeyframeVideo } = await import('../../../../src/components/react/ai/api');
    const calls = vi.mocked(createKeyframeVideo).mock.calls.map((c) => c[0]);
    expect(calls).toEqual([
      { prompt: 'm0', first_frame: 'https://cdn/k0.png', last_frame: 'https://cdn/k1.png', duration: 5 },
      { prompt: 'm1', first_frame: 'https://cdn/k1.png', last_frame: 'https://cdn/k2.png', duration: 5 },
      { prompt: 'm2', first_frame: 'https://cdn/k2.png', last_frame: 'https://cdn/k3.png', duration: 5 },
    ]);
  });

  it('展示离开即放弃提示', () => {
    render(<StoryStudio />);
    expect(screen.getByText(/离开即放弃/)).toBeInTheDocument();
  });

  it('失败后可 retry(按钮重新 enabled)', async () => {
    const { getVideoStatus } = await import('../../../../src/components/react/ai/api');
    vi.mocked(getVideoStatus).mockResolvedValue({ status: 'failed', progress: 0 });

    const user = userEvent.setup();
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText(/故事创意/), 'x');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));

    // Wait for button to re-enable (phase returns to idle when all segments fail)
    const button = await screen.findByRole('button', { name: /生成小剧场/ });
    expect(button).toBeEnabled();
  });

  it('onEnded 连播:播完自动切下一段,末段播完停在原地不越界', async () => {
    const { getVideoStatus } = await import('../../../../src/components/react/ai/api');
    // L45-55 pollSeg:全 completed 的 mock 首轮即终态,无需等待轮询间隔
    vi.mocked(getVideoStatus).mockReset().mockImplementation((id: string) => {
      const url = id === 'vid_0' ? 'https://cdn/seg1.mp4'
        : id === 'vid_1' ? 'https://cdn/seg2.mp4'
        : 'https://cdn/seg3.mp4';
      return Promise.resolve({ status: 'completed' as const, progress: 100, url });
    });

    const user = userEvent.setup();
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText(/故事创意/), 'x');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));

    const v0 = await screen.findByTestId('story-video-0');
    expect(v0).toHaveAttribute('src', 'https://cdn/seg1.mp4');

    // L173 onEnded → playIndex+1,key=playIndex 换源重挂载为下一段
    fireEvent(v0, new Event('ended'));
    const v1 = await screen.findByTestId('story-video-1');
    expect(v1).toHaveAttribute('src', 'https://cdn/seg2.mp4');

    fireEvent(v1, new Event('ended'));
    const v2 = await screen.findByTestId('story-video-2');
    expect(v2).toHaveAttribute('src', 'https://cdn/seg3.mp4');

    // 末段再触发 ended:Math.min 守卫使 playIndex 停在 2,不产生 story-video-3
    fireEvent(v2, new Event('ended'));
    expect(screen.queryByTestId('story-video-3')).not.toBeInTheDocument();
    expect(screen.getByTestId('story-video-2')).toHaveAttribute('src', 'https://cdn/seg3.mp4');
  });

  it('frames 阶段失败:显示错误文案、按钮恢复可点、无段视频区', async () => {
    const { generateImage } = await import('../../../../src/components/react/ai/api');
    // storyboard 成功(4 帧)后,第 1 帧 resolve、第 2 帧 reject → 命中 run() 外层 catch(L87-91)
    vi.mocked(generateImage).mockReset()
      .mockResolvedValueOnce('https://cdn/k0.png')
      .mockRejectedValueOnce(new Error('图片生成失败'));

    const user = userEvent.setup();
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText(/故事创意/), 'x');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));

    expect(await screen.findByText('图片生成失败')).toBeInTheDocument();
    const button = await screen.findByRole('button', { name: '生成小剧场' });
    expect(button).toBeEnabled();
    expect(screen.queryByTestId('story-video-0')).not.toBeInTheDocument();
  });

  it('段切换按钮:点第 2 段切换播放源;未完成的段按钮 disabled 点不动', async () => {
    const { getVideoStatus, createKeyframeVideo } = await import('../../../../src/components/react/ai/api');
    const user = userEvent.setup();

    // 场景 1:三段全 completed → 手动切段立即生效
    vi.mocked(getVideoStatus).mockReset().mockImplementation((id: string) => {
      const url = id === 'vid_0' ? 'https://cdn/seg1.mp4'
        : id === 'vid_1' ? 'https://cdn/seg2.mp4'
        : 'https://cdn/seg3.mp4';
      return Promise.resolve({ status: 'completed' as const, progress: 100, url });
    });
    const { unmount } = render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText(/故事创意/), 'x');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));
    await screen.findByTestId('story-video-0');

    await user.click(screen.getByRole('button', { name: '第 2 段' }));
    expect(await screen.findByTestId('story-video-1')).toHaveAttribute('src', 'https://cdn/seg2.mp4');
    unmount();

    // 场景 2:段 1 completed、段 2/3 in_progress → 段 2 按钮 disabled(L181),点击不切段
    // (in_progress 排下的 5s 轮询 timer 由 unmount 时的清理 effect 回收,无需等待)
    vi.mocked(createKeyframeVideo).mockReset()
      .mockResolvedValueOnce('vid_0')
      .mockResolvedValueOnce('vid_1')
      .mockResolvedValueOnce('vid_2');
    vi.mocked(getVideoStatus).mockReset().mockImplementation((id: string) =>
      id === 'vid_0'
        ? Promise.resolve({ status: 'completed' as const, progress: 100, url: 'https://cdn/seg1.mp4' })
        : Promise.resolve({ status: 'in_progress' as const, progress: 40 }));
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText(/故事创意/), 'y');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));
    await screen.findByTestId('story-video-0');

    const seg2 = screen.getByRole('button', { name: '第 2 段' });
    expect(seg2).toBeDisabled();
    await user.click(seg2); // user-event 不会对 disabled 按钮派发 click
    expect(screen.getByTestId('story-video-0')).toHaveAttribute('src', 'https://cdn/seg1.mp4');
  });

  it('retry 后数据隔离:新 run 只显示自己的结果,旧 run 的轮询产物不残留', async () => {
    const { getVideoStatus, createKeyframeVideo } = await import('../../../../src/components/react/ai/api');
    // beforeEach 注入的 createKeyframeVideo once 队列与本测试两轮 run 的语义冲突,重置后按调用序分流:
    // run#1:段 0/1 创建成功并进入轮询;段 2 创建失败(seg 级失败,不中止整轮)。
    let createCount = 0;
    vi.mocked(createKeyframeVideo).mockReset().mockImplementation(() => {
      createCount += 1;
      if (createCount === 1) return Promise.resolve('vid_0');
      if (createCount === 2) return Promise.resolve('vid_1');
      if (createCount === 3) return Promise.reject(new Error('第 3 段创建失败'));
      return Promise.resolve('vid_new'); // run#2 的三段
    });
    // 轮询按 id 区分:旧 id 第 1 次 in_progress(排 5s 递归 timer;段 2 失败后旧轮询需自行终态,
    // 全段终态触发 useEffect 解锁 busy,才可能 retry——这是组件的固有设计),第 2 次 completed
    // 返回旧 URL(诱饵:证明旧轮询的产物只存在于 run#1 的 segs 里);新 id 直接 completed 返回新 URL。
    const pollCount: Record<string, number> = {};
    vi.mocked(getVideoStatus).mockReset().mockImplementation((id: string) => {
      pollCount[id] = (pollCount[id] ?? 0) + 1;
      if (id === 'vid_new') {
        return Promise.resolve({ status: 'completed' as const, progress: 100, url: 'https://cdn/new.mp4' });
      }
      return pollCount[id] === 1
        ? Promise.resolve({ status: 'in_progress' as const, progress: 10 })
        : Promise.resolve({ status: 'completed' as const, progress: 100, url: 'https://cdn/old.mp4' });
    });

    const user = userEvent.setup();
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText(/故事创意/), 'first');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));

    // busy 期间按钮文案是阶段文本,轮询全部终态(phase 门控回 idle)后才恢复"生成小剧场"且 enabled → 可 retry
    const button = await screen.findByRole('button', { name: '生成小剧场' }, { timeout: 8000 });
    expect(button).toBeEnabled();
    expect(pollCount['vid_0']).toBeGreaterThanOrEqual(1); // 旧轮询确实运行过

    // run#2:三段创建全部 vid_new,轮询只应命中新 id
    await user.clear(screen.getByPlaceholderText(/故事创意/));
    await user.type(screen.getByPlaceholderText(/故事创意/), 'second');
    await user.click(button);
    const video = await screen.findByTestId('story-video-0');
    expect(video).toHaveAttribute('src', 'https://cdn/new.mp4');

    // 再等 > POLL_INTERVAL_MS(5s):确认没有迟到的旧轮询活动改写新 run 的展示。
    // (run() 开头的 abort+clear 是纵深防御——当前 UI 设计下 retry 仅在旧轮询全部终态后可达,
    //   此断言保证未来交互变化时旧 timer 复活也写不进来。)
    await new Promise(r => setTimeout(r, 6000));
    const links = screen.getAllByRole('link', { name: /下载/ });
    expect(links.map(l => l.getAttribute('href')).join(',')).toBe(
      'https://cdn/new.mp4,https://cdn/new.mp4,https://cdn/new.mp4');
    expect(video).toHaveAttribute('src', 'https://cdn/new.mp4');
  }, 15000);
});
