import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongRow from '../../../../src/components/react/songlist/SongRow';
import type { Song } from '../../../../src/components/react/songlist/types';

const song: Song = {
  title: '晴天', artist: '周杰伦', languages: ['国语'], genres: ['流行', '抒情'], gifts: [],
};
const scSong: Song = {
  title: '紅蓮華', artist: 'LiSA', languages: ['日语'], genres: ['摇滚'], gifts: ['100 SC'],
};

const renderRow = (over: Partial<Parameters<typeof SongRow>[0]> = {}) =>
  render(<SongRow song={song} query="" variant="row" copied={false} onCopy={vi.fn()} {...over} />);

describe('SongRow', () => {
  it('行变体渲染列对齐网格', () => {
    renderRow();
    expect(document.querySelector('.song-row-grid')).toBeInTheDocument();
    expect(screen.getByText('晴天')).toBeInTheDocument();
    expect(screen.getByText('周杰伦')).toBeInTheDocument();
    expect(screen.getByText('流行')).toBeInTheDocument();
  });

  it('点击行触发 onCopy', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<SongRow song={song} query="" variant="row" copied={false} onCopy={onCopy} />);
    await user.click(screen.getByText('晴天'));
    expect(onCopy).toHaveBeenCalledWith(song);
  });

  it('SC 曲渲染 ScBadge 且行有 is-sc 类', () => {
    const { container } = render(
      <SongRow song={scSong} query="" variant="row" copied={false} onCopy={vi.fn()} />,
    );
    expect(screen.getByText('100 SC')).toBeInTheDocument();
    expect(container.querySelector('.song-row')).toHaveClass('is-sc');
  });

  it('多流派显示全部流派文字（不折叠为 +N）', () => {
    renderRow();
    expect(screen.getByText('流行')).toBeInTheDocument();
    expect(screen.getByText('抒情')).toBeInTheDocument();
    expect(screen.queryByText('+1')).not.toBeInTheDocument();
  });

  it('无语言时语言格仍占位，保持 5 列对齐', () => {
    const { container } = render(
      <SongRow song={{ ...song, languages: [] }} query="" variant="row" copied={false} onCopy={vi.fn()} />,
    );
    const grid = container.querySelector('.song-row-grid') as HTMLElement;
    expect(grid.children.length).toBe(5); // 语言(占位)/歌名/歌手/流派/SC
  });

  it('copied 时行有 is-copied 类', () => {
    const { container } = render(
      <SongRow song={song} query="" variant="row" copied={true} onCopy={vi.fn()} />,
    );
    expect(container.querySelector('.song-row')).toHaveClass('is-copied');
  });

  it('搜索高亮：命中片段包 mark', () => {
    render(<SongRow song={song} query="晴" variant="row" copied={false} onCopy={vi.fn()} />);
    expect(document.querySelector('mark')).toHaveTextContent('晴');
  });

  it('卡片变体渲染 song-card', () => {
    render(<SongRow song={song} query="" variant="card" copied={false} onCopy={vi.fn()} />);
    expect(document.querySelector('.song-card')).toBeInTheDocument();
    expect(document.querySelector('.song-row-grid')).not.toBeInTheDocument();
  });

  it('键盘 Enter 触发 onCopy', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const { container } = render(<SongRow song={song} query="" variant="row" copied={false} onCopy={onCopy} />);
    const row = container.querySelector('[data-testid="song-row"]') as HTMLElement;
    row.focus();
    await user.keyboard('{Enter}');
    expect(onCopy).toHaveBeenCalledWith(song);
  });

  it('键盘 Space 触发 onCopy', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const { container } = render(<SongRow song={song} query="" variant="row" copied={false} onCopy={onCopy} />);
    const row = container.querySelector('[data-testid="song-row"]') as HTMLElement;
    row.focus();
    await user.keyboard(' ');
    expect(onCopy).toHaveBeenCalledWith(song);
  });

  it('按 Tab 或字母键不触发 onCopy（SongRow.tsx L37 守卫 false 侧）', () => {
    const onCopy = vi.fn();
    const { container } = render(<SongRow song={song} query="" variant="row" copied={false} onCopy={onCopy} />);
    const row = container.querySelector('[data-testid="song-row"]') as HTMLElement;
    fireEvent.keyDown(row, { key: 'Tab' });
    fireEvent.keyDown(row, { key: 'a' });
    expect(onCopy).not.toHaveBeenCalled();
  });

  it('card 变体无 SC 曲不渲染 sc-badge（SongRow.tsx L56 false 侧）', () => {
    render(<SongRow song={song} query="" variant="card" copied={false} onCopy={vi.fn()} />);
    expect(document.querySelector('.sc-badge')).not.toBeInTheDocument();
  });
});
