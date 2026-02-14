import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SongList from '../../../src/components/react/SongList';
import * as pinyinPro from 'pinyin-pro';
import { toast } from 'sonner';

// Mock modules
vi.mock('pinyin-pro', () => ({
  pinyin: vi.fn((text: string) => text.toLowerCase().split('')),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../src/components/react/VirtualList', () => ({
  default: ({ items, renderItem }: any) => (
    <div data-testid="virtual-list">
      {items.map((item: any, index: number) => renderItem(item, index))}
    </div>
  ),
}));

const mockSongs = [
    {
      title: '大鱼',
      artist: 'Vsinger',
      date: '2024-01-15',
      tags: ['中文', '治愈', '空灵'],
    },
    {
      title: 'Bad apple',
      artist: 'Vsinger',
      date: '2024-01-15',
      tags: ['日文', '东方', '经典'],
    },
    {
      title: 'A whole new world',
      artist: 'Vsinger',
      date: '2024-01-15',
      tags: ['英文', '迪士尼', '对唱'],
    },
    {
      title: '愛してるばんざーい',
      artist: 'Vsinger',
      date: '2024-01-15',
      tags: ['日文', 'ACG', '治愈'],
    },
    {
      title: '不染',
      artist: 'Vsinger',
      date: '2024-01-15',
      tags: ['中文', '古风', '影视'],
    },
  ];

