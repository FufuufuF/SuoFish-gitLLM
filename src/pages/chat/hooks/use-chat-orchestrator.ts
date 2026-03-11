import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatStreamEventType, chatStream } from "@/api/common";
import { useChatSession } from "@/hooks";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useMessageStore } from "@/stores/message-store";
import { MessageRoleEnum, MessageStatusEnum } from "@/types";
import { mapMessageInToMessage } from "../../../hooks/use-message";

/**
 * 新会话编排 Hook — 处理"新会话第一条消息"的跨 store 逻辑
 *
 * 职责:
 * 1. 创建 session（乐观更新）
 * 2. 用临时 threadId (UUID) 添加首条用户消息（乐观更新）
 * 3. 调用 chat API
 * 4. 更新消息状态 + 将消息迁移到真实 threadId
 * 5. 确认 session 创建
 * 6. 路由跳转到 /chat/:realId
 */
export function useChatOrchestrator() {
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const { createSession, confirmSessionCreation, markSessionError } =
    useChatSession();
  const { updateActiveThreadId, updateSessionTitle } =
    useChatSessionStore.getState();
  const {
    addMessage,
    updateMessageId,
    updateMessageStatus,
    migrateThreadMessages,
    startStreaming,
    appendStreamingContent,
    finalizeStreaming,
    abortStreaming,
  } = useMessageStore.getState();

  const cancelStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * 发送新会话的第一条消息
   * @returns tempSessionId — 供 ChatPage 通过 store 的 activeSessionId 立即展示乐观消息
   */
  const sendFirstMessage = async (content: string): Promise<string> => {
    // 1. 创建 session（乐观更新，同时设置 activeSessionId = tempSessionId）
    const tempSessionId = createSession();

    // 2. 生成临时 threadId（number 类型，保持与 activeThreadId 一致）
    const optimisticThreadId = -(Date.now() + Math.floor(Math.random() * 1000));
    const tempMsgId = crypto.randomUUID();

    // 2.1 将当前会话 activeThreadId 指向临时 threadId，供页面统一按 activeThreadId 渲染
    updateActiveThreadId(tempSessionId, optimisticThreadId);

    // 3. 乐观添加用户消息，key 为临时 threadId
    addMessage(optimisticThreadId, {
      id: tempMsgId,
      tempId: tempMsgId,
      role: MessageRoleEnum.USER,
      content,
      status: MessageStatusEnum.SENDING,
      timestamp: new Date(),
      threadId: optimisticThreadId,
    });

    // 立即插入 AI 占位消息（THINKING 态），首个 token 到达后切换为 STREAMING
    const streamingMsgId = `streaming-${optimisticThreadId}-${Date.now()}`;
    startStreaming(optimisticThreadId, {
      id: streamingMsgId,
      role: MessageRoleEnum.ASSISTANT,
      content: "",
      status: MessageStatusEnum.THINKING,
      timestamp: new Date(),
      threadId: optimisticThreadId,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsStreaming(true);
    let hasConfirmedHumanMessage = false;

    try {
      const stream = chatStream(
        {
          chat_session_id: -1,
          thread_id: -1,
          content,
        },
        abortController.signal,
      );

      let hasStartedStreaming = false;
      let realThreadId: number | null = null;
      let realChatSessionId: number | null = null;
      let sessionTitle: string | undefined;

      for await (const event of stream) {
        switch (event.type) {
          case ChatStreamEventType.HUMAN_MESSAGE_CREATED: {
            const { chat_session_id, thread_id, message } = event.data;
            realChatSessionId = chat_session_id;
            realThreadId = thread_id;

            updateMessageId(optimisticThreadId, tempMsgId, Number(message.id));
            updateMessageStatus(
              optimisticThreadId,
              Number(message.id),
              MessageStatusEnum.SUCCESS,
            );
            hasConfirmedHumanMessage = true;
            break;
          }

          case ChatStreamEventType.CHAT_SESSION_UPDATED: {
            if (event.data.title) {
              console.log("Received session title update:", event.data.title);
              sessionTitle = event.data.title;
              // 标题事件到达即更新：
              // 1) 先写入临时会话（确保真实 id 未返回时也能即时渲染）
              // 2) 若真实 id 已知，再同步写入真实会话
              updateSessionTitle(tempSessionId, event.data.title);
              if (realChatSessionId !== null) {
                updateSessionTitle(realChatSessionId, event.data.title);
              }
            }
            break;
          }

          case ChatStreamEventType.TOKEN: {
            if (!hasStartedStreaming) {
              // 将占位消息从 THINKING 切换为 STREAMING
              updateMessageStatus(optimisticThreadId, streamingMsgId, MessageStatusEnum.STREAMING);
              hasStartedStreaming = true;
            }
            appendStreamingContent(optimisticThreadId, event.data.content);
            break;
          }

          case ChatStreamEventType.AI_MESSAGE_CREATED: {
            const aiMsg = mapMessageInToMessage(event.data.message);
            finalizeStreaming(optimisticThreadId, aiMsg);
            break;
          }

          case ChatStreamEventType.ERROR: {
            console.error("Stream error:", event.data.message);
            abortStreaming(optimisticThreadId);
            markSessionError(tempSessionId);
            return tempSessionId;
          }
        }
      }

      if (realThreadId && realChatSessionId) {
        migrateThreadMessages(optimisticThreadId, realThreadId);
        confirmSessionCreation(
          tempSessionId,
          realChatSessionId,
          realThreadId,
          sessionTitle,
        );
        navigate(`/chat/${realChatSessionId}`, { replace: true });
      }
    } catch (error) {
      const isAborted =
        error instanceof DOMException && error.name === "AbortError";
      if (!isAborted) {
        console.error("Failed to create session and send message:", error);
      }
      if (!hasConfirmedHumanMessage) {
        updateMessageStatus(
          optimisticThreadId,
          tempMsgId,
          MessageStatusEnum.ERROR,
        );
      }
      abortStreaming(optimisticThreadId);
      markSessionError(tempSessionId);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
    }

    return tempSessionId;
  };

  return { sendFirstMessage, cancelStreaming, isStreaming };
}
