import { useThreadStore } from "@/stores/thread-store";
import { forkThread as forkThreadApi, type ThreadIn } from "@/api/common";
import type { Thread } from "@/types";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useShallow } from "zustand/shallow";

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

  const activeSessionId = useChatSessionStore((state) => state.activeSessionId);
  const activeThreadId = useChatSessionStore
    .getState()
    .sessions.find((s) => s.id === activeSessionId)?.activeThreadId;

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
  };

  return {
    activeThreadId,

    forkThread,
  };
}
