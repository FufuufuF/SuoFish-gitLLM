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
  const { activeThreadId, threadsByChatSessionId } = useThreadStore(
    useShallow((state) => ({
      activeThreadId: state.activeThreadId,
      threadsByChatSessionId: state.threadsByChatSessionId,
    })),
  );

  const addThreadStore = useThreadStore((state) => state.addThread);
  const setActiveThreadIdStore = useThreadStore(
    (state) => state.setActiveThreadId,
  );

  const { activeSessionId } = useChatSessionStore((state) => ({
    activeSessionId: state.activeSessionId,
  }));

  const getThreadsByChatSessionId = (chatSessionId: number) => {
    return threadsByChatSessionId[chatSessionId] || [];
  };

  const forkThread = async (title: string = "Default") => {
    if (!activeThreadId || !activeSessionId) {
      return;
    }
    const forkThread = await forkThreadApi({
      chat_session_id: activeSessionId as number,
      parent_thread_id: activeThreadId,
      title: title ?? null,
    });
    addThreadStore(mapThreadInToThread(forkThread.thread));
    setActiveThreadIdStore(forkThread.thread.id);
  };

  return {
    getThreadsByChatSessionId,
    forkThread,
  };
}
