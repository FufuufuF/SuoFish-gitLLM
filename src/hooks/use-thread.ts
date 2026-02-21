import { useThreadStore } from "@/stores/thread-store";
import { useMessageStore } from "@/stores/message-store";
import { forkThread as forkThreadApi, type ThreadIn } from "@/api/common";
import type { Thread } from "@/types";
import { useChatSessionStore } from "@/stores/chat-session-store";

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

  // ── isForkDisabled：基于当前分支内容判断是否允许 Fork ──────────────────────
  // 规则：
  //   1. 无 activeSessionId / activeThreadId → 禁用
  //   2. 主线（parentThreadId === null）→ 始终允许
  //   3. 分支 → 需要在 forkFromMessageId 之后有真实消息（id 为 number 且 > forkPoint）
  //   4. messages 为空（尚未加载）→ 禁用（保守策略）
  const isForkDisabled = (() => {
    if (!activeSessionId || !activeThreadId) return true;
    if (typeof activeSessionId === "string") return true; // 临时 session，尚未持久化

    const threads =
      useThreadStore.getState().threadsByChatSessionId[
        activeSessionId as number
      ] ?? [];
    const currentThread = threads.find((t) => t.id === activeThreadId);

    // thread 信息尚未加载
    if (!currentThread) return true;

    // 主线始终允许
    if (currentThread.parentThreadId === null) return false;

    // 分支：检查在 forkFromMessageId 之后是否有真实消息
    const messages =
      useMessageStore.getState().messagesByThread[activeThreadId] ?? [];

    // messages 为空时禁用（保守策略）
    if (messages.length === 0) return true;

    const forkPoint = currentThread.forkFromMessageId ?? 0;
    return !messages.some(
      (msg) => typeof msg.id === "number" && msg.id > forkPoint,
    );
  })();

  const forkThread = async (title: string = "Default") => {
    if (!activeSessionId) {
      return;
    }
    const forkThread = await forkThreadApi({
      chat_session_id: activeSessionId as number,
      parent_thread_id: activeThreadId as number,
      title: title ?? null,
    });
    addThreadStore(mapThreadInToThread(forkThread.thread));
    updateActiveThreadId(activeSessionId, forkThread.thread.id);
  };

  return {
    activeThreadId,
    isForkDisabled,
    forkThread,
  };
}
