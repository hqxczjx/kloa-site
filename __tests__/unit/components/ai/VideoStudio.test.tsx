import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoStudio from '../../../../src/components/react/ai/VideoStudio';
import { createVideo, getVideoStatus } from '../../../../src/components/react/ai/api';

vi.mock('../../../../src/components/react/ai/api', () => ({
  ACTIONS: ['微微笑', '回头看镜头', '风吹动发丝', '自然眨眼呼吸', '缓缓走近'] as const,
  createVideo: vi.fn(),
  getVideoStatus: vi.fn(),
}));

const mockedCreateVideo = vi.mocked(createVideo);
const mockedGetVideoStatus = vi.mocked(getVideoStatus);

function defaults() {
  mockedCreateVideo.mockResolvedValue('vid_1');
  mockedGetVideoStatus.mockResolvedValue({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' });
}

// real-timer 测试用：userEvent 触发动作 + 生成
async function generate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '微微笑' }));
  await user.click(screen.getByRole('button', { name: /生成/ }));
}

// fake-timer 测试用：fireEvent 同步触发，避免 userEvent 在假时钟下卡死
function generateSync() {
  fireEvent.click(screen.getByRole('button', { name: '微微笑' }));
  fireEvent.click(screen.getByRole('button', { name: /生成/ }));
}

// gen() 是 fire-and-forget 的 async，跨多层 await（createVideo → poll → getVideoStatus）；
// 单次 advanceTimersByTimeAsync(0) 只 drain 一轮微任务，需循环 flush 才能跑完整个链路。
// advance(0) 不推进时间，不会误触发 5s 轮询 timer。
async function flush() {
  for (let i = 0; i < 10; i++) await vi.advanceTimersByTimeAsync(0);
}

describe('VideoStudio', () => {
  beforeEach(() => {
    mockedCreateVideo.mockReset();
    mockedGetVideoStatus.mockReset();
    defaults();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('选动作后提交，轮询完成后展示视频与下载', async () => {
    const user = userEvent.setup();
    render(<VideoStudio />);
    await generate(user);
    const video = await screen.findByTestId('result-video');
    expect(video).toHaveAttribute('src', 'https://cdn/v.mp4');
    expect(screen.getByRole('link', { name: /下载/ })).toHaveAttribute('href', 'https://cdn/v.mp4');
  });

  it('展示离开即放弃提示', () => {
    render(<VideoStudio />);
    expect(screen.getByText(/离开即放弃/)).toBeInTheDocument();
  });

  it('追加描述输入并限 50 字（L79 onChange）', () => {
    render(<VideoStudio />);
    const ta = screen.getByPlaceholderText(/追加描述/) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'a'.repeat(60) } });
    expect(ta).toHaveValue('a'.repeat(50));
  });

  it('切换时长为 5s 后生成携带 duration=5（L87）', async () => {
    const user = userEvent.setup();
    render(<VideoStudio />);
    await user.click(screen.getByRole('button', { name: '5s' }));
    await generate(user);
    expect(mockedCreateVideo).toHaveBeenCalledWith(
      expect.objectContaining({ action: '微微笑', duration: 5 }),
      expect.any(AbortSignal),
    );
  });

  it('切换时长为 3s（L85）', async () => {
    const user = userEvent.setup();
    render(<VideoStudio />);
    await user.click(screen.getByRole('button', { name: '5s' }));
    await user.click(screen.getByRole('button', { name: '3s' }));
    await generate(user);
    expect(mockedCreateVideo).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 3 }),
      expect.any(AbortSignal),
    );
  });

  // error 文案同时渲染在表单区（L95）与结果区（L108 failed 分支），故用 findAllByText
  it('createVideo 抛 Error 时展示其 message（L50 / L51 instanceof true）', async () => {
    mockedCreateVideo.mockRejectedValueOnce(new Error('服务繁忙'));
    const user = userEvent.setup();
    render(<VideoStudio />);
    await generate(user);
    expect((await screen.findAllByText('服务繁忙')).length).toBeGreaterThan(0);
  });

  it('createVideo 抛非 Error 时展示兜底文案（L51 instanceof false）', async () => {
    mockedCreateVideo.mockRejectedValueOnce('炸了');
    const user = userEvent.setup();
    render(<VideoStudio />);
    await generate(user);
    expect((await screen.findAllByText('创建任务失败')).length).toBeGreaterThan(0);
  });

  it('轮询返回 failed 时展示生成失败（L32）', async () => {
    mockedGetVideoStatus.mockResolvedValueOnce({ status: 'failed', progress: 0 });
    const user = userEvent.setup();
    render(<VideoStudio />);
    await generate(user);
    expect((await screen.findAllByText('生成失败，请重试')).length).toBeGreaterThan(0);
  });

  it('轮询抛错时展示查询失败（L36 catch）', async () => {
    mockedGetVideoStatus.mockRejectedValueOnce(new Error('net'));
    const user = userEvent.setup();
    render(<VideoStudio />);
    await generate(user);
    expect((await screen.findAllByText('查询失败，请重试')).length).toBeGreaterThan(0);
  });

  it('轮询中间态 in_progress 后递归直到 completed（L33 / L34）', async () => {
    vi.useFakeTimers();
    mockedGetVideoStatus.mockResolvedValueOnce({ status: 'in_progress', progress: 50 });
    render(<VideoStudio />);
    generateSync();
    // flush：gen → createVideo resolve → poll attempt1 → getVideoStatus(in_progress) → setProgress(50) + setStatus + setTimeout(5s)
    await flush();
    expect(screen.getAllByText(/50%/).length).toBeGreaterThan(0);
    // 推进 5s 触发下一次 poll → 默认 completed → 出视频
    await vi.advanceTimersByTimeAsync(5000);
    await flush();
    expect(screen.getByTestId('result-video')).toHaveAttribute('src', 'https://cdn/v.mp4');
  });

  it('轮询超过最大次数时展示超时（L27）', async () => {
    vi.useFakeTimers();
    mockedGetVideoStatus.mockResolvedValue({ status: 'in_progress', progress: 10 });
    render(<VideoStudio />);
    generateSync();
    await flush();
    // 指数退避后总时长 255s（5+10+20+40+60×3），推进 300s 确保越过超时点
    for (let i = 0; i < 60; i++) {
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(screen.getAllByText(/生成较久/).length).toBeGreaterThan(0);
  });

  it('轮询中卸载组件清理定时器不报错（L22-23 cleanup）', async () => {
    vi.useFakeTimers();
    mockedGetVideoStatus.mockResolvedValue({ status: 'in_progress', progress: 10 });
    const { unmount } = render(<VideoStudio />);
    generateSync();
    await flush(); // 进入轮询，setTimeout 已排队
    unmount(); // 触发 cleanup：abort + clearTimeout（L22-23）
    await vi.advanceTimersByTimeAsync(20000); // 已清理，不应再触发 setState
  });
});
