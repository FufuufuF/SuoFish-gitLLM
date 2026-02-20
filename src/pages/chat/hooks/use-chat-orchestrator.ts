import { useNavigate } from "react-router-dom";
import { chat as chatApi } from "@/api/common";
import { useChatSession } from "@/hooks";
import { useMessageStore } from "@/stores/message-store";
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
  const { createSession, confirmSessionCreation, markSessionError } =
    useChatSession();
  const {
    addMessage,
    updateMessageId,
    updateMessageStatus,
    migrateThreadMessages,
  } = useMessageStore();

  /**
   * 发送新会话的第一条消息
   * @returns tempSessionId — 供 ChatPage 通过 store 的 activeSessionId 立即展示乐观消息
   */
  const sendFirstMessage = async (content: string): Promise<string> => {
    // 1. 创建 session（乐观更新，同时设置 activeSessionId = tempSessionId）
    const tempSessionId = createSession();

    // 2. 生成临时 threadId（在后端创建 thread 之前的占位 key）
    const tempThreadId = crypto.randomUUID();
    const tempMsgId = crypto.randomUUID();

    // 3. 乐观添加用户消息，key 为临时 threadId
    addMessage(tempThreadId, {
      id: tempMsgId,
      tempId: tempMsgId,
      role: 1,
      content,
      status: "sending",
      timestamp: new Date(),
    });

    try {
      // 4. 调用 chat API（-1 表示让后端创建新 session 和 thread）
      const response = await chatApi({
        chat_session_id: -1,
        thread_id: -1,
        content,
      });

      // 5. 更新消息状态（在迁移前完成，确保数据完整）
      const humanMsg = mapMessageInToMessage(response.human_message);
      const aiMsg = mapMessageInToMessage(response.ai_message);
      updateMessageId(tempThreadId, tempMsgId, Number(humanMsg.id));
      updateMessageStatus(tempThreadId, Number(humanMsg.id), "success");
      addMessage(tempThreadId, aiMsg);

      // 6. 将消息从临时 threadId 迁移到真实 threadId
      migrateThreadMessages(tempThreadId, response.thread_id);

      // 7. 确认 session 创建（更新 id + activeThreadId + status）
      confirmSessionCreation(
        tempSessionId,
        response.chat_session_id,
        response.thread_id,
      );

      // 8. 路由跳转到真实会话 URL（replace 避免 history 污染）
      navigate(`/chat/${response.chat_session_id}`, { replace: true });
    } catch (error) {
      console.error("Failed to create session and send message:", error);
      updateMessageStatus(tempThreadId, tempMsgId, "error");
      markSessionError(tempSessionId);
    }

    return tempSessionId;
  };

  return { sendFirstMessage };
}
