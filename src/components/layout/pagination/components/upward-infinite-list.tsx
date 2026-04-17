import {
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { cn } from "@/lib/cn";
import type { LoadMoreResult } from "../types";
import { usePaginationLoader } from "../hooks/use-pagination-loader";
import {
  PaginationInitialLoading,
  PaginationInlineLoading,
  PaginationRetryState,
} from "./common";

export interface UpwardInfiniteListHandle {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export interface UpwardInfiniteListProps {
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  children: React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (retry: () => void, error: unknown) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  isEmpty?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  manageScroll?: boolean;
  className?: string;
}

export const UpwardInfiniteList = forwardRef<
  UpwardInfiniteListHandle,
  UpwardInfiniteListProps
>(function UpwardInfiniteList(
  { fetchMore, children, renderLoading, renderError, renderEmpty, isEmpty, containerRef: externalContainerRef, manageScroll = true, className },
  ref,
) {
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

  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef ?? internalContainerRef;
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  const defaultError = (
    <PaginationRetryState
      isRetrying={isLoading}
      onRetry={() => { void retryWithScrollFix(); }}
    />
  );

  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior: ScrollBehavior = "smooth") => {
      bottomAnchorRef.current?.scrollIntoView({ behavior });
    },
  }));

  const loadMoreWithScrollFix = useCallback(async () => {
    const container = containerRef.current;
    const shouldFixScroll = manageScroll && !!container && !isInitialLoading;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    const result = await tryAutoLoad();

    if (result.success && shouldFixScroll && container) {
      requestAnimationFrame(() => {
        container.scrollTop += container.scrollHeight - prevScrollHeight;
      });
    }

    return result;
  }, [isInitialLoading, tryAutoLoad, containerRef, manageScroll]);

  const retryWithScrollFix = useCallback(async () => {
    const container = containerRef.current;
    const shouldFixScroll = manageScroll && !!container && !isInitialLoading;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    const result = await retry();

    if (result.success && shouldFixScroll && container) {
      requestAnimationFrame(() => {
        container.scrollTop += container.scrollHeight - prevScrollHeight;
      });
    }

    return result;
  }, [isInitialLoading, retry, containerRef, manageScroll]);

  useEffect(() => {
    void loadMoreWithScrollFix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (manageScroll && !isInitialLoading) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isInitialLoading, manageScroll]);

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

  if (isInitialLoading) {
    return (
      <div className={cn("h-full", className)}>
        {renderLoading ? renderLoading() : defaultInitialLoading}
      </div>
    );
  }

  if (isError && isEmpty) {
    return (
      <div className={cn("h-full", className)}>
        {renderError
          ? renderError(() => { void retryWithScrollFix(); }, error)
          : defaultError}
      </div>
    );
  }

  if (isEmpty && !hasMore) {
    return <div className={cn("h-full", className)}>{renderEmpty?.() ?? null}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn("h-full overflow-y-auto", className)}
    >
      {hasMore && <div ref={topSentinelRef} className="h-px" />}

      {isLoading &&
        (renderLoading ? renderLoading() : defaultLoadMoreLoading)}

      {isError &&
        (renderError
          ? renderError(() => { void retryWithScrollFix(); }, error)
          : defaultError)}

      {children}

      <div ref={bottomAnchorRef} />
    </div>
  );
});
