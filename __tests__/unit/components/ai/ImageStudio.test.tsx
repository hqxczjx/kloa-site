import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageStudio from '../../../../src/components/react/ai/ImageStudio';

vi.mock('../../../../src/components/react/ai/api', () => ({
  generateImage: vi.fn().mockResolvedValue('https://cdn/result.png'),
  STYLES: ['赛博朋克霓虹', '水彩手绘', '复古像素', '油画质感', '节日主题'] as const,
}));

describe('ImageStudio', () => {
  it('展示立绘预览与风格选项', () => {
    render(<ImageStudio />);
    expect(screen.getByRole('img', { name: /立绘预览/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '水彩手绘' })).toBeInTheDocument();
  });

  it('选风格＋生成后展示结果图与下载', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    await user.click(screen.getByRole('button', { name: '水彩手绘' }));
    await user.click(screen.getByRole('button', { name: /生成/ }));
    expect(await screen.findByRole('img', { name: /生成结果/ })).toHaveAttribute('src', 'https://cdn/result.png');
    expect(screen.getByRole('link', { name: /下载/ })).toHaveAttribute('href', 'https://cdn/result.png');
  });

  it('展示「链接可能失效」提示', () => {
    render(<ImageStudio />);
    expect(screen.getByText(/链接可能失效/)).toBeInTheDocument();
  });
});
