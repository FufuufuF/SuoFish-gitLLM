import type { Thread } from "@/types";
import { create } from "zustand";

export interface ThreadStore {
  threadsByChatSessionId: Record<number, Thread[]>;
  addThread: (thread: Thread) => void;
  setThreads: (chatSessionId: number, threads: Thread[]) => void;
  /** 更新指定线程的 status 字段（用于合并后标记 MERGED） */
  updateThreadStatus: (
    chatSessionId: number,
    threadId: number,
    status: number,
  ) => void;
}

export const useThreadStore = create<ThreadStore>((set) => ({
  threadsByChatSessionId: {},
  addThread: (thread) =>
    set((state) => ({
      threadsByChatSessionId: {
        ...state.threadsByChatSessionId,
        [thread.chatSessionId]: [
          ...(state.threadsByChatSessionId[thread.chatSessionId] || []),
          thread,
        ],
      },
    })),
  setThreads: (chatSessionId, threads) =>
    set((state) => ({
      threadsByChatSessionId: {
        ...state.threadsByChatSessionId,
        [chatSessionId]: threads,
      },
    })),

  updateThreadStatus: (chatSessionId, threadId, status) =>
    set((state) => ({
      threadsByChatSessionId: {
        ...state.threadsByChatSessionId,
        [chatSessionId]: (
          state.threadsByChatSessionId[chatSessionId] ?? []
        ).map((t) => (t.id === threadId ? { ...t, status } : t)),
      },
    })),
}));
