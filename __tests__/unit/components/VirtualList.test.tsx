import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VirtualList from '../../../src/components/react/VirtualList';

interface TestItem {
  id: number;
  name: string;
}

// P2-3：VirtualList 已去 JS 虚拟化——全量渲染 + content-visibility（.cv-row）。
// 本文件断言新契约：所有行常驻 DOM（滚动零卸载/零重渲染）、行带 cv-row 类、
// scrollToIndex 定位行为保持不变。
describe('VirtualList（content-visibility 全量渲染）', () => {
  const mockItems: TestItem[] = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }));

  const mockRenderItem = (item: TestItem, index: number) => (
    <div data-testid={`item-${index}`}>{item.name}</div>
  );

  describe('Rendering', () => {
    it('渲染容器并应用固定高度', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByTestId('virtual-list');
      expect(container).toHaveStyle({ height: '500px' });
      expect(container).toHaveAttribute('data-total-items', '25');
    });

    it('全量渲染所有行，不做窗口裁剪', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      // 视口只能装 ~10 行，但首尾（及任意远端行）都应常驻 DOM
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-12')).toBeInTheDocument();
      expect(screen.getByTestId('item-24')).toBeInTheDocument();
    });

    it('空列表不渲染任何行', () => {
      render(
        <VirtualList
          items={[]}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      expect(screen.getByTestId('virtual-list')).toHaveAttribute('data-total-items', '0');
    });

    it('单行列表正常渲染', () => {
      const singleItem = [{ id: 0, name: 'Single Item' }];
      render(
        <VirtualList
          items={singleItem}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByText('Single Item')).toBeInTheDocument();
    });
  });

  describe('content-visibility 行（P2-3）', () => {
    it('每行是 li.cv-row 且高度为 itemHeight（离屏跳过由 global.css 的 .cv-row 承担）', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const rows = mockItems.map((_, i) => screen.getByTestId(`item-${i}`).closest('li'));
      expect(rows).toHaveLength(mockItems.length);
      for (const row of rows) {
        expect(row).toHaveClass('cv-row');
        expect(row).toHaveStyle({ height: '50px' });
      }
    });
  });

  describe('Scrolling', () => {
    it('滚动不卸载任何行（对比旧窗口化：离屏行仍在 DOM）', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByTestId('virtual-list');
      fireEvent.scroll(container, { target: { scrollTop: 1000 } });

      // 滚到中部后首尾行依然在文档中——content-visibility 只跳过绘制，不移除 DOM
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-12')).toBeInTheDocument();
      expect(screen.getByTestId('item-24')).toBeInTheDocument();
    });

    it('容器保留 overflow-auto 可滚动类与列表语义', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('virtual-list')).toHaveClass('overflow-auto');
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('UL');
      expect(list.querySelectorAll('li')).toHaveLength(mockItems.length);
    });
  });

  describe('VirtualList scrollToIndex', () => {
    it('设置 scrollToIndex 时滚动容器到对应位置并回调', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i);
      const onHandled = vi.fn();
      const { rerender } = render(
        <VirtualList
          items={items}
          itemHeight={50}
          containerHeight={200}
          scrollToIndex={null}
          onScrollToHandled={onHandled}
          renderItem={(n) => <div>{n}</div>}
        />
      );
      const list = screen.getByTestId('virtual-list');
      expect(list.scrollTop).toBe(0);

      rerender(
        <VirtualList
          items={items}
          itemHeight={50}
          containerHeight={200}
          scrollToIndex={10}
          onScrollToHandled={onHandled}
          renderItem={(n) => <div>{n}</div>}
        />
      );
      await waitFor(() => {
        expect(list.scrollTop).toBe(500); // 10 * 50
      });
      expect(onHandled).toHaveBeenCalled();
    });

    it('scrollToIndex 为 null 时不滚动', () => {
      render(<VirtualList items={[0, 1, 2]} itemHeight={50} containerHeight={100} scrollToIndex={null}
        renderItem={(n) => <div>{n}</div>} />
      );
      expect(screen.getByTestId('virtual-list').scrollTop).toBe(0);
    });

    it('空 items 时不滚动也不报错', () => {
      const onHandled = vi.fn();
      render(<VirtualList items={[]} itemHeight={50} containerHeight={100}
        scrollToIndex={0} onScrollToHandled={onHandled}
        renderItem={(n: number) => <div>{n}</div>} />
      );
      expect(screen.getByTestId('virtual-list').scrollTop).toBe(0);
      expect(onHandled).not.toHaveBeenCalled();
    });

    it('scrollToIndex 越界时 clamp 到有效范围', async () => {
      const items = [0, 1, 2, 3, 4];
      const onHandled = vi.fn();
      const { rerender } = render(<VirtualList items={items} itemHeight={50} containerHeight={100}
        scrollToIndex={100} onScrollToHandled={onHandled}
        renderItem={(n) => <div>{n}</div>} />
      );
      const list = screen.getByTestId('virtual-list');
      await waitFor(() => {
        // 100 越界 → clamp 到 index 4 → 4*50=200
        expect(list.scrollTop).toBe(200);
      });
      // 负数 → clamp 到 0
      rerender(<VirtualList items={items} itemHeight={50} containerHeight={100}
        scrollToIndex={-5} onScrollToHandled={onHandled}
        renderItem={(n) => <div>{n}</div>} />
      );
      await waitFor(() => {
        expect(list.scrollTop).toBe(0);
      });
    });
  });
});
