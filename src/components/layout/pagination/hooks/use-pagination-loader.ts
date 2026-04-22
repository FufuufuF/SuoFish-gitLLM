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
  const fetchMoreRef = useRef(fetchMore);
  const onErrorRef = useRef(onError);
  const throttleMsRef = useRef(throttleMs);
  const cursorRef = useRef<string | undefined>(undefined);
  const lastRetryAtRef = useRef(0);

  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const autoLoadPausedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [autoLoadPaused, setAutoLoadPaused] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    fetchMoreRef.current = fetchMore;
  }, [fetchMore]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    throttleMsRef.current = throttleMs;
  }, [throttleMs]);

  const runLoad = useCallback(
    async (source: "auto" | "retry"): Promise<LoadAttemptResult> => {
      if (isLoadingRef.current || !hasMoreRef.current) {
        return { triggered: false, success: false };
      }
      if (source === "auto" && autoLoadPausedRef.current) {
        return { triggered: false, success: false };
      }

      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        const result = await fetchMoreRef.current(cursorRef.current);
        cursorRef.current = result.nextCursor;
        hasMoreRef.current = result.hasMore;
        autoLoadPausedRef.current = false;
        setHasMore(result.hasMore);
        setError(null);
        setAutoLoadPaused(false);
        return { triggered: true, success: true };
      } catch (loadError) {
        autoLoadPausedRef.current = true;
        setError(loadError);
        setAutoLoadPaused(true);
        onErrorRef.current?.(loadError);
        return { triggered: true, success: false };
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    },
    [],
  );

  const tryAutoLoad = useCallback(
    () => runLoad("auto"),
    [runLoad],
  );

  const retry = useCallback(() => {
    const now = Date.now();
    if (now - lastRetryAtRef.current < throttleMsRef.current) {
      return Promise.resolve({ triggered: false, success: false });
    }
    lastRetryAtRef.current = now;
    return runLoad("retry");
  }, [runLoad]);

  const resetError = useCallback(() => {
    autoLoadPausedRef.current = false;
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
