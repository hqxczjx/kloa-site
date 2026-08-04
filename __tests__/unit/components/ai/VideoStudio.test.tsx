import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoStudio from '../../../../src/components/react/ai/VideoStudio';

vi.mock('../../../../src/components/react/ai/api', () => ({
  ACTIONS: ['微微笑', '回头看镜头', '风吹动发丝', '自然眨眼呼吸', '缓缓走近'] as const,
  createVideo: vi.fn().mockResolvedValue('vid_1'),
  getVideoStatus: vi.fn().mockResolvedValue({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' }),
}));

describe('VideoStudio', () => {
  it('选动作后提交，轮询完成后展示视频与下载', async () => {
    const user = userEvent.setup();
    render(<VideoStudio />);
    await user.click(screen.getByRole('button', { name: '微微笑' }));
    await user.click(screen.getByRole('button', { name: /生成/ }));
    const video = await screen.findByTestId('result-video');
    expect(video).toHaveAttribute('src', 'https://cdn/v.mp4');
    expect(screen.getByRole('link', { name: /下载/ })).toHaveAttribute('href', 'https://cdn/v.mp4');
  });

  it('展示离开即放弃提示', () => {
    render(<VideoStudio />);
    expect(screen.getByText(/离开即放弃/)).toBeInTheDocument();
  });
});
