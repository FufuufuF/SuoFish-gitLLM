import { Box, Typography } from "@mui/material";
import { ChatBubbleOutline } from "@mui/icons-material";

// ===== 组件实现 =====

export function ChatSessionListEmpty() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        py: 6,
        gap: 1.5,
      }}
    >
      <ChatBubbleOutline
        sx={{
          fontSize: 40,
          color: "text.disabled",
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
        }}
      >
        暂无对话
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: "text.disabled",
        }}
      >
        点击上方按钮开始新对话
      </Typography>
    </Box>
  );
}
