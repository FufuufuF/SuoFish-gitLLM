import { useCallback, useEffect, useRef, useState } from "react";
import { ChatStreamEventType, chatStream, getMessageList } from "@/api/common";
import type { LoadMoreResult } from "@/components/layout/pagination/";
import type { MessageIn } from "@/api/common/message";
import { PageDirection } from "@/api/core/types";
import {
  MessageRoleEnum,
  MessageStatusEnum,
  type Message,
  mapBackendMessageStatusToUiStatus,
  mapBackendMessageTypeToUiType,
} from "@/types";
import { useMessageStore } from "@/stores/message-store";

const EMPTY_MESSAGES_LIST: Message[] = [];

/**
 * 将 API 层的 MessageIn 转换为业务层的 Message
 */
export const mapMessageInToMessage = (msg: MessageIn): Message => ({
  id: msg.id,
  role: msg.role as MessageRoleEnum,
  content: msg.content,
  status: mapBackendMessageStatusToUiStatus(msg.status),
  type: mapBackendMessageTypeToUiType(msg.type),
  timestamp: new Date(msg.create_at),
  threadId: msg.thread_id,
});

/**
 * 纯消息管理 Hook — 以 threadId 为最小存储单元
 * @param threadId 当前活跃的 thread ID（真实 ID 或乐观更新阶段的临时 UUID）
 */
export function useMessage(threadId?: string | number | null) {
  const {
    addMessage,
    prependMessages,
    setMessages,
    updateMessageId,
    updateMessageStatus,
    startStreaming,
    appendStreamingContent,
    finalizeStreaming,
    abortStreaming,
  } = useMessageStore.getState();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const messages = useMessageStore((state) =>
    threadId
      ? (state.messagesByThread[threadId] ?? EMPTY_MESSAGES_LIST)
      : EMPTY_MESSAGES_LIST,
  );

  /**
   * 加载消息（游标分页）
   * - cursor 为空：初始加载，覆盖写入 store
   * - cursor 有值：向上翻页，插入到消息列表头部
   * @param cursor 游标，不传则从最新一条开始
   * @param limit  每页条数，默认 5
   */
  const fetchMessages = useCallback(
    async (cursor?: string, limit: number = 5) => {
      if (!threadId || typeof threadId === "string") return; // 临时 threadId 阶段不请求

      try {
        const response = await getMessageList({
          thread_id: threadId,
          direction: PageDirection.BEFORE,
          limit,
          cursor,
        });

        const mapped = response.messages.map(mapMessageInToMessage);

        if (cursor) {
          prependMessages(threadId, mapped);
        } else {
          setMessages(threadId, mapped);
        }

        return response;
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        throw error;
      }
    },
    [threadId, prependMessages, setMessages],
  );

  /**
   * fetchMore 适配层 — 供 UpwardInfiniteList 使用
   * - 临时 threadId（string）或 threadId 为空时，直接返回 hasMore:false，不发请求
   * - 正常情况下调用 fetchMessages 并映射为 LoadMoreResult
   */
  const fetchMoreMessages = useCallback(
    async (cursor?: string): Promise<LoadMoreResult> => {
      if (!threadId || typeof threadId === "string") {
        return { hasMore: false };
      }
      const response = await fetchMessages(cursor);
      return {
        nextCursor: response?.next_cursor,
        hasMore: response?.has_more ?? false,
      };
    },
    [threadId, fetchMessages],
  );

  const cancelStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    if (threadId) {
      abortStreaming(threadId);
    }
  }, [threadId, abortStreaming]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * 发送消息（已有会话场景，流式版本）
   * 新会话首条消息由 useChatOrchestrator 处理
   */
  const sendMessage = useCallback(
    async (content: string, chatSessionId: number) => {
      if (!threadId || typeof threadId !== "number") {
        throw new Error("Cannot send message without a real threadId");
      }

      const tempMsgId = crypto.randomUUID();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsStreaming(true);

      // rAF 节流缓冲 — 将同一帧内收到的多个 token 合并为一次 store 写入
      // 使用局部变量而非 useRef，保证每次 sendMessage 调用有独立的缓冲区
      let tokenBuffer = "";
      let rafHandle: number | null = null;

      const flushTokenBuffer = () => {
        if (tokenBuffer) {
          appendStreamingContent(threadId as number, tokenBuffer);
          tokenBuffer = "";
        }
        rafHandle = null;
      };

      // 乐观更新：立即显示用户消息
      addMessage(threadId, {
        id: tempMsgId,
        tempId: tempMsgId,
        role: MessageRoleEnum.USER,
        content,
        status: MessageStatusEnum.SENDING,
        timestamp: new Date(),
        threadId,
      });

      try {
        const stream = chatStream(
          {
            chat_session_id: chatSessionId,
            thread_id: threadId,
            content,
          },
          abortController.signal,
        );

        let hasStartedStreaming = false;

        for await (const event of stream) {
          switch (event.type) {
            case ChatStreamEventType.HUMAN_MESSAGE_CREATED: {
              const humanMsg = mapMessageInToMessage(event.data.message);
              updateMessageId(threadId, tempMsgId, Number(humanMsg.id));
              updateMessageStatus(
                threadId,
                Number(humanMsg.id),
                MessageStatusEnum.SUCCESS,
              );
              break;
            }

            case ChatStreamEventType.TOKEN: {
              if (!hasStartedStreaming) {
                startStreaming(threadId, {
                  id: `streaming-${threadId}-${Date.now()}`,
                  role: MessageRoleEnum.ASSISTANT,
                  content: "",
                  status: MessageStatusEnum.STREAMING,
                  timestamp: new Date(),
                  threadId,
                });
                hasStartedStreaming = true;
              }
              // 积累 token，下一帧批量写入 store
              tokenBuffer += event.data.content;
              if (!rafHandle) {
                rafHandle = requestAnimationFrame(flushTokenBuffer);
              }
              break;
            }

            case ChatStreamEventType.AI_MESSAGE_CREATED: {
              const aiMsg = mapMessageInToMessage(event.data.message);
              finalizeStreaming(threadId, aiMsg);
              break;
            }

            case ChatStreamEventType.ERROR: {
              console.error("Stream error:", event.data.message);
              abortStreaming(threadId);
              return;
            }
          }
        }
      } catch (error) {
        const isAborted =
          error instanceof DOMException && error.name === "AbortError";
        if (!isAborted) {
          console.error("Failed to send message:", error);
          updateMessageStatus(threadId, tempMsgId, MessageStatusEnum.ERROR);
        }
        abortStreaming(threadId);
      } finally {
        // 取消可能还挂起的 rAF，并同步 flush 残留 buffer
        // 防止流结束时最后一批 token 因 rAF 未执行而丢失
        if (rafHandle !== null) {
          cancelAnimationFrame(rafHandle);
          flushTokenBuffer();
        }
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
      }
    },
    [
      threadId,
      addMessage,
      updateMessageId,
      updateMessageStatus,
      startStreaming,
      appendStreamingContent,
      finalizeStreaming,
      abortStreaming,
    ],
  );

  return {
    messages,
    sendMessage,
    fetchMessages,
    fetchMoreMessages,
    cancelStreaming,
    isStreaming,
  };
}
