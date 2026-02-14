import { useRef, useState, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算可见项目的起始和结束索引
  const visibleRange = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIdx = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    const offsetY = startIdx * itemHeight;
    return { startIdx, endIdx, offsetY };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 获取可见的项目
  const visibleItems = items.slice(visibleRange.startIdx, visibleRange.endIdx + 1);

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <ul
        role="list"
        style={{
          height: items.length * itemHeight,
          position: 'relative',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {visibleItems.map((item, index) => (
          <li
            key={visibleRange.startIdx + index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: itemHeight,
              transform: `translateY(${(visibleRange.startIdx + index) * itemHeight}px)`,
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {renderItem(item, visibleRange.startIdx + index)}
          </li>
        ))}
      </ul>
    </div>
  );
}
