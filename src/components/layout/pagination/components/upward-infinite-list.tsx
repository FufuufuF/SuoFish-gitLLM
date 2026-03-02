import {
  useCallback,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import type { LoadMoreResult } from "../types";
import { usePaginationLoader } from "../hooks/use-pagination-loader";
import {
  PaginationInitialLoading,
  PaginationInlineLoading,
  PaginationRetryState,
} from "./common";

// ===== 类型定义 =====

export interface UpwardInfiniteListHandle {
  /** 滚动到底部（初始化后自动调用，发送新消息后也可手动调用） */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export interface UpwardInfiniteListProps {
  /**
   * 加载更多（更旧）数据的回调，由 Hook 层提供。
   * 负责调用 API 并将结果写入 Store，仅返回分页元数据。
   */
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  /**
   * 子节点（通常是 MessageList），由外部完全控制渲染。
   * 组件本身对内容结构透明，不承担任何业务渲染职责。
   */
  children: React.ReactNode;
  /** 渲染加载中状态（初始加载 + 向上加载更多时在顶部显示） */
  renderLoading?: () => React.ReactNode;
  /** 渲染错误状态（点击重试） */
  renderError?: (retry: () => void, error: unknown) => React.ReactNode;
  /** 渲染空状态（isEmpty && !hasMore 时显示） */
  renderEmpty?: () => React.ReactNode;
  /**
   * 是否无数据。由父组件传入（例如 messages.length === 0），
   * 用于判断空状态，因为组件自身不感知 items。
   */
  isEmpty?: boolean;
  /** 容器自定义样式 */
  sx?: SxProps<Theme>;
}

// ===== 组件实现 =====

export const UpwardInfiniteList = forwardRef<
  UpwardInfiniteListHandle,
  UpwardInfiniteListProps
>(function UpwardInfiniteList(
  { fetchMore, children, renderLoading, renderError, renderEmpty, isEmpty, sx },
  ref,
) {
  // ----- 默认状态 UI -----
  const defaultInitialLoading = <PaginationInitialLoading />;
  const defaultLoadMoreLoading = <PaginationInlineLoading />;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  const defaultError = (
    <PaginationRetryState
      isRetrying={isLoading}
      onRetry={() => {
        void retryWithScrollFix();
      }}
    />
  );

  // ----- 暴露命令式 API -----
  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior: ScrollBehavior = "smooth") => {
      bottomAnchorRef.current?.scrollIntoView({ behavior });
    },
  }));

  // ----- 加载更多（保留向上插入后的滚动位置修正） -----
  const loadMoreWithScrollFix = useCallback(async () => {
    const container = containerRef.current;
    const shouldFixScroll = !!container && !isInitialLoading;

    // 在加载前记录当前 scrollHeight，用于后续修正滚动位置
    const prevScrollHeight = container?.scrollHeight ?? 0;

    const result = await tryAutoLoad();

    // 修正滚动位置：向上插入内容后，浏览器会将所有内容下移，
    // 通过 scrollHeight 差值将 scrollTop 恢复到插入前的相对位置。
    // 初始加载时不修正（此时会自动 scrollToBottom）。
    if (result.success && shouldFixScroll && container) {
      requestAnimationFrame(() => {
        container.scrollTop += container.scrollHeight - prevScrollHeight;
      });
    }

    return result;
  }, [isInitialLoading, tryAutoLoad]);

  const retryWithScrollFix = useCallback(async () => {
    const container = containerRef.current;
    const shouldFixScroll = !!container && !isInitialLoading;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    const result = await retry();

    if (result.success && shouldFixScroll && container) {
      requestAnimationFrame(() => {
        container.scrollTop += container.scrollHeight - prevScrollHeight;
      });
    }

    return result;
  }, [isInitialLoading, retry]);

  // ----- 初始加载 -----
  useEffect(() => {
    void loadMoreWithScrollFix();
    // 只在挂载时触发一次，后续由 IntersectionObserver 驱动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- 初始加载完成后滚动到底部，展示最新内容 -----
  useEffect(() => {
    if (!isInitialLoading) {
      // instant：首次渲染不需要滚动动画
      bottomAnchorRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isInitialLoading]);

  // ----- 顶部哨兵：IntersectionObserver 触顶检测 -----
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreWithScrollFix();
        }
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreWithScrollFix]);

  // ----- 渲染 -----

  // 初始加载状态
  if (isInitialLoading) {
    return (
      <Box sx={{ height: "100%", ...sx }}>
        {renderLoading ? renderLoading() : defaultInitialLoading}
      </Box>
    );
  }

  if (isError && isEmpty) {
    return (
      <Box sx={{ height: "100%", ...sx }}>
        {renderError
          ? renderError(
              () => {
                void retryWithScrollFix();
              },
              error,
            )
          : defaultError}
      </Box>
    );
  }

  // 空状态：无数据且没有更多可加载
  if (isEmpty && !hasMore) {
    return <Box sx={{ height: "100%", ...sx }}>{renderEmpty?.() ?? null}</Box>;
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        overflowY: "auto",
        height: "100%",
        ...sx,
      }}
    >
      {/* 顶部哨兵：保持 1px，不与 loading 共用，避免撑出空白区域 */}
      {hasMore && <Box ref={topSentinelRef} sx={{ height: "1px" }} />}

      {/* loading 指示器：紧贴最旧消息上方，独立于哨兵 */}
      {isLoading &&
        (renderLoading ? renderLoading() : defaultLoadMoreLoading)}

      {/* 错误态：仅手动重试，不自动触发 */}
      {isError &&
        (renderError
          ? renderError(
              () => {
                void retryWithScrollFix();
              },
              error,
            )
          : defaultError)}

      {/* children 由外部完全控制，组件对内容结构透明 */}
      {children}

      {/* 底部锚点：供 scrollToBottom 定位 */}
      <div ref={bottomAnchorRef} />
    </Box>
  );
});
