import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBar from '../../../src/components/react/songlist/FilterBar';

const baseProps = {
  query: '',
  onQueryChange: vi.fn(),
  languages: [
    { value: '国语', count: 192 },
    { value: '日语', count: 155 },
    { value: '英语', count: 50 },
  ],
  selectedLanguages: [],
  onToggleLanguage: vi.fn(),
  topGenres: ['流行', '影视'],
  moreGenres: ['爵士', '民谣'],
  selectedGenres: [],
  onToggleGenre: vi.fn(),
  scOnly: false,
  onToggleScOnly: vi.fn(),
};

describe('FilterBar', () => {
  it('渲染搜索框（新 placeholder）', () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…')).toBeInTheDocument();
  });

  it('渲染语言 chip 含计数', () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByLabelText('筛选语言: 国语')).toHaveTextContent('国语 192');
  });

  it('输入触发 onQueryChange', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    await user.type(screen.getByPlaceholderText('搜索歌名 / 歌手 / 拼音…'), '晴');
    expect(baseProps.onQueryChange).toHaveBeenCalledWith('晴');
  });

  it('点击语言 chip 调用 onToggleLanguage', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    await user.click(screen.getByLabelText('筛选语言: 国语'));
    expect(baseProps.onToggleLanguage).toHaveBeenCalledWith('国语');
  });

  it('选中语言 chip 有 is-active 类', () => {
    render(<FilterBar {...baseProps} selectedLanguages={['国语']} />);
    expect(screen.getByLabelText('筛选语言: 国语')).toHaveClass('is-active');
  });

  it('点击流派 chip 调用 onToggleGenre', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    await user.click(screen.getByLabelText('筛选流派: 流行'));
    expect(baseProps.onToggleGenre).toHaveBeenCalledWith('流行');
  });

  it('热门流派直出，更多流派默认隐藏，点 +N 展开后可见', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    expect(screen.getByLabelText('筛选流派: 流行')).toBeInTheDocument();
    expect(screen.queryByLabelText('筛选流派: 爵士')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /\+2 更多流派/ }));
    expect(screen.getByLabelText('筛选流派: 爵士')).toBeInTheDocument();
  });

  it('点击 SC 开关调用 onToggleScOnly', async () => {
    const user = userEvent.setup();
    render(<FilterBar {...baseProps} />);
    await user.click(screen.getByTestId('sc-toggle'));
    expect(baseProps.onToggleScOnly).toHaveBeenCalled();
  });

  it('scOnly 开启时开关 is-active', () => {
    render(<FilterBar {...baseProps} scOnly={true} />);
    expect(screen.getByTestId('sc-toggle')).toHaveClass('is-active');
  });
});
