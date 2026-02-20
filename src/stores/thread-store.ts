import type { Thread } from "@/types";
import { create } from "zustand";

export interface ThreadStore {
  threadsByChatSessionId: Record<number, Thread[]>;
  activeThreadId: number | null;
  addThread: (thread: Thread) => void;
  setActiveThreadId: (threadId: number) => void;
}

export const useThreadStore = create<ThreadStore>((set) => ({
  threadsByChatSessionId: {},
  activeThreadId: null,
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
  setActiveThreadId: (threadId) =>
    set(() => ({
      activeThreadId: threadId,
    })),
}));
