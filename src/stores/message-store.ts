import type { Message, MessageStatus } from "@/types";
import { create } from "zustand";

export interface MessageStore {
  /** 按 sessionKey 索引的消息列表 */
  messagesBySession: Record<string | number, Message[]>;

  /** 获取指定 session 的消息列表 */
  getMessages: (sessionKey: string | number) => Message[];

  /** 添加消息到指定 session */
  addMessage: (sessionKey: string | number, message: Message) => void;

  /** 设置指定 session 的完整消息列表（用于拉取历史消息） */
  setMessages: (sessionKey: string | number, messages: Message[]) => void;

  /** 更新指定 session 中消息的状态 */
  updateMessageStatus: (
    sessionKey: string | number,
    id: number | string,
    status: MessageStatus,
  ) => void;

  /** 用真实 ID 替换临时消息 ID */
  updateMessageId: (
    sessionKey: string | number,
    tempId: string,
    realId: number,
  ) => void;

  /** 将消息从旧 sessionKey 迁移到新 sessionKey */
  migrateSessionMessages: (
    oldKey: string | number,
    newKey: string | number,
  ) => void;

  /** 清除指定 session 的消息 */
  clearSessionMessages: (sessionKey: string | number) => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messagesBySession: {},

  getMessages: (sessionKey) => {
    return get().messagesBySession[sessionKey] ?? [];
  },

  addMessage: (sessionKey, message) =>
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionKey]: [
          ...(state.messagesBySession[sessionKey] ?? []),
          message,
        ],
      },
    })),

  setMessages: (sessionKey, messages) =>
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionKey]: messages,
      },
    })),

  updateMessageStatus: (sessionKey, id, status) =>
    set((state) => {
      const messages = state.messagesBySession[sessionKey];
      if (!messages) return state;
      return {
        messagesBySession: {
          ...state.messagesBySession,
          [sessionKey]: messages.map((msg) =>
            msg.id === id || msg.tempId === id ? { ...msg, status } : msg,
          ),
        },
      };
    }),

  updateMessageId: (sessionKey, tempId, realId) =>
    set((state) => {
      const messages = state.messagesBySession[sessionKey];
      if (!messages) return state;
      return {
        messagesBySession: {
          ...state.messagesBySession,
          [sessionKey]: messages.map((msg) =>
            msg.tempId === tempId || msg.id === tempId
              ? { ...msg, id: realId }
              : msg,
          ),
        },
      };
    }),

  migrateSessionMessages: (oldKey, newKey) =>
    set((state) => {
      const messages = state.messagesBySession[oldKey];
      if (!messages) return state;
      const next = { ...state.messagesBySession };
      delete next[oldKey];
      next[newKey] = messages;
      return { messagesBySession: next };
    }),

  clearSessionMessages: (sessionKey) =>
    set((state) => {
      const next = { ...state.messagesBySession };
      delete next[sessionKey];
      return { messagesBySession: next };
    }),
}));
