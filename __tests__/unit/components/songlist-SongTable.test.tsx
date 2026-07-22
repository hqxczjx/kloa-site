import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongTable from '../../../src/components/react/songlist/SongTable';
import type { Song, SortState } from '../../../src/components/react/songlist/types';

vi.mock('../../../src/components/react/VirtualList', () => ({
  default: ({ items, renderItem }: any) => (
    <div data-testid="virtual-list" data-total-items={items.length}>
      {items.map((it: any, i: number) => renderItem(it, i))}
    </div>
  ),
}));

const songs: Song[] = [
  { title: '晴天', artist: '周杰伦', languages: ['国语'], genres: ['流行'], gifts: [] },
  { title: 'Lemon', artist: '米津玄師', languages: ['日语'], genres: ['流行'], gifts: [] },
];
const sort: SortState = { key: 'default', dir: 'asc' };
const base = { query: '', sort, onCopy: vi.fn(), copiedId: null, scrollToIndex: null, onScrollToHandled: vi.fn() };

describe('SongTable', () => {
  it('渲染表头四列', () => {
    render(<SongTable songs={songs} {...base} onSortChange={vi.fn()} />);
    expect(screen.getByRole('columnheader', { name: /歌名/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /歌手/ })).toBeInTheDocument();
  });

  it('渲染每行为 song-row', () => {
    render(<SongTable songs={songs} {...base} onSortChange={vi.fn()} />);
    expect(screen.getAllByTestId('song-row')).toHaveLength(2);
  });

  it('点击歌名列头调用 onSortChange("title")', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<SongTable songs={songs} {...base} onSortChange={onSortChange} />);
    await user.click(screen.getByRole('columnheader', { name: /歌名/ }));
    expect(onSortChange).toHaveBeenCalledWith('title');
  });

  it('当前排序列头有 is-active 与方向箭头', () => {
    render(<SongTable songs={songs} query="" sort={{ key: 'title', dir: 'desc' }} onSortChange={vi.fn()} onCopy={vi.fn()} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    const h = screen.getByRole('columnheader', { name: /歌名/ });
    expect(h).toHaveClass('is-active');
    expect(h).toHaveTextContent('▼');
  });

  it('空结果显示空状态', () => {
    render(<SongTable songs={[]} {...base} onSortChange={vi.fn()} />);
    expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
    expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
  });

  it('点击行调用 onCopy', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<SongTable songs={songs} {...base} onSortChange={vi.fn()} onCopy={onCopy} />);
    await user.click(screen.getByText('晴天'));
    expect(onCopy).toHaveBeenCalledWith(songs[0]);
  });
});
