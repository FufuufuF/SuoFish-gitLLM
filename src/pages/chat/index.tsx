import { Box } from "@mui/material";
import { ChatInput } from "./components";
import { useMessage } from "./hooks/use-message";

export function ChatPage() {
  const { sendMessage } = useMessage();
  const handleSend = async (content: string) => {
    const { ai_message } = await sendMessage(content);
    console.log(ai_message);
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
      <Box sx={{ width: "100%" }}></Box>
      <Box sx={{ width: "80%" }}>
        <ChatInput onSend={handleSend} />
      </Box>
    </Box>
  );
}
