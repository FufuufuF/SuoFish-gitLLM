import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// ===== 类型定义 =====

export interface UseVirtualizerOptions {
  /** 列表项总数 */
  count: number;
  /** 预估 item 高度（px），用于初始化 position cache。默认 120 */
  estimatedItemHeight?: number;
  /** 外部滚动容器的 ref */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** 可视区域上下各额外渲染的 item 数量。默认 5 */
  overscan?: number;
  /** 从 index 提取唯一 key（用于 position cache 索引） */
  getItemKey: (index: number) => string | number;
}

export interface VirtualItem {
  /** 在 items 数组中的原始索引 */
  index: number;
  /** 该 item 的 key */
  key: string | number;
  /** 距 Phantom 容器顶部的偏移量（px） */
  offsetTop: number;
  /** 当前高度（初始为预估值，测量后为真实值） */
  height: number;
}

export interface UseVirtualizerResult {
  /** 当前需要渲染的虚拟 item 列表（包含 overscan 区域） */
  virtualItems: VirtualItem[];
  /** Phantom 容器的总高度 */
  totalHeight: number;
  /** 测量回调 —— 由 renderItem 包裹层在 DOM 挂载/变化后调用 */
  measureItem: (index: number, node: HTMLElement | null) => void;
  /** 通知 items 数组在头部插入了 count 个新项（修正 cache） */
  notifyPrepend: (count: number) => void;
  /** 滚动到指定 index */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
}

// ===== Position Cache =====

interface CacheEntry {
  key: string | number;
  height: number;
  top: number;
  bottom: number;
  measured: boolean;
}

// ===== 二分查找：找到第一个 bottom > target 的 entry =====

