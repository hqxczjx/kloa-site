import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';
import DanmakuBoard from '../../../src/components/react/DanmakuBoard';
import { danmaku } from '../../../src/data/danmaku';

describe('DanmakuBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('渲染文案', () => {
    render(<DanmakuBoard />);
    expect(screen.getByText(danmaku[0].text)).toBeInTheDocument();
  });

  it('显示分类筛选按钮（全部/应援/整活/纪念）', () => {
    render(<DanmakuBoard />);
    expect(screen.getByRole('button', { name: '应援' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '整活' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '纪念' })).toBeInTheDocument();
  });

  it('点击「整活」只显示整活文案', () => {
    render(<DanmakuBoard />);
    fireEvent.click(screen.getByRole('button', { name: '整活' }));
    const meme = danmaku.find(d => d.category === 'meme')!.text;
    const cheer = danmaku.find(d => d.category === 'cheer')!.text;
    expect(screen.getByText(meme)).toBeInTheDocument();
    expect(screen.queryByText(cheer)).not.toBeInTheDocument();
  });

  it('点击文案卡片复制到剪贴板并提示成功', async () => {
    render(<DanmakuBoard />);
    const first = danmaku[0];
    fireEvent.click(screen.getByRole('button', { name: `复制 ${first.text}` }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('已复制'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(first.text);
  });

  it('超过 20 字的文案标注超限', () => {
    render(<DanmakuBoard />);
    expect(document.querySelector('[data-over-limit="true"]')).toBeInTheDocument();
  });

  it('「复制全部」合并当前筛选文案（换行分隔）', async () => {
    render(<DanmakuBoard />);
    fireEvent.click(screen.getByRole('button', { name: '复制全部' }));
    const expected = danmaku.map(d => d.text).join('\n');
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('已复制'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected);
  });

  it('剪贴板写入失败时提示错误且不提示成功', async () => {
    (navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('denied'));
    render(<DanmakuBoard />);
    fireEvent.click(screen.getByRole('button', { name: `复制 ${danmaku[0].text}` }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('复制失败，请手动选择'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
