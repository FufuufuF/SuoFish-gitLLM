import { useCallback, useEffect, useRef, useState } from "react";
import type { LoadMoreResult } from "../types";

export interface UsePaginationLoaderOptions {
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  throttleMs?: number;
  onError?: (error: unknown) => void;
}

export interface LoadAttemptResult {
  triggered: boolean;
  success: boolean;
}

export interface UsePaginationLoaderResult {
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  autoLoadPaused: boolean;
  isInitialLoading: boolean;
  tryAutoLoad: () => Promise<LoadAttemptResult>;
  retry: () => Promise<LoadAttemptResult>;
  resetError: () => void;
}

export function usePaginationLoader({
  fetchMore,
  throttleMs = 1500,
  onError,
}: UsePaginationLoaderOptions): UsePaginationLoaderResult {
  const cursorRef = useRef<string | undefined>(undefined);
  const fetchMoreRef = useRef(fetchMore);
  const lastRetryAtRef = useRef(0);

  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [autoLoadPaused, setAutoLoadPaused] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    fetchMoreRef.current = fetchMore;
  }, [fetchMore]);

  const runLoad = useCallback(
    async (source: "auto" | "retry"): Promise<LoadAttemptResult> => {
      if (isLoading || !hasMore) {
        return { triggered: false, success: false };
      }

      if (source === "auto" && autoLoadPaused) {
        return { triggered: false, success: false };
      }

      setIsLoading(true);
      try {
        const result = await fetchMoreRef.current(cursorRef.current);
        cursorRef.current = result.nextCursor;
        setHasMore(result.hasMore);
        setError(null);
        setAutoLoadPaused(false);
        return { triggered: true, success: true };
      } catch (loadError) {
        setError(loadError);
        setAutoLoadPaused(true);
        onError?.(loadError);
        return { triggered: true, success: false };
      } finally {
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    },
    [autoLoadPaused, hasMore, isLoading, onError],
  );

  const tryAutoLoad = useCallback(() => {
    return runLoad("auto");
  }, [runLoad]);

  const retry = useCallback(() => {
    const now = Date.now();
    if (now - lastRetryAtRef.current < throttleMs) {
      return Promise.resolve({ triggered: false, success: false });
    }

    lastRetryAtRef.current = now;
    return runLoad("retry");
  }, [runLoad, throttleMs]);

  const resetError = useCallback(() => {
    setError(null);
    setAutoLoadPaused(false);
  }, []);

  return {
    hasMore,
    isLoading,
    isError: error !== null,
    error,
    autoLoadPaused,
    isInitialLoading,
    tryAutoLoad,
    retry,
    resetError,
  };
}
