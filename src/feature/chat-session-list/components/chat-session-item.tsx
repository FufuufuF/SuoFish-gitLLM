import { useState } from "react";
import {
  ListItemButton,
  ListItemText,
  IconButton,
  Skeleton,
  Box,
} from "@mui/material";
import { MoreVert, ErrorOutline, ChatBubbleOutline } from "@mui/icons-material";
import type { ChatSession } from "@/types";

// ===== 类型定义 =====

export interface ChatSessionItemProps {
  /** 会话数据 */
  session: ChatSession;
  /** 是否为当前激活的会话 */
  isActive: boolean;
  /** 标题是否正在生成中（显示 Skeleton 占位） */
  isTitleGenerating: boolean;
  /** 点击会话项 */
  onClick: (sessionId: string | number) => void;
  /** 点击操作菜单按钮 */
  onMenuClick?: (sessionId: string | number, anchor: HTMLElement) => void;
}

// ===== 辅助函数 =====

/** 获取会话的唯一标识（优先使用真实 id，fallback 到 tempId） */
function getSessionKey(session: ChatSession): string | number {
  return session.id ?? session.tempId ?? "";
}

// ===== 组件实现 =====

export function ChatSessionItem({
  session,
  isActive,
  isTitleGenerating,
  onClick,
  onMenuClick,
}: ChatSessionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sessionKey = getSessionKey(session);
  const isCreating = session.status === "creating";
  const isError = session.status === "error";
  const showSkeleton = isCreating && isTitleGenerating;

  const handleClick = () => {
    onClick(sessionKey);
  };

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // 阻止触发 ListItemButton 的 onClick
    onMenuClick?.(sessionKey, e.currentTarget);
  };

  return (
    <ListItemButton
      selected={isActive}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        borderRadius: 2,
        mx: 1,
        mb: 0.5,
        py: 1,
        px: 1.5,
        minHeight: 44,
        transition: "background-color 0.15s ease",
        "&.Mui-selected": {
          bgcolor: "action.selected",
          "&:hover": {
            bgcolor: "action.selected",
          },
        },
      }}
    >
      {/* 会话图标 */}
      <ChatBubbleOutline
        sx={{
          fontSize: 18,
          color: isError ? "error.main" : "text.secondary",
          mr: 1.5,
          flexShrink: 0,
        }}
      />

      {/* 标题区域 */}
      {showSkeleton ? (
        <Skeleton variant="text" width="70%" sx={{ fontSize: "1.4rem" }} />
      ) : (
        <ListItemText
          primary={session.title || "新对话"}
          primaryTypographyProps={{
            variant: "body2",
            noWrap: true,
            sx: {
              color: isError ? "error.main" : "text.primary",
              fontWeight: isActive ? 600 : 400,
              fontSize: "1.2rem",
            },
          }}
        />
      )}

      {/* 右侧区域：错误图标 / 操作菜单 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          ml: "auto",
          flexShrink: 0,
        }}
      >
        {isError && (
          <ErrorOutline
            sx={{
              fontSize: 16,
              color: "error.main",
              mr: 0.5,
            }}
          />
        )}

        {/* 操作菜单按钮 - 仅在 hover 时显示 */}
        {isHovered && !showSkeleton && (
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{
              color: "text.secondary",
              p: 0.5,
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <MoreVert sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
    </ListItemButton>
  );
}
