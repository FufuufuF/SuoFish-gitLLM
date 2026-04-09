import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import { useVirtualizer } from "./hooks";
import type { VirtualItem } from "./hooks/use-virtualizer";

// ===== 类型定义 =====

export interface VirtualListProps<T> {
  /** 完整的已加载数据列表 */
  items: T[];
  /** 渲染单个列表项 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 从 item 中提取唯一 key */
  getItemKey: (item: T, index: number) => string | number;
  /** 预估单个 item 的高度（px），用于初始化 position cache。默认 120 */
  estimatedItemHeight?: number;
  /** 外部滚动容器的 ref（VirtualList 自身不创建滚动容器） */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** 可视区域上下各额外渲染的 item 数量。默认 5 */
  overscan?: number;
  /** 初始锚定位置：'start' 渲染顶部（默认）；'end' 自动滚动到底部 */
  initialAnchor?: 'start' | 'end';
  /** Phantom 容器自定义样式 */
  sx?: SxProps<Theme>;
}

export interface VirtualListHandle {
  /** 滚动到指定 item（按 key 查找） */
  scrollToItem: (key: string | number, behavior?: ScrollBehavior) => void;
}

// ===== 单个虚拟 item 的测量包裹容器 =====

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
  // ref callback：挂载时注册测量，卸载时取消
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

// ===== VirtualList 组件 =====

function VirtualListInner<T>(
  {
    items,
    renderItem,
    getItemKey,
    estimatedItemHeight = 120,
    scrollContainerRef,
    overscan = 5,
    initialAnchor,
    sx,
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>,
) {
  // 包装 getItemKey：从 index 映射到 item key
  const getItemKeyByIndex = useCallback(
    (index: number) => getItemKey(items[index], index),
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

  // 构建 key → index 映射（用于 scrollToItem）
  const keyToIndexMap = useMemo(() => {
    const map = new Map<string | number, number>();
    for (let i = 0; i < items.length; i++) {
      map.set(getItemKey(items[i], i), i);
    }
    return map;
  }, [items, getItemKey]);

  // 暴露命令式 API
  useImperativeHandle(ref, () => ({
    scrollToItem(key: string | number, behavior?: ScrollBehavior) {
      const index = keyToIndexMap.get(key);
      if (index != null) {
        scrollToIndex(index, behavior);
      }
    },
  }), [keyToIndexMap, scrollToIndex]);
  return (
    <Box
      role="list"
      sx={{
        position: "relative",
        width: "100%",
        height: totalHeight,
        ...sx as object,
      }}
    >
      {virtualItems.map((vItem) => {
        return (
        <VirtualItemWrapper
          key={vItem.key}
          vItem={vItem}
          totalCount={items.length}
          measureItem={measureItem}
        >
          {renderItem(items[vItem.index], vItem.index)}
        </VirtualItemWrapper>
      )
      })}
    </Box>
  );
}

// forwardRef 包裹，保留泛型支持
export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> },
) => React.ReactNode;
