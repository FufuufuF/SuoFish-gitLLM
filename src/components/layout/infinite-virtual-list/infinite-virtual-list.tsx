import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/cn";
import { usePaginationLoader } from "../pagination/hooks/use-pagination-loader";
import type { LoadMoreResult } from "../pagination/types";
import {
  PaginationInitialLoading,
  PaginationInlineLoading,
  PaginationRetryState,
} from "../pagination/components/common";
import { usePrependAnchor } from "./use-prepend-anchor";
import { useInitialAnchor } from "./use-initial-anchor";

export interface InfiniteVirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  estimateSize?: number;
  overscan?: number;
  direction?: "up" | "down";
  initialAnchor?: "start" | "end";
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  onError?: (error: unknown) => void;
  renderLoading?: () => React.ReactNode;
  renderError?: (retry: () => void, error: unknown) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  isEmpty?: boolean;
  className?: string;
  listClassName?: string;
}

export interface InfiniteVirtualListHandle {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollToItem: (key: string | number, behavior?: ScrollBehavior) => void;
}

function InfiniteVirtualListInner<T>(
  {
    items,
    renderItem,
    getItemKey,
    estimateSize: estimateSizeProp = 120,
    overscan = 5,
    direction = "up",
    initialAnchor,
    fetchMore,
    onError,
    renderLoading,
    renderError,
    renderEmpty,
    isEmpty,
    className,
    listClassName,
  }: InfiniteVirtualListProps<T>,
  ref: React.ForwardedRef<InfiniteVirtualListHandle>,
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const resolvedAnchor = initialAnchor ?? (direction === "up" ? "end" : "start");
  const resolvedIsEmpty = isEmpty ?? items.length === 0;

  const {
    hasMore,
    isLoading,
    isError,
    error,
    isInitialLoading,
    tryAutoLoad,
    retry,
  } = usePaginationLoader({ fetchMore, onError });

  const getItemKeyByIndex = useCallback(
    (index: number) => {
      const item = items[index];
      if (item == null) return `stale-${index}`;
      return getItemKey(item, index);
    },
    [items, getItemKey],
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimateSizeProp,
    overscan,
    getItemKey: getItemKeyByIndex,
  });

  usePrependAnchor({
    virtualizer,
    items,
    getItemKey,
    scrollContainerRef,
    estimateSize: estimateSizeProp,
  });

  useInitialAnchor({
    virtualizer,
    itemCount: items.length,
    isInitialLoading,
    anchor: resolvedAnchor,
  });

  useEffect(() => {
    void tryAutoLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!sentinel || !scrollContainer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void tryAutoLoad();
      },
      { root: scrollContainer, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tryAutoLoad]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom(behavior: ScrollBehavior = "smooth") {
        if (items.length > 0) {
          virtualizer.scrollToIndex(items.length - 1, {
            align: "end",
            behavior,
          });
        }
      },
      scrollToItem(key: string | number, behavior: ScrollBehavior = "smooth") {
        const idx = items.findIndex((item, i) => getItemKey(item, i) === key);
        if (idx >= 0) {
          virtualizer.scrollToIndex(idx, { align: "start", behavior });
        }
      },
    }),
    [virtualizer, items, getItemKey],
  );

  const virtualItems = virtualizer.getVirtualItems();

  if (isInitialLoading) {
    return (
      <div className={cn("h-full", className)}>
        {renderLoading?.() ?? <PaginationInitialLoading />}
      </div>
    );
  }

  if (isError && resolvedIsEmpty) {
    return (
      <div className={cn("h-full", className)}>
        {renderError?.(retry, error) ?? (
          <PaginationRetryState onRetry={retry} isRetrying={isLoading} />
        )}
      </div>
    );
  }

  if (resolvedIsEmpty && !hasMore) {
    return (
      <div className={cn("h-full", className)}>
        {renderEmpty?.() ?? null}
      </div>
    );
  }

  const isUpward = direction === "up";
  const showSentinel = hasMore;
  const showInlineLoading = isLoading && !isInitialLoading;
  const showInlineError = isError;

  return (
    <div
      ref={scrollContainerRef}
      className={cn("h-full overflow-y-auto", className)}
    >
      {isUpward && showInlineLoading && (
        <div className="sticky top-0 z-10">
          {renderLoading?.() ?? <PaginationInlineLoading />}
        </div>
      )}
      {isUpward && showInlineError && (
        <div className="sticky top-0 z-10">
          {renderError?.(retry, error) ?? (
            <PaginationRetryState onRetry={retry} isRetrying={isLoading} />
          )}
        </div>
      )}

      <div
        role="list"
        className={cn("relative w-full", listClassName)}
        style={{ height: virtualizer.getTotalSize() }}
      >
        {isUpward && showSentinel && (
          <div ref={sentinelRef} className="absolute left-0 top-0 h-px w-full" />
        )}

        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          if (item == null) return null;
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              role="listitem"
              aria-setsize={items.length}
              aria-posinset={virtualItem.index + 1}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}

        {!isUpward && showSentinel && (
          <div
            ref={sentinelRef}
            className="absolute left-0 h-px w-full"
            style={{ top: virtualizer.getTotalSize() }}
          />
        )}
      </div>

      {!isUpward && showInlineLoading && (
        renderLoading?.() ?? <PaginationInlineLoading />
      )}
      {!isUpward && showInlineError && (
        renderError?.(retry, error) ?? (
          <PaginationRetryState onRetry={retry} isRetrying={isLoading} />
        )
      )}
    </div>
  );
}

export const InfiniteVirtualList = forwardRef(InfiniteVirtualListInner) as <T>(
  props: InfiniteVirtualListProps<T> & {
    ref?: React.Ref<InfiniteVirtualListHandle>;
  },
) => React.ReactNode;
