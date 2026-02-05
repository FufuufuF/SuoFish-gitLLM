import { chat as chatApi } from "../../api";
export function useMessage() {
  const sendMessage = async (content: string) => {
    const response = await chatApi({
      chat_session_id: 1,
      thread_id: 1,
      content,
    });
    return response;
  };

  return {
    sendMessage,
  };
}
