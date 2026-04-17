import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useVirtualizer } from "./hooks";
import type { VirtualItem } from "./hooks/use-virtualizer";

export interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  estimatedItemHeight?: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  overscan?: number;
  initialAnchor?: 'start' | 'end';
  className?: string;
}

export interface VirtualListHandle {
  scrollToItem: (key: string | number, behavior?: ScrollBehavior) => void;
}

interface VirtualItemWrapperProps {
  vItem: VirtualItem;
  totalCount: number;
  measureItem: (index: number, node: HTMLElement | null) => void;
  children: React.ReactNode;
}

function VirtualItemWrapper({
  vItem,
  totalCount,
  measureItem,
  children,
}: VirtualItemWrapperProps) {
  const refCallback = useCallback(
    (node: HTMLElement | null) => {
      measureItem(vItem.index, node);
    },
    [measureItem, vItem.index],
  );

  return (
    <div
      ref={refCallback}
      data-virtual-index={vItem.index}
      role="listitem"
      aria-setsize={totalCount}
      aria-posinset={vItem.index + 1}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${vItem.offsetTop}px)`,
      }}
    >
      {children}
    </div>
  );
}

function VirtualListInner<T>(
  {
    items,
    renderItem,
    getItemKey,
    estimatedItemHeight = 120,
    scrollContainerRef,
    overscan = 5,
    initialAnchor,
    className,
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>,
) {
  const getItemKeyByIndex = useCallback(
    (index: number) => {
      const item = items[index];
      if (item == null) {
        return `stale-${index}`;
      }
      return getItemKey(item, index);
    },
    [items, getItemKey],
  );

  const { virtualItems, totalHeight, measureItem, scrollToIndex } =
    useVirtualizer({
      count: items.length,
      estimatedItemHeight,
      scrollContainerRef,
      overscan,
      getItemKey: getItemKeyByIndex,
      initialAnchor,
    });

  const keyToIndexMap = useMemo(() => {
    const map = new Map<string | number, number>();
    for (let i = 0; i < items.length; i++) {
      map.set(getItemKey(items[i], i), i);
    }
    return map;
  }, [items, getItemKey]);

  useImperativeHandle(ref, () => ({
    scrollToItem(key: string | number, behavior?: ScrollBehavior) {
      const index = keyToIndexMap.get(key);
      if (index != null) {
        scrollToIndex(index, behavior);
      }
    },
  }), [keyToIndexMap, scrollToIndex]);

  return (
    <div
      role="list"
      className={cn("relative w-full", className)}
      style={{ height: totalHeight }}
    >
      {virtualItems.map((vItem) => {
        const item = items[vItem.index];
        if (item == null) {
          return null;
        }
        return (
          <VirtualItemWrapper
            key={vItem.key}
            vItem={vItem}
            totalCount={items.length}
            measureItem={measureItem}
          >
            {renderItem(item, vItem.index)}
          </VirtualItemWrapper>
        );
      })}
    </div>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> },
) => React.ReactNode;
