import { useState, useEffect, useMemo } from "react";
import { useThreadStore } from "@/stores/thread-store";
import { getThreadList, type ThreadIn } from "@/api/common";
import type { Thread } from "@/types";
import { buildThreadTree } from "../utils";
import type { ThreadTreeNode } from "../types";

// ─── 数据转换（API 模型 → 业务模型）────────────────────────────────────────
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

// ─── 稳定空数组（避免 selector 内 ?? [] 每次创建新引用导致无限重渲染）──────
const EMPTY_THREADS: Thread[] = [];

// ─── Hook 接口 ──────────────────────────────────────────────────────────────
interface UseThreadTreeReturn {
  /** 已建好的树，null 表示尚无数据 */
  tree: ThreadTreeNode | null;
  isLoading: boolean;
  error: Error | null;
}

// ─── Hook 实现 ──────────────────────────────────────────────────────────────
export function useThreadTree(chatSessionId: number): UseThreadTreeReturn {
  // 1. 从 Store 读取扁平列表（响应式订阅）
  // selector 只返回原始值（undefined 时不在 selector 内新建数组），
  // ?? 操作符在外部引用稳定常量，保证 referential equality
  const threads =
    useThreadStore((state) => state.threadsByChatSessionId[chatSessionId]) ??
    EMPTY_THREADS;
  const setThreads = useThreadStore.getState().setThreads;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 2. 懒加载：Store 中已有数据则跳过 API 请求
    if (threads.length > 0) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getThreadList({ chat_session_id: chatSessionId })
      .then((res) => {
        if (cancelled) return;
        // 3. 数据转换在 Hook 层完成，写入 Store
        setThreads(chatSessionId, res.threads.map(mapThreadInToThread));
      })
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
    // 仅在 chatSessionId 变化时重新触发；threads 不作为依赖（避免懒加载判断死循环）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSessionId]);

  // 4. 派生树结构（纯计算，threads 稳定时不重算）
  const tree = useMemo(
    () => (threads.length > 0 ? buildThreadTree(threads) : null),
    [threads],
  );

  return { tree, isLoading, error };
}
