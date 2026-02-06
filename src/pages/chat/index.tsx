import { useEffect } from "react";
import { Box } from "@mui/material";
import { ChatInput, MessageList } from "./components";
import { useMessage } from "./hooks/use-message";

export function ChatPage() {
  const { sendMessage, messageList, fetchMessages } = useMessage();

  // 组件挂载时获取历史消息
  // TODO: 替换为实际的 chatSessionId 和 threadId
  useEffect(() => {
    const chatSessionId = 1; // MOCK
    const threadId = 1; // MOCK
    fetchMessages(chatSessionId, threadId);
  }, []);

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
        width: "100%",
        height: "100%",
      }}
    >
      <Box sx={{ width: "100%" }}>
        <MessageList messages={messageList} />
      </Box>
      <Box sx={{ width: "80%" }}>
        <ChatInput onSend={handleSend} />
      </Box>
    </Box>
  );
}
