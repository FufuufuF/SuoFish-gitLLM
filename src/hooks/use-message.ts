import { useCallback } from "react";
import { chat as chatApi, getMessageList } from "@/api/common";
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
    updateMessageStatus,
    confirmMessage,
  } = useMessageStore.getState();

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

  /**
   * 发送消息（已有会话场景）
   * 新会话首条消息由 useChatOrchestrator 处理
   */
  const sendMessage = useCallback(
    async (content: string, chatSessionId: number) => {
      if (!threadId || typeof threadId !== "number") {
        throw new Error("Cannot send message without a real threadId");
      }

      const tempMsgId = crypto.randomUUID();

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
        const response = await chatApi({
          chat_session_id: chatSessionId,
          thread_id: threadId,
          content,
        });

        // 数据转换
        const humanMsg = mapMessageInToMessage(response.human_message);
        const aiMsg = mapMessageInToMessage(response.ai_message);

        // 原子替换临时 ID 并标记成功
        confirmMessage(threadId, tempMsgId, Number(humanMsg.id));

        // 添加 AI 回复
        addMessage(threadId, aiMsg);
      } catch (error) {
        console.error("Failed to send message:", error);
        updateMessageStatus(threadId, tempMsgId, MessageStatusEnum.ERROR);
      }
    },
    [threadId, addMessage, confirmMessage, updateMessageStatus],
  );

  return {
    messages,
    sendMessage,
    fetchMessages,
  };
}
