import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContributeDialog from '../../../src/components/react/ContributeDialog';

describe('ContributeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 防止上一用例残留 body overflow 状态泄漏
    document.body.style.overflow = '';
  });

  it('初始：渲染投稿按钮，弹窗未打开，aria-expanded=false，body 未锁定', () => {
    render(<ContributeDialog />);
    const trigger = screen.getByRole('button', { name: '投稿' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('点击投稿按钮打开弹窗，aria-expanded=true 且锁定 body 滚动', async () => {
    const user = userEvent.setup();
    render(<ContributeDialog />);
    await user.click(screen.getByRole('button', { name: '投稿' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '投稿' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('弹窗打开后渲染腾讯问卷 iframe（正确 src 与 title）', async () => {
    const user = userEvent.setup();
    render(<ContributeDialog />);
    await user.click(screen.getByRole('button', { name: '投稿' }));
    const iframe = screen.getByTitle('弹幕投稿表单');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://wj.qq.com/s2/27522632/db0v/');
    expect(screen.getByText('投稿新弹幕')).toBeInTheDocument();
  });

  it('点击关闭按钮(X)关闭弹窗并恢复 body 滚动', async () => {
    const user = userEvent.setup();
    render(<ContributeDialog />);
    await user.click(screen.getByRole('button', { name: '投稿' }));
    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('点击背景遮罩关闭弹窗', async () => {
    const user = userEvent.setup();
    render(<ContributeDialog />);
    await user.click(screen.getByRole('button', { name: '投稿' }));
    // 在 dialog 子树中，背景遮罩是首个 aria-hidden 元素（早于内部 X 图标 SVG）
    const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('按 Escape 关闭弹窗并恢复 body 滚动', async () => {
    const user = userEvent.setup();
    render(<ContributeDialog />);
    await user.click(screen.getByRole('button', { name: '投稿' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('按非 Escape 键不关闭弹窗（覆盖 if false 分支）', async () => {
    const user = userEvent.setup();
    render(<ContributeDialog />);
    await user.click(screen.getByRole('button', { name: '投稿' }));
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('弹窗打开时卸载组件，清理 keydown 监听并恢复 body 滚动', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ContributeDialog />);
    await user.click(screen.getByRole('button', { name: '投稿' }));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
