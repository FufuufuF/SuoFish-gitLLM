import { MessageStatusEnum, type Message } from "@/types";
import { create } from "zustand";

export interface MessageStore {
  /** 按 threadId 索引的消息列表 */
  messagesByThread: Record<string | number, Message[]>;

  /** 追加单条消息到指定 thread 尾部（用于发送/接收消息） */
  addMessage: (threadId: string | number, message: Message) => void;

  /** 向头部批量插入消息（用于向上加载历史消息） */
  prependMessages: (threadId: string | number, messages: Message[]) => void;

  /** 覆盖写入指定 thread 的完整消息列表（用于初始加载） */
  setMessages: (threadId: string | number, messages: Message[]) => void;

  /** 更新指定 thread 中某条消息的发送状态 */
  updateMessageStatus: (
    threadId: string | number,
    id: number | string,
    status: MessageStatusEnum,
  ) => void;

  /** 用真实 ID 替换临时消息 ID */
  updateMessageId: (
    threadId: string | number,
    tempId: string,
    realId: number,
  ) => void;

  /** 原子确认消息：一次性替换临时 ID 并标记为 success（替代 updateMessageId + updateMessageStatus 两步调用） */
  confirmMessage: (
    threadId: string | number,
    tempId: string,
    realId: number,
  ) => void;

  /**
   * 将消息从临时 threadId（string | number）迁移到真实 threadId（number）
   * 用于新会话第一条消息发送成功后的乐观更新确认
   */
  migrateThreadMessages: (
    tempThreadId: string | number,
    realThreadId: number,
  ) => void;

  /** 清除指定 thread 的消息缓存 */
  clearThreadMessages: (threadId: string | number) => void;

  /** 开始流式接收消息 */
  startStreaming: (
    threadId: string | number,
    placeHolderMessage: Message,
  ) => void;

  /** 追加流式消息 */
  appendStreamingContent: (threadId: string | number, token: string) => void;

  /** 结束流式消息（标记最后一条消息为 success） */
  finalizeStreaming: (threadId: string | number, finalMessage: Message) => void;

  /** 放弃流式消息 */
  abortStreaming: (threadId: string | number) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messagesByThread: {},

  addMessage: (threadId, message) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] ?? []), message],
      },
    })),

  prependMessages: (threadId, messages) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...messages, ...(state.messagesByThread[threadId] ?? [])],
      },
    })),

  setMessages: (threadId, messages) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: messages,
      },
    })),

  updateMessageStatus: (threadId, id, status) =>
    set((state) => {
      const messages = state.messagesByThread[threadId];
      if (!messages) return state;
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: messages.map((msg) =>
            msg.id === id || msg.tempId === id ? { ...msg, status } : msg,
          ),
        },
      };
    }),

  updateMessageId: (threadId, tempId, realId) =>
    set((state) => {
      const messages = state.messagesByThread[threadId];
      if (!messages) return state;
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: messages.map((msg) =>
            msg.tempId === tempId || msg.id === tempId
              ? { ...msg, id: realId }
              : msg,
          ),
        },
      };
    }),

  confirmMessage: (threadId, tempId, realId) =>
    set((state) => {
      const messages = state.messagesByThread[threadId];
      if (!messages) return state;
      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: messages.map((msg) =>
            msg.tempId === tempId || msg.id === tempId
              ? { ...msg, id: realId, status: MessageStatusEnum.SUCCESS }
              : msg,
          ),
        },
      };
    }),

  migrateThreadMessages: (tempThreadId, realThreadId) =>
    set((state) => {
      const messages = state.messagesByThread[tempThreadId];
      if (!messages) return state;
      const next = { ...state.messagesByThread };
      delete next[tempThreadId];
      next[realThreadId] = messages;
      return { messagesByThread: next };
    }),

  clearThreadMessages: (threadId) =>
    set((state) => {
      const next = { ...state.messagesByThread };
      delete next[threadId];
      return { messagesByThread: next };
    }),

  startStreaming: (threadId, placeHolderMessage) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [
          ...(state.messagesByThread[threadId] ?? []),
          placeHolderMessage,
        ],
      },
    })),

  appendStreamingContent: (threadId, token) =>
    set((state) => {
      const messages = state.messagesByThread[threadId];
      if (!messages || messages.length === 0) return state;

      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.status !== MessageStatusEnum.STREAMING &&
        lastMessage.status !== MessageStatusEnum.THINKING
      )
        return state;

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: [
            ...messages.slice(0, -1),
            {
              ...lastMessage,
              content: lastMessage.content + token,
              status: MessageStatusEnum.STREAMING,
            },
          ],
        },
      };
    }),

  finalizeStreaming: (threadId, finalMessage) =>
    set((state) => {
      const messages = state.messagesByThread[threadId];
      if (!messages || messages.length === 0) return state;

      return {
        messagesByThread: {
          ...state.messagesByThread,
          [threadId]: [
            ...messages.slice(0, -1),
            { ...finalMessage, status: MessageStatusEnum.SUCCESS },
          ],
        },
      };
    }),

  abortStreaming: (threadId) =>
    set((state) => {
      const messages = state.messagesByThread[threadId];
      if (!messages || messages.length === 0) return state;

      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.status !== MessageStatusEnum.STREAMING &&
        lastMessage.status !== MessageStatusEnum.THINKING
      )
        return state;

      // THINKING 阶段（无内容）直接移除占位消息
      if (lastMessage.status === MessageStatusEnum.THINKING) {
        return {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: messages.slice(0, -1),
          },
        };
      }

      if (lastMessage.content.trim()) {
        return {
          messagesByThread: {
            ...state.messagesByThread,
            [threadId]: [
              ...messages.slice(0, -1),
              { ...lastMessage, status: MessageStatusEnum.STOP_STREAMING },
            ],
          },
        };
      }
      return state;
    }),
}));
