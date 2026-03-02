import { useRef, useEffect } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import { usePaginationLoader } from "../hooks/use-pagination-loader";
import type { LoadMoreResult } from "../types";
import {
  PaginationInitialLoading,
  PaginationInlineLoading,
  PaginationRetryState,
} from "./common";

// ===== 类型定义 =====

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
  /** 渲染错误状态（点击重试） */
  renderError?: (retry: () => void, error: unknown) => React.ReactNode;
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
  renderError,
  sx,
}: InfiniteScrollListProps<T>) {
  const {
    hasMore,
    isLoading,
    isError,
    error,
    isInitialLoading,
    tryAutoLoad,
    retry,
  } = usePaginationLoader({ fetchMore });

  // ----- Refs -----
  const sentinelRef = useRef<HTMLDivElement>(null);

  const defaultError = (
    <PaginationRetryState
      isRetrying={isLoading}
      onRetry={() => {
        void retry();
      }}
    />
  );

  const defaultLoadMore = <PaginationInlineLoading />;
  const defaultInitialLoading = <PaginationInitialLoading />;

  // ----- 初始加载 -----
  useEffect(() => {
    void tryAutoLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- IntersectionObserver 触底检测 -----
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void tryAutoLoad();
        }
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tryAutoLoad]);

  // ----- 渲染 -----

  // 初始加载状态
  if (isInitialLoading) {
    return (
      <Box sx={{ height: "100%", ...sx }}>
        {renderLoading?.() ?? defaultInitialLoading}
      </Box>
    );
  }

  if (isError && items.length === 0) {
    return (
      <Box sx={{ height: "100%", ...sx }}>
        {renderError
          ? renderError(
              () => {
                void retry();
              },
              error,
            )
          : defaultError}
      </Box>
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
          {isLoading && (renderLoading?.() ?? defaultLoadMore)}
          {isError &&
            (renderError
              ? renderError(
                  () => {
                    void retry();
                  },
                  error,
                )
              : defaultError)}
        </Box>
      )}
    </Box>
  );
}
