import type { Thread } from "@/types";
import { create } from "zustand";

export interface ThreadStore {
  threadsByChatSessionId: Record<number, Thread[]>;
  addThread: (thread: Thread) => void;
  setThreads: (sessionId: number, threads: Thread[]) => void;
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
  setThreads: (sessionId, threads) =>
    set((state) => ({
      threadsByChatSessionId: {
        ...state.threadsByChatSessionId,
        [sessionId]: threads,
      },
    })),
}));
