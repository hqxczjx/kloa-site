import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VirtualList from '../../../src/components/react/VirtualList';

interface TestItem {
  id: number;
  name: string;
}

describe('VirtualList', () => {
  const mockItems: TestItem[] = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }));

  const mockRenderItem = (item: TestItem, index: number) => (
    <div data-testid={`item-${index}`}>{item.name}</div>
  );

  describe('Rendering', () => {
    it('should render container with correct height', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;
      expect(container).toHaveStyle({ height: '500px' });
    });

    it('should render initial visible items', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      // With containerHeight 500 and itemHeight 50, we should see about 10 items
      // Plus overscan of 3, so about 13-16 items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-10')).toBeInTheDocument();
    });

    it('should not render all items at once', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      // Should not render item 20 (way beyond visible area)
      expect(screen.queryByTestId('item-20')).not.toBeInTheDocument();
    });

    it('should render empty list correctly', () => {
      render(
        <VirtualList
          items={[]}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
    });

    it('should render single item list', () => {
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

  describe('Scrolling', () => {
    it('should update visible items on scroll', async () => {
      const user = userEvent.setup();
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Initial state - item 0 should be visible
      expect(screen.getByTestId('item-0')).toBeInTheDocument();

      // Scroll down
      fireEvent.scroll(container!, { target: { scrollTop: 1000 } });

      // After scrolling, item 0 should not be visible
      await waitFor(() => {
        expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      });

      // But items around scroll position should be visible
      expect(screen.getByTestId('item-20')).toBeInTheDocument();
    });

    it('should handle scroll to bottom', async () => {
      const user = userEvent.setup();
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Scroll to near bottom
      fireEvent.scroll(container!, { target: { scrollTop: 1000 } });

      await waitFor(() => {
        expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      });

      // Last items should be visible
      expect(screen.getByTestId('item-24')).toBeInTheDocument();
    });

    it('should handle scroll to top after scrolling down', async () => {
      const user = userEvent.setup();
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Scroll down
      fireEvent.scroll(container!, { target: { scrollTop: 2000 } });

      await waitFor(() => {
        expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      });

      // Scroll back to top
      fireEvent.scroll(container!, { target: { scrollTop: 0 } });

      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toBeInTheDocument();
      });
    });
  });

  describe('Overscan', () => {
    it('should use default overscan of 3', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      // With containerHeight 500 and itemHeight 50, visible range is 0-9
      // With overscan of 3, we should see items -3 to 12 (clamped to 0-99)
      // So items 0-12 should be rendered
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-12')).toBeInTheDocument();
    });

    it('should use custom overscan', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
          overscan={5}
        />
      );

      // With overscan of 5, we should see items 0-14
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-14')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small item height', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={10}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-24')).toBeInTheDocument();
    });

    it('should handle very large item height', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={200}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('item-10')).not.toBeInTheDocument();
    });

    it('should handle container height equal to item height', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={50}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('should handle items with fewer items than visible area', () => {
      const fewItems = mockItems.slice(0, 5);
      render(
        <VirtualList
          items={fewItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-4')).toBeInTheDocument();
      expect(screen.queryByTestId('item-5')).not.toBeInTheDocument();
    });

    it('should handle items exactly equal to visible area', () => {
      const exactItems = mockItems.slice(0, 10);
      render(
        <VirtualList
          items={exactItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-9')).toBeInTheDocument();
      expect(screen.queryByTestId('item-10')).not.toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('should position items correctly using transform', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const item0 = screen.getByTestId('item-0').closest('li');
      expect(item0).toHaveStyle({ transform: 'translateY(0px)' });

      const item5 = screen.getByTestId('item-5').closest('li');
      expect(item5).toHaveStyle({ transform: 'translateY(250px)' });
    });

    it('should update item positions after scroll', async () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Scroll down
      fireEvent.scroll(container!, { target: { scrollTop: 1000 } });

      await waitFor(() => {
        const item20 = screen.getByTestId('item-20').closest('li');
        expect(item20).toHaveStyle({ transform: 'translateY(1000px)' });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper list structure', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should have overflow-auto for scrollable container', () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;
      expect(container).toHaveClass('overflow-auto');
    });
  });

  describe('Additional Coverage Tests', () => {
    it('should handle very large item count', () => {
      const largeItems = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      render(
        <VirtualList
          items={largeItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('should handle very small item count', () => {
      const smallItems = [{ id: 0, name: 'Single Item' }];
      render(
        <VirtualList
          items={smallItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('should handle items exactly equal to container height', () => {
      const exactItems = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      render(
        <VirtualList
          items={exactItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-9')).toBeInTheDocument();
    });

    it('should handle odd item count', () => {
      const oddItems = Array.from({ length: 7 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      render(
        <VirtualList
          items={oddItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-6')).toBeInTheDocument();
    });

    it('should handle even item count', () => {
      const evenItems = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }));
      render(
        <VirtualList
          items={evenItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-7')).toBeInTheDocument();
    });

    it('should maintain scroll position after multiple scrolls', async () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // First scroll
      fireEvent.scroll(container!, { target: { scrollTop: 500 } });
      await waitFor(() => {
        expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      });

      // Second scroll
      fireEvent.scroll(container!, { target: { scrollTop: 1000 } });
      await waitFor(() => {
        expect(screen.getByTestId('item-20')).toBeInTheDocument();
      });
    });

    it('should handle rapid scroll events', async () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Rapid scrolls
      fireEvent.scroll(container!, { target: { scrollTop: 200 } });
      fireEvent.scroll(container!, { target: { scrollTop: 400 } });
      fireEvent.scroll(container!, { target: { scrollTop: 600 } });

      await waitFor(() => {
        expect(screen.getByTestId('item-12')).toBeInTheDocument();
      });
    });

    it('should handle scroll to exact item boundary', async () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Scroll to exact boundary (item 10)
      fireEvent.scroll(container!, { target: { scrollTop: 500 } });

      await waitFor(() => {
        const item10 = screen.getByTestId('item-10');
        expect(item10).toBeInTheDocument();
      });
    });

    it('should handle negative scroll values', async () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Scroll with negative value (should be clamped to 0)
      fireEvent.scroll(container!, { target: { scrollTop: -100 } });

      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toBeInTheDocument();
      });
    });

    it('should handle scroll beyond item count', async () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Scroll to bottom
      fireEvent.scroll(container!, { target: { scrollTop: 1000 } });

      await waitFor(() => {
        expect(screen.getByTestId('item-24')).toBeInTheDocument();
      });
    });

    it('should update visible range correctly on scroll', async () => {
      render(
        <VirtualList
          items={mockItems}
          itemHeight={50}
          containerHeight={500}
          renderItem={mockRenderItem}
        />
      );

      const container = screen.getByRole('list').parentElement;

      // Scroll to middle
      fireEvent.scroll(container!, { target: { scrollTop: 500 } });

      await waitFor(() => {
        expect(screen.queryByTestId('item-5')).not.toBeInTheDocument();
        expect(screen.getByTestId('item-12')).toBeInTheDocument();
      });
    });
  });
});