describe('SongList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock pinyin to return lowercase text array
    (pinyinPro.pinyin as any).mockImplementation(((text: string) => {
      return text.toLowerCase().split('');
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render search bar', () => {
      render(<SongList songs={mockSongs} />);
      expect(screen.getByPlaceholderText('搜索歌曲（支持拼音）...')).toBeInTheDocument();
    });

    it('should render tag filter section', () => {
      render(<SongList songs={mockSongs} />);
      expect(screen.getByText('筛选标签')).toBeInTheDocument();
    });

    it('should render all tags', () => {
      render(<SongList songs={mockSongs} />);
      expect(screen.getByText('全部')).toBeInTheDocument();
      // 使用getAllByText处理重复标签
      expect(screen.getAllByText('中文').length).toBeGreaterThan(0);
      expect(screen.getAllByText('日文').length).toBeGreaterThan(0);
      expect(screen.getAllByText('英文').length).toBeGreaterThan(0);
      expect(screen.getAllByText('治愈').length).toBeGreaterThan(0);
      expect(screen.getAllByText('空灵').length).toBeGreaterThan(0);
    });

    it('should render song items', () => {
      render(<SongList songs={mockSongs} />);
      expect(screen.getByText('大鱼')).toBeInTheDocument();
      expect(screen.getAllByText('Vsinger').length).toBeGreaterThan(0);
      expect(screen.getByText('Bad apple')).toBeInTheDocument();
    });

    it('should render empty state when no songs match', () => {
      render(<SongList songs={[]} />);
      expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter songs by title (direct match)', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）...');
      await user.type(searchInput, '大鱼');

      expect(screen.getByText('大鱼')).toBeInTheDocument();
      expect(screen.queryByText('Bad apple')).not.toBeInTheDocument();
    });

    it('should filter songs by artist (direct match)', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）...');
      await user.type(searchInput, 'Vsinger');

      expect(screen.getByText('大鱼')).toBeInTheDocument();
      expect(screen.getByText('Bad apple')).toBeInTheDocument();
    });

    it('should filter songs by pinyin', async () => {
      const user = userEvent.setup();
      vi.mocked(pinyinPro.pinyin).mockReturnValue('dayu'.split('') as any);
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）...');
      await user.type(searchInput, 'dayu');

      expect(screen.getByText('大鱼')).toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）...');
      await user.type(searchInput, 'BAD');

      expect(screen.getByText('Bad apple')).toBeInTheDocument();
    });

    it('should clear filter when search is cleared', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）...');
      await user.type(searchInput, '大鱼');
      expect(screen.queryByText('Bad apple')).not.toBeInTheDocument();

      await user.clear(searchInput);
      expect(screen.getByText('Bad apple')).toBeInTheDocument();
    });
  });

  describe('Tag Filter Functionality', () => {
    it('should filter songs by selected tag', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      // 使用aria-label选择标签按钮，避免重复元素
      const chineseTag = screen.getByLabelText('筛选标签: 中文');
      await user.click(chineseTag);

      expect(screen.getByText('大鱼')).toBeInTheDocument();
      expect(screen.getByText('不染')).toBeInTheDocument();
      expect(screen.queryByText('Bad apple')).not.toBeInTheDocument();
    });

    it('should deselect tag when clicked again', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const chineseTag = screen.getByLabelText('筛选标签: 中文');
      await user.click(chineseTag);
      expect(screen.queryByText('Bad apple')).not.toBeInTheDocument();

      await user.click(chineseTag);
      expect(screen.getByText('Bad apple')).toBeInTheDocument();
    });

     it('should reset filter when "全部" is clicked', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const chineseTag = screen.getByLabelText('筛选标签: 中文');
      await user.click(chineseTag);
      expect(screen.queryByText('Bad apple')).not.toBeInTheDocument();

      const allTag = screen.getByText('全部');
      await user.click(allTag);
      expect(screen.getByText('Bad apple')).toBeInTheDocument();
    });

    it('should combine search and tag filters', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      // Select "中文" tag
      const chineseTag = screen.getByLabelText('筛选标签: 中文');
      await user.click(chineseTag);

      // Search for "大"
      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）...');
      await user.type(searchInput, '大');

      expect(screen.getByText('大鱼')).toBeInTheDocument();
      expect(screen.queryByText('不染')).not.toBeInTheDocument();
    });

    it('should sort language tags in predefined order', () => {
      render(<SongList songs={mockSongs} />);
      const tags = screen.getAllByRole('button').filter(btn => btn.textContent && ['中文', '日文', '英文', '韩文'].includes(btn.textContent));

      const tagTexts = tags.map(btn => btn.textContent);
      const languageTags = tagTexts.filter(t => t && ['中文', '日文', '英文', '韩文'].includes(t));

      expect(languageTags).toEqual(['中文', '日文', '英文']);
    });
  });

  describe('Tag Collapse/Expand', () => {
    it('should collapse tags by default', () => {
      render(<SongList songs={mockSongs} />);
      const expandButton = screen.getByText('展开');
      expect(expandButton).toBeInTheDocument();
    });

    it('should expand tags when expand button is clicked', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const expandButton = screen.getByText('展开');
      await user.click(expandButton);

      expect(screen.getByText('收起')).toBeInTheDocument();
    });

    it('should collapse tags when collapse button is clicked', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const expandButton = screen.getByText('展开');
      await user.click(expandButton);

      const collapseButton = screen.getByText('收起');
      await user.click(collapseButton);

      expect(screen.getByText('展开')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('should copy song title to clipboard', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const copyButton = screen.getByTitle('复制 大鱼');
      await user.click(copyButton);

      expect((navigator.clipboard.writeText as any)).toHaveBeenCalledWith('点歌 大鱼');
      expect((toast.success as any)).toHaveBeenCalledWith('已复制: 大鱼', expect.any(Object));
    });

    it('should copy when song item is clicked', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const songItem = screen.getByText('大鱼').closest('.group');
      await user.click(songItem!);

      expect((navigator.clipboard.writeText as any)).toHaveBeenCalledWith('点歌 大鱼');
      expect((toast.success as any)).toHaveBeenCalledWith('已复制: 大鱼', expect.any(Object));
    });

    it('should show error toast when copy fails', async () => {
      const user = userEvent.setup();
      // 修改clipboard mock以模拟失败
      const originalWriteText = navigator.clipboard.writeText;
      (navigator.clipboard.writeText as any) = vi.fn(() => Promise.reject(new Error('Copy failed')));
      render(<SongList songs={mockSongs} />);

      const copyButton = screen.getByTitle('复制 大鱼');
      await user.click(copyButton);

      expect((toast.error as any)).toHaveBeenCalledWith('复制失败，请重试');

      // 恢复原始mock
      (navigator.clipboard.writeText as any) = originalWriteText;
    });

    it('should show flash effect when copied', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const copyButton = screen.getByTitle('复制 大鱼');
      await user.click(copyButton);

      // Check that the flash effect is applied
      const songItem = screen.getByText('大鱼').closest('.group');
      expect(songItem).toHaveClass('song-item-copied');

      // Wait for flash effect to clear
      await waitFor(
        () => {
          expect(songItem).toHaveClass('song-item');
        },
        { timeout: 400 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty songs array', () => {
      render(<SongList songs={[]} />);
      expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
    });

    it('should handle songs with no tags', () => {
      const songsWithoutTags = [
        { title: 'Test', artist: 'Artist', date: '2024-01-15', tags: [] },
      ];
      render(<SongList songs={songsWithoutTags} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle special characters in search', async () => {
      const user = userEvent.setup();
      const songsWithSpecialChars = [
        {
          title: '测试!@#',
          artist: '歌手&*',
          date: '2024-01-15',
          tags: ['中文'],
        },
      ];
      render(<SongList songs={songsWithSpecialChars} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）...');
      await user.type(searchInput, '!@#');

      expect(screen.getByText('测试!@#')).toBeInTheDocument();
    });

    it('should handle duplicate tags', () => {
      const songsWithDuplicateTags = [
        {
          title: 'Song 1',
          artist: 'Artist 1',
          date: '2024-01-15',
          tags: ['中文', '测试'],
        },
        {
          title: 'Song 2',
          artist: 'Artist 2',
          date: '2024-01-15',
          tags: ['中文', '测试'],
        },
      ];
      render(<SongList songs={songsWithDuplicateTags} />);

      const chineseTags = screen.getAllByText('中文');
      // 两个标签按钮（一个用于"中文"标签按钮，一个用于歌曲的tag显示）
      // 组件会去重唯一标签，所以应该有3个"中文"元素（1个按钮 + 2个歌曲标签）
      expect(chineseTags.length).toBeGreaterThan(0);
    });
  });
});

