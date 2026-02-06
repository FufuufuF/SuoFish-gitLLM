import { chat as chatApi } from "../../api";

import { useMessageStore } from "@/stores/message-store";

export function useMessage() {
  const {
    messageList,
    addMessage,
    updateMessage,
    updateMessageStatus,
    updateMessageId,
  } = useMessageStore();

  const sendMessage = async (content: string) => {
    // 1. 生成临时 ID (兼容没有 uuid 库的情况)
    const tempId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

    // 2. 乐观更新：立即显示用户消息
    addMessage({
      id: tempId, // 临时 ID
      tempId: tempId,
      role: 0,
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

      // 3. 成功后：
      // a) 将用户消息的 tempId 替换为真实 ID，并标记成功
      // 注意：response[0] 是 human_message, response[1] 是 ai_message
      const humanMsg = response[0];
      const aiMsg = response[1];

      if (humanMsg) {
        updateMessageId(tempId, Number(humanMsg.id));
        updateMessageStatus(Number(humanMsg.id), "success");
      }

      // b) 添加 AI 回复
      if (aiMsg) {
        addMessage({
          ...aiMsg,
          status: "success",
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // 4. 失败：标记消息为错误状态
      updateMessageStatus(tempId, "error");
    }
  };

  return {
    messageList,
    sendMessage,
  };
}
