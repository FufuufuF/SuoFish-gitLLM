import { useMemo, useCallback } from "react";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { updateChatSessionActiveThread } from "@/api/common/chat-session";
import { useThreadListLoader } from "@/hooks/use-thread-list-loader";
import { buildThreadTree } from "../utils";
import type { ThreadTreeNode } from "../types";

// ─── Hook 接口 ──────────────────────────────────────────────────────────────
interface UseThreadTreeReturn {
  tree: ThreadTreeNode | null;
  isLoading: boolean;
  error: Error | null;
  switchActiveThread: (targetThreadId: number) => Promise<void>;
}

// ─── Hook 实现 ──────────────────────────────────────────────────────────────
export function useThreadTree(chatSessionId: number): UseThreadTreeReturn {
  const { threads, isLoading, error } = useThreadListLoader(chatSessionId);

  const tree = useMemo(
    () => (threads.length > 0 ? buildThreadTree(threads) : null),
    [threads],
  );

  // ─── 5. 切换活跃线程（乐观更新 + 失败回滚）
  const switchActiveThread = useCallback(
    async (targetThreadId: number) => {
      const { updateActiveThreadId, sessions, activeSessionId } =
        useChatSessionStore.getState();
      if (!activeSessionId || typeof activeSessionId !== "number") return;

      // 在乐观更新前记录旧值，用于失败时回滚
      const previousThreadId = sessions.find(
        (s) => s.id === activeSessionId,
      )?.activeThreadId;

      // 乐观更新：立刻更新 store，树高亮立刻切换
      updateActiveThreadId(activeSessionId, targetThreadId);

      try {
        await updateChatSessionActiveThread(chatSessionId, targetThreadId);
      } catch {
        // 回滚：恢复到切换前的 activeThreadId
        if (previousThreadId !== undefined) {
          updateActiveThreadId(activeSessionId, previousThreadId);
        }
      }
    },
    [chatSessionId],
  );

  return { tree, isLoading, error, switchActiveThread };
}
