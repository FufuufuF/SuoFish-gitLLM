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
  /** 初始锚定位置：'start' 渲染顶部（默认）；'end' 自动滚动到底部 */
  initialAnchor?: 'start' | 'end';
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

type ScrollAnchorMode = 'normal' | 'initial-end' | 'prepend';

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
  initialAnchor = 'start',
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

  // 追踪上一次 count，用于区分初始填充 / prepend / append
  const prevCountRef = useRef(0);
  // 当前滚动锚定模式：normal（常规）/ initial-end（首屏锚底）/ prepend（向上分页锚定）
  const anchorModeRef = useRef<ScrollAnchorMode>('normal');
  // 首屏锚底稳定性：等待总高度稳定后退出，避免首轮预估高度导致提前退出
  const initialEndStableFramesRef = useRef(0);
  const initialEndLastTotalHeightRef = useRef<number | null>(null);
  // 标记：prepend 后需要补偿的滚动位置（在高度收敛前持续绝对锚定）
  const pendingPrependRef = useRef<{
    count: number;
    savedScrollTop: number;
    stableFrames: number;
    lastFirstOldItemTop: number | null;
  } | null>(null);

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

      const diff = newCount - cache.length;

      if (diff > 0) {
        // 数量增加：判断是 prepend 还是 append
        const isPrepend =
          cache.length > 0 &&
          cache[0].key !== getItemKeyRef.current(0);

        if (isPrepend) {
          // 头部插入：新 entry 放在头部，已有 entry 的 key 右移
          // 头部插入存在问题: 只是更新了key, 但是其他信息都没有更新, 导致key和item的对应关系不正确
          const newEntries: CacheEntry[] = [];
          for (let i = 0; i < diff; i++) {
            newEntries.push({
              key: getItemKeyRef.current(i),
              height: estimatedItemHeight,
              top: 0,
              bottom: 0,
              measured: false,
            });
          }
          // 更新已有 entry 的 key（index 偏移了 diff）
          for (let i = 0; i < cache.length; i++) {
            cache[i].key = getItemKeyRef.current(i + diff);
          }
          cacheRef.current = [...newEntries, ...cache];
          cascadeUpdate(0);
          // 记录 prepend 信息：count + 补偿前的 scrollTop 快照
          // 在 auto-fill useLayoutEffect 中、Phantom 高度更新 + items 测量后，
          // 用 cache[count].top（包含已测量高度）精确计算新的 scrollTop
          pendingPrependRef.current = {
            count: diff,
            savedScrollTop: scrollContainerRef.current?.scrollTop ?? 0,
            stableFrames: 0,
            lastFirstOldItemTop: null,
          };
          anchorModeRef.current = 'prepend';
        } else {
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
        }
      } else {
        // 尾部裁剪
        cache.length = newCount;
      }
    },
    [estimatedItemHeight, cascadeUpdate, scrollContainerRef],
  );

  // count 变化时同步 cache（尾部追加 / 裁剪）
  useLayoutEffect(() => {
    const prevCount = prevCountRef.current;
    getItemKeyRef.current = getItemKey;
    syncCache(count);

    // 初始填充（cache 从 0 → count）且锚定底部：标记需要在 Phantom 高度生效后滚动
    if (prevCount === 0 && count > 0 && initialAnchor === 'end') {
      anchorModeRef.current = 'initial-end';
      initialEndStableFramesRef.current = 0;
      initialEndLastTotalHeightRef.current = null;
    }

    // 这里需要在 layout 阶段同步刷新可视窗口，保证首次锚定与 scrollTop 修正在绘制前完成。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recalculate();
    prevCountRef.current = count;
  }, [count, syncCache, recalculate, getItemKey, initialAnchor]);

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
      if (container && anchorModeRef.current === 'normal') {
        const viewportTop = container.scrollTop;
        if (entry.top < viewportTop) {
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
        if (container && anchorModeRef.current === 'normal') {
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

  // ===== 自动填充 + 滚动修复：统一在 Phantom 高度生效后处理 =====
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const { virtualItems: currentItems, totalHeight } = virtualState;
    if (!container) return;

    // ---- prepend 后的 scrollTop 持续精确锚定 ----
    // 在 prepend 区域高度收敛前持续执行绝对锚定，避免“补一次后继续下挤”。
    const pending = pendingPrependRef.current;
    if (anchorModeRef.current === 'prepend' && pending) {
      const firstOldItemTop = cacheRef.current[pending.count]?.top ?? 0;
      container.scrollTop = pending.savedScrollTop + firstOldItemTop;

      const prependStable =
        pending.lastFirstOldItemTop !== null
        && Math.abs(firstOldItemTop - pending.lastFirstOldItemTop) < 0.5;
      pending.stableFrames = prependStable ? pending.stableFrames + 1 : 0;
      pending.lastFirstOldItemTop = firstOldItemTop;

      const prependMeasured = cacheRef.current
        .slice(0, pending.count)
        .every((entry) => entry?.measured);

      // 优先等待 prepend 区域测量完成；若长期未进入测量，也在稳定若干帧后兜底退出，避免模式粘滞。
      if (
        (prependMeasured && pending.stableFrames >= 1)
        || pending.stableFrames >= 3
      ) {
        pendingPrependRef.current = null;
        anchorModeRef.current = 'normal';
      }

      // 在 prepend 锚定阶段必须同步刷新，否则会出现一帧可见跳动。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      recalculate();
      return;
    }

    // ---- 初始填充后滚动到底部 ----
    // 在可见区域测量与高度收敛前持续锚底，避免首轮预估高度导致提前退出。
    if (anchorModeRef.current === 'initial-end' && currentItems.length > 0) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop = Math.max(0, maxScroll);

      const prevTotalHeight = initialEndLastTotalHeightRef.current;
      const totalHeightStable =
        prevTotalHeight !== null
        && Math.abs(totalHeight - prevTotalHeight) < 0.5;
      initialEndStableFramesRef.current =
        totalHeightStable ? initialEndStableFramesRef.current + 1 : 0;
      initialEndLastTotalHeightRef.current = totalHeight;

      const allMeasured = currentItems.every(v => cacheRef.current[v.index]?.measured);
      // 首选“可见项测量完成后退出”；若测量信号异常缺失，也在稳定若干帧后兜底退出。
      if (
        (allMeasured && initialEndStableFramesRef.current >= 1)
        || initialEndStableFramesRef.current >= 3
      ) {
        anchorModeRef.current = 'normal';
        initialEndStableFramesRef.current = 0;
        initialEndLastTotalHeightRef.current = null;
      }

      recalculate();
      return;
    }

    // ---- 自动填充：确保渲染内容铺满视口 ----
    if (currentItems.length === 0) return;

    const lastItem = currentItems[currentItems.length - 1];
    const cache = cacheRef.current;

    const renderedBottom = lastItem.offsetTop + lastItem.height;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

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
    scrollToIndex,
  };
}