function findStartIndex(cache: CacheEntry[], scrollTop: number): number {
  let lo = 0;
  let hi = cache.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (cache[mid].bottom <= scrollTop) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

// ===== Hook 实现 =====

export function useVirtualizer({
  count,
  estimatedItemHeight = 120,
  scrollContainerRef,
  overscan = 5,
  getItemKey,
}: UseVirtualizerOptions): UseVirtualizerResult {
  // Position cache，与 count 同步
  const cacheRef = useRef<CacheEntry[]>([]);
  // 追踪 ResizeObserver 实例
  const observerRef = useRef<ResizeObserver | null>(null);
  // 追踪被观察的 DOM 节点：index -> element
  const observedNodesRef = useRef<Map<number, HTMLElement>>(new Map());
  // RAF 节流 ID
  const rafRef = useRef<number | null>(null);
  // virtualItems 和 totalHeight 作为 state 驱动渲染
  const [virtualState, setVirtualState] = useState<{
    virtualItems: VirtualItem[];
    totalHeight: number;
  }>({ virtualItems: [], totalHeight: 0 });

  // 保存最新的 getItemKey 到 ref，避免 stale closure
  const getItemKeyRef = useRef(getItemKey);
  useEffect(() => {
    getItemKeyRef.current = getItemKey;
  }, [getItemKey]);

  // ===== 连锁更新：从 index 处开始重算后续所有 entry 的 top/bottom =====
  const cascadeUpdate = useCallback((fromIndex: number) => {
    const cache = cacheRef.current;
    for (let i = fromIndex; i < cache.length; i++) {
      cache[i].top = i > 0 ? cache[i - 1].bottom : 0;
      cache[i].bottom = cache[i].top + cache[i].height;
    }
  }, []);

  // ===== 重新计算 virtualItems + totalHeight 并更新 state =====
  const recalculate = useCallback(() => {
    const cache = cacheRef.current;
    const container = scrollContainerRef.current;

    const totalHeight = cache.length > 0 ? cache[cache.length - 1].bottom : 0;

    if (!container || cache.length === 0) {
      setVirtualState({ virtualItems: [], totalHeight });
      return;
    }

    const scrollTop = container.scrollTop; // 当前视口距离容器顶部的距离
    const clientHeight = container.clientHeight; // 当前容器的高度

    const rawStart = findStartIndex(cache, scrollTop);
    const rawEnd = findStartIndex(cache, scrollTop + clientHeight);

    const startIndex = Math.max(0, rawStart - overscan);
    const endIndex = Math.min(cache.length - 1, rawEnd + overscan);

    const items: VirtualItem[] = [];
    if (endIndex >= startIndex) {
      for (let i = startIndex; i <= endIndex; i++) {
        const entry = cache[i];
        items.push({
          index: i,
          key: entry.key,
          offsetTop: entry.top,
          height: entry.height,
        });
      }
    }

    setVirtualState({ virtualItems: items, totalHeight });
  }, [scrollContainerRef, overscan]);

  // ===== 同步 cache 长度与 count =====
  const syncCache = useCallback(
    (newCount: number) => {
      const cache = cacheRef.current;
      if (cache.length === newCount) return;

      if (cache.length < newCount) {
        // 尾部追加
        for (let i = cache.length; i < newCount; i++) {
          const prevBottom = i > 0 ? cache[i - 1].bottom : 0;
          cache.push({
            key: getItemKeyRef.current(i),
            height: estimatedItemHeight,
            top: prevBottom,
            bottom: prevBottom + estimatedItemHeight,
            measured: false,
          });
        }
      } else {
        // 尾部裁剪
        cache.length = newCount;
      }
    },
    [estimatedItemHeight],
  );

  // count 变化时同步 cache（尾部追加 / 裁剪）
  useEffect(() => {
    syncCache(count);
    recalculate();
  }, [count, syncCache, recalculate]);

  // ===== measureItem：测量某个 index 的真实高度 =====
  const measureItem = useCallback(
    (index: number, node: HTMLElement | null) => {
      const cache = cacheRef.current;

      // 清理旧观察
      const prevNode = observedNodesRef.current.get(index);
      if (prevNode && observerRef.current) {
        observerRef.current.unobserve(prevNode);
        observedNodesRef.current.delete(index);
      }

      if (!node || index < 0 || index >= cache.length) return;

      // 观察新节点
      observedNodesRef.current.set(index, node);
      observerRef.current?.observe(node);

      // 立即测量一次
      const measuredHeight = node.getBoundingClientRect().height;
      if (measuredHeight === 0) return; // 未挂载时忽略

      const entry = cache[index];
      const diff = measuredHeight - entry.height;

      if (Math.abs(diff) < 0.5) {
        // 高度几乎无变化，仅标记已测量
        entry.measured = true;
        return;
      }

      entry.height = measuredHeight;
      entry.measured = true;
      cascadeUpdate(index);

      // 视口锚定：仅当被测量 item 位于当前视口上方时，补偿 scrollTop
      const container = scrollContainerRef.current;
      if (container) {
        const viewportTop = container.scrollTop;
        if (entry.bottom <= viewportTop + measuredHeight) {
          container.scrollTop += diff;
        }
      }

      recalculate();
    },
    [cascadeUpdate, scrollContainerRef, recalculate],
  );

  // ===== ResizeObserver：统一监听所有可见 item 的尺寸变化 =====
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const cache = cacheRef.current;
      const container = scrollContainerRef.current;
      let totalDiff = 0;
      let minChangedIndex = cache.length;
      let needsAnchorCompensation = false;
      let compensationDiff = 0;

      for (const resizeEntry of entries) {
        const el = resizeEntry.target as HTMLElement;
        const indexStr = el.dataset.virtualIndex;
        if (indexStr == null) continue;
        const index = Number(indexStr);
        if (index < 0 || index >= cache.length) continue;

        const newHeight = resizeEntry.borderBoxSize?.[0]?.blockSize
          ?? el.getBoundingClientRect().height;
        if (newHeight === 0) continue;

        const entry = cache[index];
        const diff = newHeight - entry.height;
        if (Math.abs(diff) < 0.5) continue;

        entry.height = newHeight;
        entry.measured = true;
        totalDiff += diff;

        if (index < minChangedIndex) {
          minChangedIndex = index;
        }

        // 视口锚定检查
        if (container) {
          const viewportTop = container.scrollTop;
          if (entry.top < viewportTop) {
            needsAnchorCompensation = true;
            compensationDiff += diff;
          }
        }
      }

      if (totalDiff === 0) return;

      // 从最小变化索引处开始连锁更新
      if (minChangedIndex < cache.length) {
        cascadeUpdate(minChangedIndex);
      }

      // 视口锚定补偿
      if (needsAnchorCompensation && container) {
        container.scrollTop += compensationDiff;
      }

      recalculate();
    });

    observerRef.current = observer;
    const observedNodes = observedNodesRef.current;

    return () => {
      observer.disconnect();
      observerRef.current = null;
      observedNodes.clear();
    };
  }, [scrollContainerRef, cascadeUpdate, recalculate]);

  // ===== Scroll 事件监听（RAF 节流） =====
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        recalculate();
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scrollContainerRef, recalculate]);

  // ===== notifyPrepend：向上翻页在头部插入 count 个新项 =====
  const notifyPrepend = useCallback(
    (prependCount: number) => {
      if (prependCount <= 0) return;

      const cache = cacheRef.current;

      // 在头部插入新 entry
      const newEntries: CacheEntry[] = [];
      for (let i = 0; i < prependCount; i++) {
        newEntries.push({
          key: getItemKeyRef.current(i),
          height: estimatedItemHeight,
          top: 0,
          bottom: 0,
          measured: false,
        });
      }

      // 更新已有 entry 的 key（index 偏移了 prependCount）
      for (let i = 0; i < cache.length; i++) {
        cache[i].key = getItemKeyRef.current(i + prependCount);
      }

      // 拼接：新 entry 放在头部
      cacheRef.current = [...newEntries, ...cache];

      // 从头开始重算所有位置
      cascadeUpdate(0);
      recalculate();
    },
    [estimatedItemHeight, cascadeUpdate, recalculate],
  );

  // ===== scrollToIndex =====
  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const cache = cacheRef.current;
      const container = scrollContainerRef.current;
      if (!container || index < 0 || index >= cache.length) return;

      container.scrollTo({
        top: cache[index].top,
        behavior,
      });
    },
    [scrollContainerRef],
  );

  // ===== 自动填充：确保渲染内容铺满视口 =====
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const { virtualItems: currentItems } = virtualState;
    if (!container || currentItems.length === 0) return;

    const lastItem = currentItems[currentItems.length - 1];
    const cache = cacheRef.current;

    const renderedBottom = lastItem.offsetTop + lastItem.height;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    // 如果渲染内容未填满视口且还有更多 item 可以渲染
    if (
      renderedBottom < scrollTop + clientHeight &&
      lastItem.index < cache.length - 1
    ) {
      recalculate();
    }
  }, [virtualState, scrollContainerRef, recalculate]);

  return {
    virtualItems: virtualState.virtualItems,
    totalHeight: virtualState.totalHeight,
    measureItem,
    notifyPrepend,
    scrollToIndex,
  };
}