import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    const { generateImage, createKeyframeVideo } = await import('../../../../src/components/react/ai/api');
    vi.mocked(generateImage).mockResolvedValueOnce('https://cdn/k0.png')
      .mockResolvedValueOnce('https://cdn/k1.png')
      .mockResolvedValueOnce('https://cdn/k2.png')
      .mockResolvedValueOnce('https://cdn/k3.png');
    vi.mocked(createKeyframeVideo).mockResolvedValueOnce('vid_0')
      .mockResolvedValueOnce('vid_1')
      .mockResolvedValueOnce('vid_2');
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
});
