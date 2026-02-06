import { Box } from "@mui/material";
import { ChatInput, MessageList } from "./components";
import { useMessage } from "./hooks/use-message";
import type { Message } from "./types";

export function ChatPage() {
  const { sendMessage, messageList } = useMessage();
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