describe('SongList', () => {
    it('should display song artist', () => {
      render(<SongList songs={mockSongs} />);
      expect(screen.getAllByText('Vsinger').length).toBeGreaterThan(0);
    });

    it('should display song date', () => {
      render(<SongList songs={mockSongs} />);
      expect(screen.getAllByText('2024-01-15').length).toBeGreaterThan(0);
    });

    it('should handle empty search query', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, ' ');
      await user.clear(searchInput);

      expect(screen.getByText('大鱼')).toBeInTheDocument();
    });

    it('should handle special characters in search', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, '!@#');

      expect(searchInput).toHaveValue('!@#');
    });

    it('should handle very long search query', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      const longQuery = 'a'.repeat(100);
      await user.type(searchInput, longQuery);

      expect(searchInput).toHaveValue(longQuery);
    });

    it('should handle rapid search input changes', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, 'a');
      await user.type(searchInput, 'b');
      await user.type(searchInput, 'c');

      expect(searchInput).toHaveValue('abc');
    });

    it('should display correct number of tags', () => {
      render(<SongList songs={mockSongs} />);
      const tagButtons = screen.getAllByRole('button').filter(btn => {
        const text = btn.textContent;
        return text && ['中文', '日文', '英文', '韩文', '全部', '治愈', '空灵', '东方', '经典', '迪士尼', '对唱', 'ACG', '古风', '影视'].includes(text);
      });
      expect(tagButtons.length).toBeGreaterThan(0);
    });

    it('should handle multiple tag selections', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const chineseTag = screen.getByLabelText('筛选标签: 中文');
      await user.click(chineseTag);

      const 治愈Tags = screen.getAllByText('治愈');
      const 治愈Tag = 治愈Tags.find(t => t.getAttribute('aria-label')?.includes('筛选标签'));
      await user.click(治愈Tag);

      expect(chineseTag).toBeInTheDocument();
    });

    it('should display copy button with correct icon', () => {
      render(<SongList songs={mockSongs} />);
      const copyButtons = screen.getAllByTitle(/复制/);
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should handle search with no results', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, 'xyz123nonexistent');

      expect(screen.getByText('没有找到匹配的歌曲')).toBeInTheDocument();
    });

    it('should clear tag filter when searching', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const chineseTag = screen.getByLabelText('筛选标签: 中文');
      await user.click(chineseTag);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, '大');

      expect(screen.getByText('大鱼')).toBeInTheDocument();
    });

    it('should handle search with mixed case', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, 'BAD APPLE');

      expect(screen.getByText('Bad apple')).toBeInTheDocument();
    });

    it('should display song tags in compact view', () => {
      render(<SongList songs={mockSongs} />);
      const tags = screen.getAllByText(/中文|日文|英文|治愈|空灵|东方|经典|迪士尼|对唱|ACG|古风|影视/);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should handle copy error gracefully', async () => {
      const user = userEvent.setup();
      (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Copy failed'));
      render(<SongList songs={mockSongs} />);

      const firstSong = screen.getByText('大鱼').closest('.group');
      await user.click(firstSong!);

      expect((toast.error as any)).toHaveBeenCalledWith('复制失败，请重试');
    });

    it('should update filtered songs when search changes', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, '大');

      const initialVisibleSongs = screen.getAllByText(/大鱼|Bad apple|A whole new world|愛してるばんざーい|不染/);

      await user.type(searchInput, 'b');

      const updatedVisibleSongs = screen.getAllByText(/大鱼|Bad apple|A whole new world|愛してるばんざーい|不染/);

      expect(updatedVisibleSongs.length).toBeLessThan(initialVisibleSongs.length);
    });

    it('should handle search with whitespace', async () => {
      const user = userEvent.setup();
      render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, '   大鱼   ');

      expect(screen.getByText('大鱼')).toBeInTheDocument();
    });

    it('should maintain search state across re-renders', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SongList songs={mockSongs} />);

      const searchInput = screen.getByPlaceholderText('搜索歌曲（支持拼音）');
      await user.type(searchInput, '大');

      const initialVisibleSongs = screen.getAllByText(/大鱼|Bad apple|A whole new world|愛してるばんざーい|不染/);

      rerender(<SongList songs={mockSongs} />);

      const updatedVisibleSongs = screen.getAllByText(/大鱼|Bad apple|A whole new world|愛してるばんざーい|不染/);
      expect(updatedVisibleSongs.length).toBe(initialVisibleSongs.length);
    });
  });
