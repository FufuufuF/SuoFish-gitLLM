import { Box } from "@mui/material";
import { MessageItem } from "./message-item";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  /** 复制成功回调 */
  onCopy?: (content: string) => void;
  /** 重新生成回调 */
  onRegenerate?: (messageId: string | number) => void;
}

/**
 * 消息列表组件
 * - 渲染消息列表
 * - 自动滚动到底部（可扩展）
 */
export function MessageList({
  messages,
  onCopy,
  onRegenerate,
}: MessageListProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        py: 2,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
        />
      ))}
    </Box>
  );
}
