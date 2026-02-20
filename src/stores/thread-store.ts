import type { Thread } from "@/types";
import { create } from "zustand";

export interface ThreadStore {
  threadByChatSessionId: Record<number, Thread>;
  activeThreadId: number | null;
  addThread: (thread: Thread) => void;
  setActiveThreadId: (threadId: number) => void;
}

export const useThreadStore = create<ThreadStore>((set) => ({
  threadByChatSessionId: {},
  activeThreadId: null,
  addThread: (thread) =>
    set((state) => ({
      threadByChatSessionId: {
        ...state.threadByChatSessionId,
        [thread.chatSessionId]: thread,
      },
    })),
  setActiveThreadId: (threadId) =>
    set(() => ({
      activeThreadId: threadId,
    })),
}));
