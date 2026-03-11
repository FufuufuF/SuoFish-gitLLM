import { memo, useState } from "react";
import {
  Box,
  IconButton,
  Avatar,
  Typography,
  CircularProgress,
} from "@mui/material";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Check from "@mui/icons-material/Check";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import { MarkdownContent } from "./markdown-content";
import { MessageActions } from "./message-actions";
import { BriefMessageItem } from "./brief-message-item";
import { ThinkingSkeleton } from "@/components/skeletons";
import type { Message } from "@/types";
import { MessageRoleEnum, MessageStatusEnum, MessageType } from "@/types";
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
export const MessageItem = memo(function MessageItem({
  message,
  isAncestor = false,
  onCopy,
  onRegenerate,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isAI = message.role === MessageRoleEnum.ASSISTANT;

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
          {/* 思考中骨架屏 — 首个 token 到达前 */}
          {message.status === MessageStatusEnum.THINKING && (
            <ThinkingSkeleton />
          )}

          {/* Markdown 内容 */}
          {message.status !== MessageStatusEnum.THINKING && (
            <MarkdownContent content={message.content} />
          )}

          {/* 流式生成指示器 */}
          {message.status === MessageStatusEnum.STREAMING && (
            <Box
              className={styles.streamingDots}
              sx={{ color: "primary.main" }}
            >
              <span />
              <span />
              <span />
            </Box>
          )}

          {/* 生成出错提示 */}
          {message.status === MessageStatusEnum.ERROR && (
            <Box
              className={styles.statusLabel}
              sx={{ color: "error.main", mt: 0.5 }}
            >
              <ErrorOutline sx={{ fontSize: 14 }} />
              <Typography variant="caption">回复出错</Typography>
            </Box>
          )}

          {/* 已停止生成提示 */}
          {message.status === MessageStatusEnum.STOP_STREAMING && (
            <Box
              className={styles.statusLabel}
              sx={{ color: "text.disabled", mt: 0.5 }}
            >
              <Typography variant="caption" sx={{ fontStyle: "italic" }}>
                已停止生成
              </Typography>
            </Box>
          )}

          {/* 底部工具栏：流式生成中 / 思考中隐藏 */}
          {message.status !== MessageStatusEnum.STREAMING &&
            message.status !== MessageStatusEnum.THINKING && (
            <MessageActions
              content={message.content}
              messageId={message.id}
              isAncestor={isAncestor}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
            />
          )}
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

        {/* 消息气泡：祖先消息颜色降级，出错时加边框提示 */}
        <Box
          className={styles.humanBubble}
          sx={{
            bgcolor: isAncestor ? "action.focus" : "action.hover",
            color: isAncestor ? "text.secondary" : "text.primary",
            transition: "background-color 0.2s, color 0.2s, opacity 0.2s",
            ...(message.status === MessageStatusEnum.SENDING && {
              opacity: 0.65,
            }),
            ...(message.status === MessageStatusEnum.ERROR && {
              outline: "1.5px solid",
              outlineColor: "error.main",
            }),
          }}
        >
          {message.content}
        </Box>

        {/* 发送中提示 */}
        {message.status === MessageStatusEnum.SENDING && (
          <Box
            className={styles.statusLabel}
            sx={{ justifyContent: "flex-end", color: "text.disabled", mt: 0.5 }}
          >
            <CircularProgress size={10} color="inherit" />
            <Typography variant="caption">发送中</Typography>
          </Box>
        )}

        {/* 发送失败提示 */}
        {message.status === MessageStatusEnum.ERROR && (
          <Box
            className={styles.statusLabel}
            sx={{ justifyContent: "flex-end", color: "error.main", mt: 0.5 }}
          >
            <ErrorOutline sx={{ fontSize: 14 }} />
            <Typography variant="caption">发送失败</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
});
