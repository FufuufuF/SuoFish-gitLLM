import { useNavigate } from "react-router-dom";
import { chat as chatApi } from "@/pages/api";
import { useChatSession } from "@/hooks";
import { useMessageStore } from "@/stores/message-store";
import { mapChatMessageToMessage } from "./use-message";

/**
 * 新会话编排 Hook — 处理"新会话第一条消息"的跨 store 逻辑
 *
 * 职责:
 * 1. 创建 session（乐观更新）
 * 2. 添加首条用户消息（乐观更新）
 * 3. 调用 chat API
 * 4. 确认 session 创建 + 更新消息 ID
 * 5. 迁移消息到真实 sessionId
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
    migrateSessionMessages,
  } = useMessageStore();

  /**
   * 发送新会话的第一条消息
   * @returns tempSessionId — 供 ChatPage 通过 store 的 activeSessionId 立即展示乐观消息
   */
  const sendFirstMessage = async (content: string): Promise<string> => {
    // 1. 创建 session（乐观更新，同时设置 activeSessionId = tempId）
    const tempSessionId = createSession();

    // 2. 乐观添加用户消息
    const tempMsgId = crypto.randomUUID();
    addMessage(tempSessionId, {
      id: tempMsgId,
      tempId: tempMsgId,
      role: 1,
      content,
      status: "sending",
      timestamp: new Date(),
    });

    try {
      // 3. 调用 chat API（不传有效 session/thread ID，让后端创建）
      const response = await chatApi({
        chat_session_id: -1,
        thread_id: -1,
        content,
      });

      // 4. 更新消息（在迁移前完成，确保数据完整）
      const humanMsg = mapChatMessageToMessage(response.human_message, 1);
      const aiMsg = mapChatMessageToMessage(response.ai_message, 2);
      updateMessageId(tempSessionId, tempMsgId, Number(humanMsg.id));
      updateMessageStatus(tempSessionId, Number(humanMsg.id), "success");
      addMessage(tempSessionId, aiMsg);

      // 5. 先迁移消息到真实 sessionId（避免 confirmSession 改变 activeSessionId 后读不到消息）
      migrateSessionMessages(tempSessionId, response.chat_session_id);

      // 6. 确认 session 创建（更新 id + activeThreadId + status）
      confirmSessionCreation(
        tempSessionId,
        response.chat_session_id,
        response.thread_id,
        // response.session_title // TODO: 如果后端返回了标题
      );

      // 7. 路由跳转到真实会话 URL（replace 避免 history 污染）
      navigate(`/chat/${response.chat_session_id}`, { replace: true });
    } catch (error) {
      console.error("Failed to create session and send message:", error);
      updateMessageStatus(tempSessionId, tempMsgId, "error");
      markSessionError(tempSessionId);
    }

    return tempSessionId;
  };

  return { sendFirstMessage };
}
