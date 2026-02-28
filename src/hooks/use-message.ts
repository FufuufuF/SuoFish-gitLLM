import { useCallback, useEffect, useRef, useState } from "react";
import { ChatStreamEventType, chatStream, getMessageList } from "@/api/common";
import type { MessageIn } from "@/api/common/message";
import { PageDirection } from "@/api/core/types";
import { useChatSessionStore } from "@/stores/chat-session-store";
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

  const messages = useMessageStore(
    (state) => (threadId ? state.messagesByThread[threadId] ?? EMPTY_MESSAGES_LIST : EMPTY_MESSAGES_LIST)
  )

  /**
   * 加载消息（游标分页）
   * - cursor 为空：初始加载，覆盖写入 store
   * - cursor 有值：向上翻页，插入到消息列表头部
   * @param cursor 游标，不传则从最新一条开始
   * @param limit  每页条数，默认 50
   */
  const fetchMessages = useCallback(
    async (cursor?: string, limit: number = 50) => {
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

            case ChatStreamEventType.CHAT_SESSION_UPDATED: {
              const { chat_session_id, title } = event.data;
              if (title) {
                useChatSessionStore
                  .getState()
                  .updateSessionTitle(chat_session_id, title);
              }
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
              appendStreamingContent(threadId, event.data.content);
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
    cancelStreaming,
    isStreaming,
  };
}
