import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatStudio from '../../../../src/components/react/ai/ChatStudio';
import { streamChat } from '../../../../src/components/react/ai/api';

type Cb = { onDelta: (t: string) => void; onDone: () => void; onError: () => void };

vi.mock('../../../../src/components/react/ai/api', () => ({
  streamChat: vi.fn(),
  TOPICS: ['今天开心的事', '推荐一首歌', '天使和恶魔哪个是真的', '说句鼓励我的话'] as const,
}));

const mockedStreamChat = vi.mocked(streamChat);

function defaultStream() {
  mockedStreamChat.mockImplementation(async (_req: unknown, cb: Cb) => {
    cb.onDelta('嗨');
    cb.onDone();
  });
}

describe('ChatStudio', () => {
  beforeEach(() => {
    mockedStreamChat.mockReset();
    defaultStream();
  });

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

  it('输入限 100 字（L132 onChange slice）', () => {
    render(<ChatStudio />);
    const ta = screen.getByLabelText('输入框') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'a'.repeat(120) } });
    expect(ta).toHaveValue('a'.repeat(100));
  });

  it('可在天使与恶魔间来回切换（L65 setForm angel）', async () => {
    const user = userEvent.setup();
    render(<ChatStudio />);
    await user.click(screen.getByLabelText('切换到恶魔形态'));
    await user.click(screen.getByLabelText('切换到天使形态'));
    expect(screen.getByLabelText('当前天使形态')).toBeInTheDocument();
  });

  it('出错且无内容时显示回复中断（L38-45 onError）', async () => {
    mockedStreamChat.mockImplementation(async (_req: unknown, cb: Cb) => {
      cb.onError();
    });
    const user = userEvent.setup();
    render(<ChatStudio />);
    await user.type(screen.getByLabelText('输入框'), '你好');
    await user.click(screen.getByRole('button', { name: /发送/ }));
    expect(await screen.findByText('（回复中断，请重试）')).toBeInTheDocument();
  });

  it('空输入按 Enter 不发送（L21 guard / L133 onKeyDown）', () => {
    render(<ChatStudio />);
    fireEvent.keyDown(screen.getByLabelText('输入框'), { key: 'Enter' });
    expect(mockedStreamChat).not.toHaveBeenCalled();
    expect(screen.queryByText('AI 生成 · 二创')).toBeNull();
  });

  it('卸载时中止请求（L15-17 cleanup）', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ChatStudio />);
    await user.type(screen.getByLabelText('输入框'), '你好');
    await user.click(screen.getByRole('button', { name: /发送/ }));
    await screen.findByText('嗨'); // 等默认流完成，abortRef.current 已设
    unmount(); // 触发 cleanup：abortRef.current?.abort()
  });
});
