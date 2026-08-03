import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Fragment } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongList from '../../../src/components/react/SongList';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../../src/components/react/VirtualList', () => ({
  default: ({ items, renderItem }: any) => (
    <div data-testid="virtual-list" data-total-items={items.length}>
      {items.map((it: any, i: number) => (
        <Fragment key={i}>{renderItem(it, i)}</Fragment>
      ))}
    </div>
  ),
}));

const songs = [
  { title: '大鱼', artist: 'Vsinger', titlePinyin: 'dayu', artistPinyin: 'vsinger', languages: ['国语'], genres: ['治愈'], gifts: [] },
  { title: 'Bad apple', artist: 'Vsinger', titlePinyin: 'badapple', artistPinyin: 'vsinger', languages: ['日语'], genres: ['东方'], gifts: [] },
  { title: '付费歌', artist: 'A', titlePinyin: 'feifeige', artistPinyin: 'a', languages: ['国语'], genres: ['流行'], gifts: ['100 SC'] },
];

describe('SongList (重设计)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染搜索框与新工具栏', () => {
    render(<SongList songs={songs} />);
    expect(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…')).toBeInTheDocument();
    expect(screen.getByTestId('random-button')).toBeInTheDocument();
    expect(screen.getByText(/共 3 首/)).toBeInTheDocument();
  });

  it('渲染所有歌曲行', () => {
    render(<SongList songs={songs} />);
    expect(screen.getAllByTestId('song-row')).toHaveLength(3);
  });

  it('空数据显示空状态', () => {
    render(<SongList songs={[]} />);
    expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
  });

  it('搜索按标题过滤', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.type(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…'), '大鱼');
    expect(screen.getByText('大鱼')).toBeInTheDocument();
    expect(screen.queryByText('Bad apple')).not.toBeInTheDocument();
  });

  it('点击语言 chip 过滤', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByLabelText('筛选语言: 日语'));
    expect(screen.getByText('Bad apple')).toBeInTheDocument();
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
  });

  it('仅 SC 开关过滤礼物曲', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByTestId('sc-toggle'));
    expect(screen.getByText('付费歌')).toBeInTheDocument();
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
  });

  it('点击列头按歌名（预计算拼音）排序', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByRole('button', { name: /歌名/ }));
    const rows = screen.getAllByTestId('song-row');
    // 按 titlePinyin 升序：badapple < dayu < feifeige → Bad apple 在首位
    expect(rows[0]).toHaveTextContent('Bad apple');
  });

  it('再次点击同一列头翻转为降序', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    const head = screen.getByRole('button', { name: /歌名/ });
    await user.click(head); // 升序：Bad apple 在首位
    await user.click(head); // 降序：Bad apple 移到末尾
    const rows = screen.getAllByTestId('song-row');
    expect(rows[rows.length - 1]).toHaveTextContent('Bad apple');
  });

  it('第三次点击同一列头回到默认排序', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    const head = screen.getByRole('button', { name: /歌名/ });
    await user.click(head); // 升序
    await user.click(head); // 降序
    await user.click(head); // 默认 → 回到原始顺序
    const rows = screen.getAllByTestId('song-row');
    expect(rows[0]).toHaveTextContent('大鱼'); // 原始顺序首位
    expect(head).not.toHaveClass('is-active'); // 无激活箭头
  });

  it('再次点击已选语言 chip 取消选择', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    const chip = screen.getByLabelText('筛选语言: 日语');
    await user.click(chip);
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
    await user.click(chip); // 取消
    expect(screen.getByText('大鱼')).toBeInTheDocument();
  });

  it('点击行触发复制（toast 成功反馈）', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByRole('button', { name: '点歌 大鱼' }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('已复制: 大鱼', expect.any(Object));
    });
  });

  it('随机按钮从结果中复制一首', async () => {
    const user = userEvent.setup();
    render(<SongList songs={songs} />);
    await user.click(screen.getByTestId('random-button'));
    const expected = songs.map((s) => `已复制: ${s.title}`);
    await waitFor(() => {
      const calls = (toast.success as any).mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((t) => expected.includes(t))).toBe(true);
    });
  });

  it('结果为空时随机按钮禁用', () => {
    render(<SongList songs={[]} />);
    expect(screen.getByTestId('random-button')).toBeDisabled();
  });
});
