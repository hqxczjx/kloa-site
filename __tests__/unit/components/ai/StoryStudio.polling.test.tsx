import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// 仅 mock 网络函数，保留真实 ApiError——polling.isTransientPollError 的
// instanceof 判定与组件内引用必须是同一个类对象
vi.mock('../../../../src/components/react/ai/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/components/react/ai/api')>();
  return {
    ...actual,
    createStoryboard: vi.fn(),
    generateImage: vi.fn(),
    createKeyframeVideo: vi.fn(),
    getVideoStatus: vi.fn(),
  };
});

import StoryStudio from '../../../../src/components/react/ai/StoryStudio';
import {
  ApiError,
  createStoryboard,
  generateImage,
  createKeyframeVideo,
  getVideoStatus,
} from '../../../../src/components/react/ai/api';
import type { VideoStatusResponse } from '../../../../src/components/react/ai/types';

const mocked = {
  createStoryboard: vi.mocked(createStoryboard),
  generateImage: vi.mocked(generateImage),
  createKeyframeVideo: vi.mocked(createKeyframeVideo),
  getVideoStatus: vi.mocked(getVideoStatus),
};

const COMPLETED: VideoStatusResponse = { status: 'completed', progress: 100, url: 'https://cdn/v.mp4' };

// 1 段（2 关键帧）最小剧本 → 走完 分镜→生图→建视频段→轮询 全链路
function startRun() {
  mocked.createStoryboard.mockResolvedValue({ frames: ['f1', 'f2'], motions: ['m1'] });
  mocked.generateImage.mockResolvedValue('https://cdn/frame.webp');
  mocked.createKeyframeVideo.mockResolvedValue('vid_1');
  render(<StoryStudio />);
  fireEvent.change(screen.getByPlaceholderText(/故事创意/), { target: { value: '克罗雅追蝴蝶' } });
  fireEvent.click(screen.getByRole('button', { name: '生成小剧场' }));
}

// 冲刷微任务链（分镜→生图→建段→第 1 次轮询），不推进任何定时器
async function flush() {
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

describe('StoryStudio 轮询退避', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('429 后按退避重试，最终 completed——段不判死', async () => {
    // 惰性构造 reject：提前创建的 rejected Promise 在被轮询消费前会先触发
    // unhandledRejection（Vitest 记为错误），调用时构造则同步挂上 .then/.catch
    const steps: (() => Promise<VideoStatusResponse>)[] = [
      () => Promise.reject(new ApiError('查询太频繁，请稍后再试', 429)),
      () => Promise.reject(new ApiError('查询太频繁，请稍后再试', 429)),
      () => Promise.resolve(COMPLETED),
    ];
    mocked.getVideoStatus.mockImplementation(() => steps.shift()!());

    startRun();
    await flush();
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(1);

    // 退避第 1 档 5s：差 1ms 不发第 2 次（轮询节奏绑定退避表）
    await advance(4_999);
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(2);

    // 退避第 2 档 10s 后 completed
    await advance(10_000);
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(3);
    expect(screen.getByText('✓ 完成')).toBeInTheDocument();
    expect(screen.getByTestId('story-video-0')).toBeInTheDocument();

    // 完成后不再轮询
    await advance(300_000);
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(3);
  });

  it('网络错误与 5xx 同样重试：连续三种瞬时误后仍完成', async () => {
    const steps: (() => Promise<VideoStatusResponse>)[] = [
      () => Promise.reject(new TypeError('Failed to fetch')), // 网络层（非 ApiError）
      () => Promise.reject(new ApiError('生成失败，请重试', 502)), // 5xx
      () => Promise.resolve(COMPLETED),
    ];
    mocked.getVideoStatus.mockImplementation(() => steps.shift()!());

    startRun();
    await flush();
    await advance(15_000); // 0s/5s/15s 三次轮询
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(3);
    expect(screen.getByText('✓ 完成')).toBeInTheDocument();
  });

  it('4xx（非 429）为终态：立即段失败且不再轮询', async () => {
    mocked.getVideoStatus.mockRejectedValue(new ApiError('查询失败', 404));

    startRun();
    await flush();
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByText('✗ 失败')).toBeInTheDocument();

    await advance(300_000);
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(1);
  });

  it('持续 429 打满退避：8 次轮询后收口为超时，而非首次即失败', async () => {
    mocked.getVideoStatus.mockRejectedValue(new ApiError('查询太频繁，请稍后再试', 429));

    startRun();
    await flush();
    // 轮询时刻 t=0,5,15,35,75,135,195,255s（nextDelay：5/10/20/40/60/60/60）；
    // 第 9 次触发 attempt>MAX_ATTEMPTS(8) → timeout，不发第 9 个请求
    await advance(254_999);
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(7);
    await advance(60_001);
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(8);
    expect(screen.getByText('✗ 失败')).toBeInTheDocument();

    await advance(300_000);
    expect(mocked.getVideoStatus).toHaveBeenCalledTimes(8);
  });
});
