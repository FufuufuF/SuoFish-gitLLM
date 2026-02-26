import { useCallback, useMemo } from "react";
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
import { ThreadStatus, type Message, type MessageRole } from "@/types";
import type { MessageIn } from "@/api/common/message";
import { PageDirection } from "@/api/core/types";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useThreadListLoader } from "@/hooks/use-thread-list-loader";

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

const EMPTY_MESSAGES: Message[] = [];

export function useThread() {
  // actions 是稳定引用，通过 getState() 获取，不产生订阅
  const { addThread: addThreadStore } = useThreadStore.getState();
  const { updateActiveThreadId } = useChatSessionStore.getState();

  const activeSessionId = useChatSessionStore((state) => state.activeSessionId);

  // 响应式订阅 activeThreadId（selector，禁止用 getState() 快照）
  const activeThreadId = useChatSessionStore(
    (state) =>
      state.sessions.find(
        (s) => s.id === state.activeSessionId || s.tempId === state.activeSessionId,
      )
        ?.activeThreadId ?? null,
  );

  // 响应式订阅 + 自动预加载线程列表
  const { threads } = useThreadListLoader(
    typeof activeSessionId === "number" ? activeSessionId : null,
  );

  const activeThreadMessages = useMessageStore((state) =>
    activeThreadId ? state.messagesByThread[activeThreadId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES,
  );

  const { isForkDisabled, isMergeDisabled, isThreadStatusNormal } =
    useMemo(() => {
      const current =
        threads.find((thread) => thread.id === activeThreadId) ?? null;

      if (!activeSessionId || !activeThreadId || typeof activeSessionId === "string") {
        return {
          isForkDisabled: true,
          isMergeDisabled: true,
          isThreadStatusNormal: true,
        };
      }

      if (!current) {
        return {
          isForkDisabled: true,
          isMergeDisabled: true,
          isThreadStatusNormal: false,
        };
      }

      const isThreadStatusNormal = current.status === ThreadStatus.NORMAL;

      let isForkDisabled = true;
      if (current.parentThreadId === null) {
        isForkDisabled = false;
      } else if (activeThreadMessages.length > 0) {
        const forkPoint = current.forkFromMessageId ?? 0;
        isForkDisabled = !activeThreadMessages.some(
          (msg) => typeof msg.id === "number" && msg.id > forkPoint,
        );
      }

      // 规则：
      //   1. 无 activeSessionId / activeThreadId → 禁用
      //   2. 临时 session → 禁用
      //   3. 主线（parentThreadId === null）→ 禁用
      //   4. 已合并（status === MERGED）→ 禁用
      //   5. 有未合并子分支 → 禁用（逐级合并）
      //   6. threads 尚未加载（空数组）→ 保守禁用
      let isMergeDisabled = false;
      if (current.parentThreadId === null) {
        isMergeDisabled = true;
      } else if (current.status === ThreadStatus.MERGED) {
        isMergeDisabled = true;
      } else {
        const hasUnmergedChildren = threads.some(
          (t) => t.parentThreadId === activeThreadId && t.status !== ThreadStatus.MERGED,
        );
        if (hasUnmergedChildren) {
          isMergeDisabled = true;
        }
      }

      return {
        isForkDisabled,
        isMergeDisabled,
        isThreadStatusNormal,
      };
    }, [activeSessionId, activeThreadId, activeThreadMessages, threads]);

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
    isMergeDisabled,
    isThreadStatusNormal,
    forkThread,
    previewMerge,
    confirmMerge,
  };
}
