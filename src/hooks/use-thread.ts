import { useCallback } from "react";
import { useThreadStore } from "@/stores/thread-store";
import { useMessageStore } from "@/stores/message-store";
import { useMergeStore } from "@/stores/merge-store";
import {
  forkThread as forkThreadApi,
  mergePreview as mergePreviewApi,
  mergeConfirm as mergeConfirmApi,
  type ThreadIn,
} from "@/api/common";
import { getMessageList } from "@/api/common";
import type { Message, MessageRole } from "@/types";
import type { MessageIn } from "@/api/common/message";
import { PageDirection } from "@/api/core/types";
import { useChatSessionStore } from "@/stores/chat-session-store";

const mapThreadInToThread = (thread: ThreadIn) => ({
  id: thread.id,
  chatSessionId: thread.chat_session_id,
  parentThreadId: thread.parent_thread_id,
  title: thread.title,
  threadType: thread.thread_type,
  status: thread.status,
  forkFromMessageId: thread.fork_from_message_id,
  createAt: new Date(thread.create_at),
});

const mapMessageInToMessage = (msg: MessageIn): Message => ({
  id: msg.id,
  role: msg.role as MessageRole,
  content: msg.content,
  status: "success",
  timestamp: new Date(msg.create_at),
  threadId: msg.thread_id,
});

export function useThread() {
  // actions 是稳定引用，通过 getState() 获取，不产生订阅
  const { addThread: addThreadStore } = useThreadStore.getState();
  const { updateActiveThreadId } = useChatSessionStore.getState();

  const activeSessionId = useChatSessionStore((state) => state.activeSessionId);

  // 响应式订阅 activeThreadId（selector，禁止用 getState() 快照）
  const activeThreadId = useChatSessionStore(
    (state) =>
      state.sessions.find((s) => s.id === state.activeSessionId)
        ?.activeThreadId ?? null,
  );

  // ── isForkDisabled ───────────────────────────────────────────────────────
  const isForkDisabled = (() => {
    if (!activeSessionId || !activeThreadId) return true;
    if (typeof activeSessionId === "string") return true;

    const threads =
      useThreadStore.getState().threadsByChatSessionId[
        activeSessionId as number
      ] ?? [];
    const currentThread = threads.find((t) => t.id === activeThreadId);
    if (!currentThread) return true;
    if (currentThread.parentThreadId === null) return false;

    const messages =
      useMessageStore.getState().messagesByThread[activeThreadId] ?? [];
    if (messages.length === 0) return true;

    const forkPoint = currentThread.forkFromMessageId ?? 0;
    return !messages.some(
      (msg) => typeof msg.id === "number" && msg.id > forkPoint,
    );
  })();

  // ── isMergeDisabled ──────────────────────────────────────────────────────
  // 规则：
  //   1. 无 activeSessionId / activeThreadId → 禁用
  //   2. 临时 session → 禁用
  //   3. 主线（parentThreadId === null）→ 禁用
  //   4. 已合并（status === 2）→ 禁用
  //   5. 有未合并子分支 → 禁用（逐级合并）
  //   6. threads 尚未加载（空数组）→ 保守禁用
  const isMergeDisabled = (() => {
    if (!activeSessionId || !activeThreadId) return true;
    if (typeof activeSessionId === "string") return true;

    const threads =
      useThreadStore.getState().threadsByChatSessionId[
        activeSessionId as number
      ] ?? [];
    const currentThread = threads.find((t) => t.id === activeThreadId);

    if (!currentThread) return true;
    if (currentThread.parentThreadId === null) return true; // 主线
    if (currentThread.status === 2 /* MERGED */) return true;

    // 逐级约束：有未合并子分支则禁用
    const hasUnmergedChildren = threads.some(
      (t) => t.parentThreadId === activeThreadId && t.status !== 2,
    );
    if (hasUnmergedChildren) return true;

    return false;
  })();

  // ── forkThread ───────────────────────────────────────────────────────────
  const forkThread = async (title: string = "Default") => {
    if (!activeSessionId) return;
    const res = await forkThreadApi({
      chat_session_id: activeSessionId as number,
      parent_thread_id: activeThreadId as number,
      title: title ?? null,
    });
    addThreadStore(mapThreadInToThread(res.thread));
    updateActiveThreadId(activeSessionId, res.thread.id);
  };

  // ── previewMerge ─────────────────────────────────────────────────────────
  const previewMerge = useCallback(async () => {
    if (!activeThreadId || typeof activeThreadId !== "number") return;

    useMergeStore.getState().startPreview(activeThreadId);
    try {
      const res = await mergePreviewApi({ thread_id: activeThreadId });
      useMergeStore
        .getState()
        .setPreviewData(res.target_thread_id, res.brief_content);
    } catch {
      useMergeStore.getState().setError("预览失败，请重试");
    }
  }, [activeThreadId]);

  // ── confirmMerge ─────────────────────────────────────────────────────────
  const confirmMerge = useCallback(
    async (briefContent: string) => {
      if (!activeThreadId || typeof activeThreadId !== "number") return;
      if (!activeSessionId || typeof activeSessionId !== "number") return;

      useMergeStore.getState().startConfirm();
      try {
        const res = await mergeConfirmApi({
          thread_id: activeThreadId,
          brief_content: briefContent,
        });

        const parentThreadId = res.target_thread.id;

        // 1. 标记子线程 → MERGED
        useThreadStore
          .getState()
          .updateThreadStatus(
            activeSessionId as number,
            activeThreadId,
            2 /* MERGED */,
          );

        // 2. 切换 active_thread_id → 父线程
        useChatSessionStore
          .getState()
          .updateActiveThreadId(activeSessionId as number, parentThreadId);

        // 3. 加载父线程消息（getMessageList 已包含跨线程聚合）
        const msgRes = await getMessageList({
          thread_id: parentThreadId,
          direction: PageDirection.BEFORE,
          limit: 50,
        });
        const msgs = msgRes.messages.map(mapMessageInToMessage);
        useMessageStore.getState().setMessages(parentThreadId, msgs);

        useMergeStore.getState().setSuccess();
      } catch {
        useMergeStore.getState().setError("合并失败，请重试");
      }
    },
    [activeThreadId, activeSessionId],
  );

  return {
    activeThreadId,
    isForkDisabled,
    forkThread,
    isMergeDisabled,
    previewMerge,
    confirmMerge,
  };
}
