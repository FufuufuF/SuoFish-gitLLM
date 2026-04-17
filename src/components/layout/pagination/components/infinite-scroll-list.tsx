import { useRef, useEffect } from "react";
import { cn } from "@/lib/cn";
import { usePaginationLoader } from "../hooks/use-pagination-loader";
import type { LoadMoreResult } from "../types";
import {
  PaginationInitialLoading,
  PaginationInlineLoading,
  PaginationRetryState,
} from "./common";

export interface InfiniteScrollListProps<T> {
  items: T[];
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (retry: () => void, error: unknown) => React.ReactNode;
  className?: string;
}

export function InfiniteScrollList<T>({
  items,
  fetchMore,
  renderItem,
  renderLoading,
  renderEmpty,
  renderError,
  className,
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

  const sentinelRef = useRef<HTMLDivElement>(null);

  const defaultError = (
    <PaginationRetryState
      isRetrying={isLoading}
      onRetry={() => { void retry(); }}
    />
  );

  const defaultLoadMore = <PaginationInlineLoading />;
  const defaultInitialLoading = <PaginationInitialLoading />;

  useEffect(() => {
    void tryAutoLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (isInitialLoading) {
    return (
      <div className={cn("h-full", className)}>
        {renderLoading?.() ?? defaultInitialLoading}
      </div>
    );
  }

  if (isError && items.length === 0) {
    return (
      <div className={cn("h-full", className)}>
        {renderError ? renderError(() => { void retry(); }, error) : defaultError}
      </div>
    );
  }

  if (items.length === 0 && !hasMore) {
    return <div className={cn("h-full", className)}>{renderEmpty?.() ?? null}</div>;
  }

  return (
    <div className={cn("h-full overflow-y-auto", className)}>
      {items.map((item, index) => renderItem(item, index))}

      {hasMore && (
        <div ref={sentinelRef} className="min-h-px">
          {isLoading && (renderLoading?.() ?? defaultLoadMore)}
          {isError &&
            (renderError
              ? renderError(() => { void retry(); }, error)
              : defaultError)}
        </div>
      )}
    </div>
  );
}
