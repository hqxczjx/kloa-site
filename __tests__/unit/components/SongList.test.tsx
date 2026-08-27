import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongList from '../../../src/components/react/SongList';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// vi.hoisted：vi.mock 工厂会被提升到文件顶部，引用的数据必须同样提升
const songs = vi.hoisted(() => [
  { title: '大鱼', artist: 'Vsinger', titlePinyin: 'dayu', artistPinyin: 'vsinger', languages: ['国语'], genres: ['治愈'], gifts: [] },
  { title: 'Bad apple', artist: 'Vsinger', titlePinyin: 'badapple', artistPinyin: 'vsinger', languages: ['日语'], genres: ['东方'], gifts: [] },
  { title: '付费歌', artist: 'A', titlePinyin: 'feifeige', artistPinyin: 'a', languages: ['国语'], genres: ['流行'], gifts: ['100 SC'] },
  // P0-2：纯 ASCII 标题/歌手省略拼音字段（undefined），运行时回退 toLowerCase()
  { title: 'Lemon', artist: 'Kenshi Yonezu', languages: ['日语'], genres: ['流行'], gifts: [] },
]);

// P0-1：SongList 不再经 props 接收数据，直接 import 生成模块——mock 它注入测试数据
vi.mock('../../../src/data/generated/songs-data', () => ({
  SONGS: songs,
}));

describe('SongList (重设计)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染搜索框与新工具栏', () => {
    render(<SongList />);
    expect(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…')).toBeInTheDocument();
    expect(screen.getByTestId('random-button')).toBeInTheDocument();
    expect(screen.getByText(/共 4 首/)).toBeInTheDocument();
  });

  it('渲染所有歌曲行', () => {
    render(<SongList />);
    expect(screen.getAllByTestId('song-row')).toHaveLength(4);
  });

  it('搜索无结果显示空状态', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.type(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…'), 'zzz不存在');
    expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
  });

  it('搜索按标题过滤', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.type(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…'), '大鱼');
    expect(screen.getByText('大鱼')).toBeInTheDocument();
    expect(screen.queryByText('Bad apple')).not.toBeInTheDocument();
  });

  it('ASCII 标题无拼音字段时搜索回退 title.toLowerCase()（P0-2）', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.type(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…'), 'lemon');
    expect(screen.getByText('Lemon')).toBeInTheDocument();
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
  });

  it('点击语言 chip 过滤', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.click(screen.getByLabelText('筛选语言: 日语'));
    expect(screen.getByText('Bad apple')).toBeInTheDocument();
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
  });

  it('仅 SC 开关过滤礼物曲', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.click(screen.getByTestId('sc-toggle'));
    expect(screen.getByText('付费歌')).toBeInTheDocument();
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
  });

  it('点击列头按歌名（预计算拼音）排序', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.click(screen.getByRole('button', { name: /歌名/ }));
    const rows = screen.getAllByTestId('song-row');
    // 按排序键升序：badapple < dayu < feifeige < lemon（Lemon 无拼音字段，回退 toLowerCase）
    expect(rows[0]).toHaveTextContent('Bad apple');
    expect(rows[rows.length - 1]).toHaveTextContent('Lemon');
  });

  it('按歌手排序对缺省拼音回退 artist.toLowerCase()（P0-2）', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.click(screen.getByRole('button', { name: /歌手/ }));
    const rows = screen.getAllByTestId('song-row');
    // 排序键：a < kenshi yonezu < vsinger → 付费歌、Lemon 在前两位
    expect(rows[0]).toHaveTextContent('付费歌');
    expect(rows[1]).toHaveTextContent('Lemon');
  });

  it('再次点击同一列头翻转为降序', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    const head = screen.getByRole('button', { name: /歌名/ });
    await user.click(head); // 升序：Bad apple 在首位
    await user.click(head); // 降序：Bad apple 移到末尾
    const rows = screen.getAllByTestId('song-row');
    expect(rows[rows.length - 1]).toHaveTextContent('Bad apple');
  });

  it('第三次点击同一列头回到默认排序', async () => {
    const user = userEvent.setup();
    render(<SongList />);
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
    render(<SongList />);
    const chip = screen.getByLabelText('筛选语言: 日语');
    await user.click(chip);
    expect(screen.queryByText('大鱼')).not.toBeInTheDocument();
    await user.click(chip); // 取消
    expect(screen.getByText('大鱼')).toBeInTheDocument();
  });

  it('点击行触发复制（toast 成功反馈）', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.click(screen.getByRole('button', { name: '点歌 大鱼' }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('已复制: 大鱼', expect.any(Object));
    });
  });

  it('复制失败时提示错误且不提示成功（SongList.tsx catch）', async () => {
    (navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('denied'),
    );
    render(<SongList />);
    fireEvent.click(screen.getByRole('button', { name: '点歌 大鱼' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('复制失败，请重试'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('快速连点两行：旧行 timer 到期不清掉新行的 copied 态（SongList.tsx）', () => {
    vi.useFakeTimers();
    try {
      render(<SongList />);
      const rowA = screen.getByRole('button', { name: '点歌 大鱼' });
      const rowB = screen.getByRole('button', { name: '点歌 Bad apple' });

      fireEvent.click(rowA);
      expect(rowA).toHaveClass('is-copied');

      act(() => {
        vi.advanceTimersByTime(100); // 100ms 内连点第二行 → B 的 timer 排在 A 之后
      });
      fireEvent.click(rowB);
      expect(rowB).toHaveClass('is-copied');

      act(() => {
        vi.advanceTimersByTime(200); // t=300：仅 A 的 timer 到期，cur=B-key ≠ A-key → 保持 B
      });
      expect(rowA).not.toHaveClass('is-copied');
      expect(rowB).toHaveClass('is-copied');

      act(() => {
        vi.advanceTimersByTime(300); // t=600：B 的 timer 到期 → 清除
      });
      expect(rowB).not.toHaveClass('is-copied');
    } finally {
      vi.useRealTimers();
    }
  });

  it('随机按钮从结果中复制一首', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.click(screen.getByTestId('random-button'));
    const expected = songs.map((s) => `已复制: ${s.title}`);
    await waitFor(() => {
      const calls = (toast.success as any).mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((t) => expected.includes(t))).toBe(true);
    });
  });

  it('结果为空时随机按钮禁用', async () => {
    const user = userEvent.setup();
    render(<SongList />);
    await user.type(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…'), 'zzz不存在');
    expect(screen.getByTestId('random-button')).toBeDisabled();
  });
});
