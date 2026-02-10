import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { Add } from "@mui/icons-material";

// ===== 类型定义 =====

export interface ChatSessionListHeaderProps {
  /** 点击新建会话 */
  onCreateSession: () => void;
}

// ===== 组件实现 =====

export function ChatSessionListHeader({
  onCreateSession,
}: ChatSessionListHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1.5,
        flexShrink: 0,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          color: "text.secondary",
          fontWeight: 600,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          fontSize: "1.5rem",
        }}
      >
        对话列表
      </Typography>

      <Tooltip title="新建对话" placement="right">
        <IconButton
          size="small"
          onClick={onCreateSession}
          sx={{
            color: "text.secondary",
            "&:hover": {
              bgcolor: "action.hover",
              color: "primary.main",
            },
          }}
        >
          <Add sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
