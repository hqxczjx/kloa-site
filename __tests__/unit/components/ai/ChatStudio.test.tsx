import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatStudio from '../../../../src/components/react/ai/ChatStudio';

// mock streamChat，避免真发请求
vi.mock('../../../../src/components/react/ai/api', () => ({
  streamChat: vi.fn(async (_req: unknown, cb: { onDelta: (t: string) => void; onDone: () => void }) => {
    cb.onDelta('嗨');
    cb.onDone();
  }),
  TOPICS: ['今天开心的事', '推荐一首歌', '天使和恶魔哪个是真的', '说句鼓励我的话'] as const,
}));

describe('ChatStudio', () => {
  it('默认天使形态，可切恶魔', async () => {
    const user = userEvent.setup();
    render(<ChatStudio />);
    expect(screen.getByLabelText(/天使/)).toBeInTheDocument();
    await user.click(screen.getByLabelText('切换到恶魔形态'));
    expect(screen.getByLabelText(/恶魔/)).toBeInTheDocument();
  });

  it('点话题 chip 填入输入框', async () => {
    const user = userEvent.setup();
    render(<ChatStudio />);
    await user.click(screen.getByRole('button', { name: '今天开心的事' }));
    expect(screen.getByPlaceholderText(/说点什么/)).toHaveValue('今天开心的事');
  });

  it('发送后出现 AI 回复并带 AI 标记', async () => {
    const user = userEvent.setup();
    render(<ChatStudio />);
    const input = screen.getByPlaceholderText(/说点什么/) as HTMLTextAreaElement;
    await user.type(input, '你好');
    await user.click(screen.getByRole('button', { name: /发送/ }));
    expect(await screen.findByText('AI 生成 · 二创')).toBeInTheDocument();
    expect(await screen.findByText('嗨')).toBeInTheDocument();
  });
});
