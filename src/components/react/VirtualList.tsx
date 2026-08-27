import { useRef, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  scrollToIndex?: number | null;
  onScrollToHandled?: () => void;
}

// P2-3（content-visibility 迁移）：原实现是 JS 虚拟化——每帧滚动 setScrollTop
// 触发全列表重渲染。427 行 × 52px 对浏览器原生能力是小场面，故改为全量渲染，
// 离屏行的布局/绘制由 .cv-row 的 content-visibility:auto 跳过（样式在 global.css）。
// 组件名 / props / data-testid 保持不变：调用方（SongTable）与 e2e 选择器无感，
// 回退本改动只需 git revert 整个提交。
export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  scrollToIndex,
  onScrollToHandled,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 受控滚动：外部传入 scrollToIndex 时定位并回调。
  // 全量渲染下每行高度即 itemHeight，scrollHeight === items.length * itemHeight，定位无需窗口计算。
  useEffect(() => {
    if (scrollToIndex == null || items.length === 0 || !containerRef.current) return;
    const target = Math.max(0, Math.min(scrollToIndex, items.length - 1)) * itemHeight;
    containerRef.current.scrollTop = target;
    onScrollToHandled?.();
  }, [scrollToIndex, itemHeight, items.length, onScrollToHandled]);

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      data-testid="virtual-list"
      data-total-items={items.length}
    >
      <ul role="list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, index) => (
          <li key={index} className="cv-row" style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
    </div>
  );
}
