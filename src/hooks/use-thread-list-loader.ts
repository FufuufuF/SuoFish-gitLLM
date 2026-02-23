import { useState, useEffect } from "react";
import { getThreadList, type ThreadIn } from "@/api/common";
import { useThreadStore } from "@/stores/thread-store";
import type { Thread } from "@/types";

// ─── 稳定空数组 ──────────────────────────────────────────────────────────
const EMPTY_THREADS: Thread[] = [];

// ─── 并发去重 ────────────────────────────────────────────────────────────
const inFlightRequests = new Map<number, Promise<void>>();

const mapThreadInToThread = (thread: ThreadIn): Thread => ({
  id: thread.id,
  chatSessionId: thread.chat_session_id,
  parentThreadId: thread.parent_thread_id,
  title: thread.title,
  threadType: thread.thread_type,
  status: thread.status,
  forkFromMessageId: thread.fork_from_message_id,
  createAt: new Date(thread.create_at),
});

/**
 * 确保指定会话的线程列表已加载到 store 中
 * - store 中已有数据则跳过
 * - 多处调用共享同一 in-flight 请求（去重）
 */
function ensureThreadListLoaded(chatSessionId: number): Promise<void> {
  const current =
    useThreadStore.getState().threadsByChatSessionId[chatSessionId];
  if (current && current.length > 0) return Promise.resolve();

  const existing = inFlightRequests.get(chatSessionId);
  if (existing) return existing;

  const request = getThreadList({ chat_session_id: chatSessionId })
    .then((res) => {
      useThreadStore
        .getState()
        .setThreads(chatSessionId, res.threads.map(mapThreadInToThread));
    })
    .finally(() => {
      inFlightRequests.delete(chatSessionId);
    });

  inFlightRequests.set(chatSessionId, request);
  return request;
}

// ─── Hook ────────────────────────────────────────────────────────────────

interface UseThreadListLoaderReturn {
  threads: Thread[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * 响应式订阅 + 自动懒加载线程列表
 * - chatSessionId 为 null 时不触发加载，返回空数组
 * - 多个调用者共享同一 in-flight 请求（去重）
 * - store 中已有数据则跳过请求
 */
export function useThreadListLoader(
  chatSessionId: number | null,
): UseThreadListLoaderReturn {
  // 响应式订阅 store 中的线程列表
  const threads =
    useThreadStore((s) =>
      chatSessionId != null
        ? s.threadsByChatSessionId[chatSessionId]
        : undefined,
    ) ?? EMPTY_THREADS;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (chatSessionId == null || threads.length > 0) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    ensureThreadListLoaded(chatSessionId)
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // threads 不加入依赖列表：避免数据到达后重新触发 effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSessionId]);

  return { threads, isLoading, error };
}
