import { useState, useCallback, useRef, useEffect } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";

// ===== 类型定义 =====

/** fetchMore 的返回类型，只包含分页元数据 */
export interface LoadMoreResult {
  nextCursor?: string;
  hasMore: boolean;
}

export interface InfiniteScrollListProps<T> {
  /** 外部传入的列表数据（来自 Store） */
  items: T[];
  /** 加载更多回调，由 Hook 层提供。负责获取数据并写入 Store，仅返回分页元数据 */
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  /** 渲染单个列表项 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 渲染加载中状态（初始加载 + 加载更多） */
  renderLoading?: () => React.ReactNode;
  /** 渲染空状态 */
  renderEmpty?: () => React.ReactNode;
  /** 容器自定义样式 */
  sx?: SxProps<Theme>;
}

// ===== 组件实现 =====

export function InfiniteScrollList<T>({
  items,
  fetchMore,
  renderItem,
  renderLoading,
  renderEmpty,
  sx,
}: InfiniteScrollListProps<T>) {
  // ----- 分页状态（内部管理） -----
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // ----- Refs -----
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchMoreRef = useRef(fetchMore);

  // 保持 fetchMore ref 最新，避免 useCallback/useEffect 依赖问题
  useEffect(() => {
    fetchMoreRef.current = fetchMore;
  }, [fetchMore]);

  // ----- 加载更多 -----
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchMoreRef.current(cursor);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("InfiniteScrollList: failed to load more", error);
    } finally {
      setIsLoadingMore(false);
      setIsInitialLoading(false);
    }
  }, [cursor, hasMore, isLoadingMore]);

  // ----- 初始加载 -----
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- IntersectionObserver 触底检测 -----
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ----- 渲染 -----

  // 初始加载状态
  if (isInitialLoading) {
    return (
      <Box sx={{ height: "100%", ...sx }}>{renderLoading?.() ?? null}</Box>
    );
  }

  // 空状态
  if (items.length === 0 && !hasMore) {
    return <Box sx={{ height: "100%", ...sx }}>{renderEmpty?.() ?? null}</Box>;
  }

  return (
    <Box
      sx={{
        overflowY: "auto",
        height: "100%",
        ...sx,
      }}
    >
      {items.map((item, index) => renderItem(item, index))}

      {/* 哨兵元素：当滚动到此处时触发加载更多 */}
      {hasMore && (
        <Box ref={sentinelRef} sx={{ minHeight: 1 }}>
          {isLoadingMore && (renderLoading?.() ?? null)}
        </Box>
      )}
    </Box>
  );
}
