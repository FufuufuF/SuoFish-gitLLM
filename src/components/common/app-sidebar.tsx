import { Box } from "@mui/material";
import { ChatSessionList } from "@/feature/chat-session-list";

// ===== 组件实现 =====

export function AppSidebar() {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: 1,
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      <ChatSessionList />
    </Box>
  );
}
