import { useMemo } from "react";
import { Box } from "@mui/material";
import { MessageItem } from "./message-item";
import { ThreadForkDivider } from "./thread-fork-divider";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  /** 当前活跃线程 ID，用于区分祖先/当前分支消息 */
  activeThreadId?: number | null;
  /** 父线程标题，用于分叉点分隔栏展示 */
  parentThreadTitle?: string;
  /** 复制成功回调 */
  onCopy?: (content: string) => void;
  /** 重新生成回调 */
  onRegenerate?: (messageId: string | number) => void;
}

/**
 * 消息列表组件
 * - 分区渲染：祖先消息区 → 分叉点分隔栏 → 当前分支消息区
 * - 祖先消息传入 isAncestor=true，降权显示
 * - BRIEF 类型消息由 MessageItem 内部路由给 BriefMessageItem
 */
export function MessageList({
  messages,
  activeThreadId,
  parentThreadTitle,
  onCopy,
  onRegenerate,
}: MessageListProps) {
  // 找到第一条属于当前线程的消息索引
  // 必须在 early return 前调用，保证 hooks 调用顺序稳定
  const firstCurrentIdx = useMemo(() => {
    if (activeThreadId == null || messages.length === 0) return -1;
    return messages.findIndex(
      (msg) => msg.threadId != null && msg.threadId === activeThreadId,
    );
  }, [messages, activeThreadId]);

  if (messages.length === 0) {
    return null;
  }

  // 刚切出的分支（activeThreadId 有效但还没发任何消息）：
  //   firstCurrentIdx === -1 → 列表中全部是祖先消息，分隔栏置于列表末尾
  // 已有分支消息：
  //   firstCurrentIdx > 0  → 边界前为祖先，分隔栏插在边界处
  const isAllAncestor = activeThreadId != null && firstCurrentIdx === -1;

  const showDivider = isAllAncestor || firstCurrentIdx > 0;

  return (
    <Box
      sx={{
        py: 2,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {messages.map((message, index) => {
        // 判断该消息是否属于祖先线程
        const isAncestor =
          isAllAncestor || (firstCurrentIdx > 0 && index < firstCurrentIdx);

        return (
          <Box key={message.id}>
            {/* 在第一条当前分支消息前插入分叉点分隔栏（有分支消息的情况） */}
            {showDivider && !isAllAncestor && index === firstCurrentIdx && (
              <ThreadForkDivider parentThreadTitle={parentThreadTitle} />
            )}
            <MessageItem
              message={message}
              isAncestor={isAncestor}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
            />
          </Box>
        );
      })}

      {/* 刚切出的分支（无当前线程消息时）：分隔栏显示在所有祖先消息之后 */}
      {showDivider && isAllAncestor && (
        <ThreadForkDivider parentThreadTitle={parentThreadTitle} />
      )}
    </Box>
  );
}
