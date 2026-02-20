import { useCallback } from "react";
import { chat as chatApi, getMessageList } from "@/api/common";
import type { MessageIn } from "@/api/common/message";
import { PageDirection } from "@/api/core/types";
import type { Message, MessageRole } from "@/types";
import { useMessageStore } from "@/stores/message-store";

/**
 * 将 API 层的 MessageIn 转换为业务层的 Message
 */
export const mapMessageInToMessage = (msg: MessageIn): Message => ({
  id: msg.id,
  role: msg.role as MessageRole,
  content: msg.content,
  status: "success",
  timestamp: new Date(msg.create_at),
  threadId: msg.thread_id,
});

/**
 * 纯消息管理 Hook — 参数驱动，不依赖 session store
 * @param sessionKey 当前 session 的标识 (可以是数字 ID 或临时 UUID)
 * @param threadId 当前活跃的 thread ID
 */
export function useMessage(
  sessionKey?: string | number | null,
  threadId?: number,
) {
  const {
    getMessages,
    addMessage,
    setMessages,
    updateMessageStatus,
    updateMessageId,
  } = useMessageStore();

  const messages = sessionKey ? getMessages(sessionKey) : [];

  /**
   * 获取历史消息（游标分页）
   * @param cursor 游标 ID，不传则从最新一页开始
   * @param limit 每页条数
   */
  const fetchMessages = useCallback(
    async (cursor?: number, limit: number = 50) => {
      if (!sessionKey || !threadId) return;

      try {
        const response = await getMessageList({
          thread_id: threadId,
          direction: PageDirection.BEFORE,
          limit,
          cursor,
        });
        setMessages(sessionKey, response.messages.map(mapMessageInToMessage));
        return response;
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        throw error;
      }
    },
    [sessionKey, threadId, setMessages],
  );

  /**
   * 发送消息（已有会话场景，新会话首条消息由 useChatOrchestrator 处理）
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionKey || !threadId) {
        throw new Error("Cannot send message without active session");
      }

      const tempMsgId = crypto.randomUUID();

      // 乐观更新：立即显示用户消息
      addMessage(sessionKey, {
        id: tempMsgId,
        tempId: tempMsgId,
        role: 1,
        content,
        status: "sending",
        timestamp: new Date(),
      });

      try {
        const response = await chatApi({
          chat_session_id: Number(sessionKey),
          thread_id: threadId,
          content,
        });

        // 数据转换
        const humanMsg = mapMessageInToMessage(response.human_message);
        const aiMsg = mapMessageInToMessage(response.ai_message);

        // 替换临时 ID，标记成功
        updateMessageId(sessionKey, tempMsgId, Number(humanMsg.id));
        updateMessageStatus(sessionKey, Number(humanMsg.id), "success");

        // 添加 AI 回复
        addMessage(sessionKey, aiMsg);
      } catch (error) {
        console.error("Failed to send message:", error);
        updateMessageStatus(sessionKey, tempMsgId, "error");
      }
    },
    [sessionKey, threadId, addMessage, updateMessageId, updateMessageStatus],
  );

  return {
    messages,
    sendMessage,
    fetchMessages,
  };
}
