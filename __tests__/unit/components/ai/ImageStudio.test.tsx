import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageStudio from '../../../../src/components/react/ai/ImageStudio';
import { generateImage } from '../../../../src/components/react/ai/api';

vi.mock('../../../../src/components/react/ai/api', () => ({
  generateImage: vi.fn().mockResolvedValue('https://cdn/result.png'),
  STYLES: ['赛博朋克霓虹', '水彩手绘', '复古像素', '油画质感', '节日主题'] as const,
}));

const mockedGenerateImage = vi.mocked(generateImage);

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

  it('追加描述输入触发 onChange 并限 50 字', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    const ta = screen.getByPlaceholderText(/追加描述/);
    const long = '一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十'; // 60 字
    await user.type(ta, long);
    expect(ta).toHaveValue(long.slice(0, 50));
  });

  it('切换尺寸为 2K 触发 size onChange', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    const size = screen.getByRole('combobox', { name: '尺寸' });
    await user.selectOptions(size, '2K');
    expect(size).toHaveValue('2K');
  });

  it('切换比例为 9:16 触发 ratio onChange', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    const ratio = screen.getByRole('combobox', { name: '比例' });
    await user.selectOptions(ratio, '9:16');
    expect(ratio).toHaveValue('9:16');
  });

  it('生成抛 Error 时展示其 message', async () => {
    mockedGenerateImage.mockRejectedValueOnce(new Error('服务繁忙'));
    const user = userEvent.setup();
    render(<ImageStudio />);
    await user.click(screen.getByRole('button', { name: '水彩手绘' }));
    await user.click(screen.getByRole('button', { name: /生成/ }));
    expect(await screen.findByText('服务繁忙')).toBeInTheDocument();
    // 失败后不渲染结果图与下载
    expect(screen.queryByRole('img', { name: /生成结果/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /下载/ })).not.toBeInTheDocument();
  });

  it('生成抛非 Error 时展示兜底「生成失败」', async () => {
    mockedGenerateImage.mockRejectedValueOnce('炸了');
    const user = userEvent.setup();
    render(<ImageStudio />);
    await user.click(screen.getByRole('button', { name: '水彩手绘' }));
    await user.click(screen.getByRole('button', { name: /生成/ }));
    expect(await screen.findByText('生成失败')).toBeInTheDocument();
  });

  it('换装比例选项只展示三档（4:3/16:9 不暴露）', async () => {
    render(<ImageStudio />);
    const ratio = screen.getByRole('combobox', { name: '比例' });
    expect(screen.queryByRole('option', { name: '4:3' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '16:9' })).not.toBeInTheDocument();
    expect(within(ratio).getAllByRole('option').length).toBe(3);
  });

  it('预览图跟随比例联动为对应裁切版', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    const preview = screen.getByRole('img', { name: /立绘预览/ });
    expect(preview).toHaveAttribute('src', '/images/illustration-1x1.webp');
    await user.selectOptions(screen.getByRole('combobox', { name: '比例' }), '9:16');
    expect(preview).toHaveAttribute('src', '/images/illustration-9x16.webp');
    await user.selectOptions(screen.getByRole('combobox', { name: '比例' }), '3:4');
    expect(preview).toHaveAttribute('src', '/images/illustration-3x4.webp');
  });

  it('切换比例后生成请求带新 ratio', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    await user.click(screen.getByRole('button', { name: '水彩手绘' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '比例' }), '9:16');
    await user.click(screen.getByRole('button', { name: /生成/ }));
    expect(mockedGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({ ratio: '9:16' })
    );
  });
});
