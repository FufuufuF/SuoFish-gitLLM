import { useState } from "react";
import { Box, IconButton, Avatar } from "@mui/material";
import {
  ContentCopy,
  Check,
  Refresh,
  ThumbUp,
  ThumbDown,
} from "@mui/icons-material";
import { MarkdownContent } from "./markdown-content";
import { BriefMessageItem } from "./brief-message-item";
import type { Message } from "@/types";
import { MessageType } from "@/types";
import styles from "./index.module.less";
interface MessageItemProps {
  message: Message;
  /** 是否来自祖先线程（降权显示、禁用部分操作） */
  isAncestor?: boolean;
  /** 复制成功回调 */
  onCopy?: (content: string) => void;
  /** 重新生成回调（仅 AI 消息） */
  onRegenerate?: (messageId: string | number) => void;
}

/**
 * 消息项组件
 * - AIMessage: Markdown 渲染，底部显示操作按钮
 * - HumanMessage: 右对齐，悬浮时左侧显示复制按钮
 * - BRIEF 消息: 转发给 BriefMessageItem 渲染
 * - isAncestor=true: 降权样式（颜色灰化，操作按钮受限）
 */
export function MessageItem({
  message,
  isAncestor = false,
  onCopy,
  onRegenerate,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isAI = message.role === 2;

  // BRIEF 消息走专属组件
  if (message.type === MessageType.BRIEF) {
    return <BriefMessageItem message={message} onCopy={onCopy} />;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      onCopy?.(message.content);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  // AI 消息
  if (isAI) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          mb: 3,
          px: 2,
          fontSize: "1.4rem",
          // 祖先消息：整体轻量化
          opacity: isAncestor ? 0.85 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {/* AI 头像：祖先消息变灰 */}
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: isAncestor ? "action.disabled" : "primary.main",
            fontSize: 14,
            flexShrink: 0,
            transition: "background-color 0.2s",
          }}
        >
          ✦
        </Avatar>

        {/* AI 内容区域 */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: "85%",
            // 祖先消息文字颜色降级
            color: isAncestor ? "text.secondary" : "text.primary",
          }}
        >
          {/* Markdown 内容 */}
          <MarkdownContent content={message.content} />

          {/* 底部工具栏：祖先消息只保留复制，隐藏其余操作 */}
          <Box className={styles.aiToolbar}>
            <IconButton
              size="small"
              onClick={handleCopy}
              title="复制"
              sx={{ color: "text.secondary" }}
            >
              {copied ? (
                <Check fontSize="small" />
              ) : (
                <ContentCopy fontSize="small" />
              )}
            </IconButton>

            {/* 以下操作在祖先消息中隐藏 */}
            {!isAncestor && (
              <>
                <IconButton
                  size="small"
                  onClick={() => onRegenerate?.(message.id)}
                  title="重新生成"
                  sx={{ color: "text.secondary" }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  title="有帮助"
                  sx={{ color: "text.secondary" }}
                >
                  <ThumbUp fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  title="没帮助"
                  sx={{ color: "text.secondary" }}
                >
                  <ThumbDown fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // Human 消息
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        px: 2,
        fontSize: "1.4rem",
        // 祖先消息：整体轻量化
        opacity: isAncestor ? 0.75 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* 气泡容器（用于定位悬浮按钮） */}
      <Box className={styles.humanBubbleWrapper} sx={{ position: "relative" }}>
        {/* 悬浮操作按钮：祖先消息隐藏 */}
        {!isAncestor && (
          <Box className={styles.humanActions}>
            <IconButton
              size="small"
              onClick={handleCopy}
              title="复制"
              sx={{
                color: "text.secondary",
                bgcolor: "background.paper",
                boxShadow: 1,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              {copied ? (
                <Check fontSize="small" />
              ) : (
                <ContentCopy fontSize="small" />
              )}
            </IconButton>
          </Box>
        )}

        {/* 消息气泡：祖先消息颜色降级 */}
        <Box
          className={styles.humanBubble}
          sx={{
            bgcolor: isAncestor ? "action.focus" : "action.hover",
            color: isAncestor ? "text.secondary" : "text.primary",
            transition: "background-color 0.2s, color 0.2s",
          }}
        >
          {message.content}
        </Box>
      </Box>
    </Box>
  );
}
