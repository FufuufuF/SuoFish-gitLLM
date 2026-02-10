import { chat as chatApi, getMessage as getMessageApi } from "@/pages/api";
import type { ChatMessage } from "@/pages/api/message";
import type { Message, MessageRole } from "@/types";
import { useChatSession } from "@/hooks/use-chat-session";
import { useMessageStore } from "@/stores/message-store";

/**
 * 将 API 层的 ChatMessage 转换为业务层的 Message
 */
const mapChatMessageToMessage = (
  chatMsg: ChatMessage,
  role: MessageRole,
): Message => ({
  id: chatMsg.id,
  role,
  content: chatMsg.content,
  status: "success",
  timestamp: new Date(chatMsg.create_at),
});

export function useMessage() {
  const {
    messageList,
    addMessage,
    updateMessage,
    updateMessageStatus,
    updateMessageId,
  } = useMessageStore();

  const {
    isNewSessionMode,
    activeSession,
    createSession,
    confirmSessionCreation,
    markSessionError,
  } = useChatSession();

  /**
   * 获取历史消息的回调函数
   * 由组件在 useEffect 中自行调用，控制触发时机
   */
  const fetchMessages = async (
    page: number = 1,
    pageSize: number = 50,
  ) => {
    try {
      const response = await getMessageApi({
        chat_session_id: activeSession!.id,
        thread_id: activeSession!.activeThreadId,
        page,
        page_size: pageSize,
      });
      // 将 API 返回的消息更新到 store
      updateMessage(
        response.messages.map((msg) => ({
          ...msg,
          role: msg.role as MessageRole,
          status: "success" as const,
          timestamp: new Date(msg.create_at),
        })),
      );
      return response;
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      throw error;
    }
  };

  const sendMessage = async (content: string) => {
    // 1. 生成临时消息 ID
    const tempMsgId = crypto.randomUUID();

    // 2. 判断是否是新会话的第一条消息
    let tempSessionId: string | null = null;

    if (isNewSessionMode) {
      // 新会话模式：此时才创建 session 并添加到列表
      tempSessionId = createSession();
    }

    // 3. 乐观更新：立即显示用户消息
    addMessage({
      id: tempMsgId,
      tempId: tempMsgId,
      role: 1,
      content,
      status: "sending",
      timestamp: new Date(),
    });

    try {
      // 4. 调用 chat API
      // 如果是新会话 假定chat_session_id为-1，让后端创建
      const response = await chatApi({
        chat_session_id: 1, // TODO: 根据实际情况处理 chat_session_id
        thread_id: 1, // TODO: 根据实际情况处理 thread_id
        content,
      });

      // 5. 如果是新会话，更新 session store
      if (tempSessionId) {
        confirmSessionCreation(
          tempSessionId,
          response.chat_session_id,
          // response.session_title // 如果后端返回了标题
        );
      }

      // 6. 在 hook 层进行数据转换
      const humanMsg = mapChatMessageToMessage(response.human_message, 1);
      const aiMsg = mapChatMessageToMessage(response.ai_message, 2);

      // 7. 将用户消息的 tempId 替换为真实 ID，并标记成功
      updateMessageId(tempMsgId, Number(humanMsg.id));
      updateMessageStatus(Number(humanMsg.id), "success");

      // 8. 添加 AI 回复
      addMessage(aiMsg);
    } catch (error) {
      console.error("Failed to send message:", error);
      // 失败：标记消息为错误状态
      updateMessageStatus(tempMsgId, "error");

      // 如果是新会话，同时标记 session 为错误状态
      if (tempSessionId) {
        markSessionError(tempSessionId);
      }
    }
  };

  return {
    messageList,
    sendMessage,
    fetchMessages,
  };
}
