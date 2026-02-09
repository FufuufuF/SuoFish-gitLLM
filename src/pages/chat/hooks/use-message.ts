import { chat as chatApi, getMessage as getMessageApi } from "@/pages/api";
import type { ChatMessage } from "@/pages/api/message";
import type { Message, MessageRole } from "@/types";

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

  /**
   * 获取历史消息的回调函数
   * 由组件在 useEffect 中自行调用，控制触发时机
   */
  const fetchMessages = async (
    chatSessionId: number,
    threadId: number,
    page: number = 1,
    pageSize: number = 50,
  ) => {
    try {
      const response = await getMessageApi({
        chat_session_id: chatSessionId,
        thread_id: threadId,
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
    // 1. 生成临时 ID (兼容没有 uuid 库的情况)
    const tempId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

    // 2. 乐观更新：立即显示用户消息
    addMessage({
      id: tempId, // 临时 ID
      tempId: tempId,
      role: 1,
      content,
      status: "sending",
      timestamp: new Date(),
    });

    try {
      // TODO: 添加实际需要的所有请求参数
      const response = await chatApi({
        chat_session_id: 1, // MOCK
        thread_id: 1, // MOCK
        content,
      });

      // 3. 成功后：在 hook 层进行数据转换
      const humanMsg = mapChatMessageToMessage(response.human_message, 1);
      const aiMsg = mapChatMessageToMessage(response.ai_message, 2);

      // a) 将用户消息的 tempId 替换为真实 ID，并标记成功
      updateMessageId(tempId, Number(humanMsg.id));
      updateMessageStatus(Number(humanMsg.id), "success");

      // b) 添加 AI 回复
      addMessage(aiMsg);
    } catch (error) {
      console.error("Failed to send message:", error);
      // 4. 失败：标记消息为错误状态
      updateMessageStatus(tempId, "error");
    }
  };

  return {
    messageList,
    sendMessage,
    fetchMessages,
  };
}
