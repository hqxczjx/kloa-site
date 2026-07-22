import { describe, it, expect, vi } from 'vitest';
import { Fragment } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongTable from '../../../src/components/react/songlist/SongTable';
import type { Song, SortState } from '../../../src/components/react/songlist/types';

vi.mock('../../../src/components/react/VirtualList', () => ({
  default: ({ items, renderItem }: any) => (
    <div data-testid="virtual-list" data-total-items={items.length}>
      {items.map((it: any, i: number) => (
        <Fragment key={i}>{renderItem(it, i)}</Fragment>
      ))}
    </div>
  ),
}));

const songs: Song[] = [
  { title: '晴天', artist: '周杰伦', languages: ['国语'], genres: ['流行'], gifts: [] },
  { title: 'Lemon', artist: '米津玄師', languages: ['日语'], genres: ['流行'], gifts: [] },
];
const sort: SortState = { key: 'default', dir: 'asc' };
const full = { query: '', sort, onCopy: vi.fn(), copiedId: null, scrollToIndex: null, onScrollToHandled: vi.fn() };

describe('SongTable', () => {
  it('渲染可排序表头按钮', () => {
    render(<SongTable songs={songs} {...full} onSortChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /歌名/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /歌手/ })).toBeInTheDocument();
  });

  it('SC 列为非按钮标签', () => {
    render(<SongTable songs={songs} {...full} onSortChange={vi.fn()} />);
    const sc = screen.getByText('SC');
    expect(sc.tagName).not.toBe('BUTTON');
  });

  it('渲染每行为 song-row', () => {
    render(<SongTable songs={songs} {...full} onSortChange={vi.fn()} />);
    expect(screen.getAllByTestId('song-row')).toHaveLength(2);
  });

  it('点击歌名列头调用 onSortChange("title")', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<SongTable songs={songs} {...full} onSortChange={onSortChange} />);
    await user.click(screen.getByRole('button', { name: /歌名/ }));
    expect(onSortChange).toHaveBeenCalledWith('title');
  });

  it('当前降序列头 is-active 且显示 ▼', () => {
    render(<SongTable songs={songs} query="" sort={{ key: 'title', dir: 'desc' }} onSortChange={vi.fn()} onCopy={vi.fn()} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    const h = screen.getByRole('button', { name: /歌名/ });
    expect(h).toHaveClass('is-active');
    expect(h).toHaveTextContent('▼');
  });

  it('当前升序列头显示 ▲', () => {
    render(<SongTable songs={songs} query="" sort={{ key: 'title', dir: 'asc' }} onSortChange={vi.fn()} onCopy={vi.fn()} copiedId={null} scrollToIndex={null} onScrollToHandled={vi.fn()} />);
    const h = screen.getByRole('button', { name: /歌名/ });
    expect(h).toHaveClass('is-active');
    expect(h).toHaveTextContent('▲');
  });

  it('空结果显示空状态且不渲染列表', () => {
    render(<SongTable songs={[]} {...full} onSortChange={vi.fn()} />);
    expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
    expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
  });

  it('点击行调用 onCopy', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<SongTable songs={songs} {...full} onSortChange={vi.fn()} onCopy={onCopy} />);
    await user.click(screen.getByText('晴天'));
    expect(onCopy).toHaveBeenCalledWith(songs[0]);
  });

  it('窄屏渲染 card 变体', () => {
    (globalThis.matchMedia as any).mockImplementation((query: string) => ({
      matches: query === '(max-width: 639px)',
      media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    render(<SongTable songs={songs} {...full} onSortChange={vi.fn()} />);
    expect(document.querySelector('.song-card')).toBeInTheDocument();
    expect(document.querySelector('.song-row-grid')).not.toBeInTheDocument();
  });
});
