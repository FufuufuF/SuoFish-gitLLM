import { create } from "zustand";
import type { ChatSession, ChatSessionStatus } from "@/types";

export interface ChatSessionStore {
  // ===== 状态 =====
  sessions: ChatSession[];
  activeSessionId: string | number | null; // tempId 或真实 id
  isTitleGenerating: boolean; // 新会话标题是否正在生成（用于 loading 占位）

  // ===== Actions =====
  /** 设置整个会话列表（用于初始加载） */
  setSessions: (sessions: ChatSession[]) => void;

  /** 添加新会话（乐观更新用） */
  addSession: (session: ChatSession) => void;

  /** 更新会话状态 */
  updateSessionStatus: (id: string | number, status: ChatSessionStatus) => void;

  /** 用真实 ID 替换临时 ID */
  replaceSessionId: (tempId: string, realId: number) => void;

  /** 更新会话标题 */
  updateSessionTitle: (id: string | number, title: string) => void;

  /** 设置当前激活会话 */
  setActiveSessionId: (id: string | number | null) => void;

  /** 删除会话 */
  removeSession: (id: string | number) => void;

  /** 设置标题生成状态 */
  setTitleGenerating: (generating: boolean) => void;
}

export const useChatSessionStore = create<ChatSessionStore>((set) => ({
  sessions: [],
  activeSessionId: null,
  isTitleGenerating: false,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions], // 新会话置顶
    })),

  updateSessionStatus: (id, status) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id || s.tempId === id ? { ...s, status } : s,
      ),
    })),

  replaceSessionId: (tempId, realId) =>
    set((state) => {
      const newSessions = state.sessions.map((s) =>
        s.tempId === tempId ? { ...s, id: realId } : s,
      );
      // 如果当前激活的是 tempId，也需要更新
      const newActiveId =
        state.activeSessionId === tempId ? realId : state.activeSessionId;
      return { sessions: newSessions, activeSessionId: newActiveId };
    }),

  updateSessionTitle: (id, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id || s.tempId === id ? { ...s, title } : s,
      ),
    })),

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id && s.tempId !== id),
    })),

  setTitleGenerating: (generating) => set({ isTitleGenerating: generating }),
}));
