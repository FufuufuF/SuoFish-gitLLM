import { useMemo } from "react";
import { MessageItem } from "./message-item";
import { ThreadForkDivider } from "./thread-fork-divider";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  activeThreadId?: number | null;
  parentThreadTitle?: string;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string | number) => void;
}

export function MessageList({
  messages,
  activeThreadId,
  parentThreadTitle,
  onCopy,
  onRegenerate,
}: MessageListProps) {
  const firstCurrentIdx = useMemo(() => {
    if (activeThreadId === null || messages.length === 0) return -1;
    return messages.findIndex(
      (msg) => msg.threadId !== null && msg.threadId === activeThreadId,
    );
  }, [messages, activeThreadId]);

  if (messages.length === 0) {
    return null;
  }

  const isAllAncestor = activeThreadId !== null && firstCurrentIdx === -1;
  const showDivider = isAllAncestor || firstCurrentIdx > 0;

  return (
    <div className="flex flex-col gap-6 py-4">
      {messages.map((message, index) => {
        const isAncestor =
          isAllAncestor || (firstCurrentIdx > 0 && index < firstCurrentIdx);

        return (
          <div key={message.id}>
            {showDivider && !isAllAncestor && index === firstCurrentIdx && (
              <ThreadForkDivider parentThreadTitle={parentThreadTitle} />
            )}
            <MessageItem
              message={message}
              isAncestor={isAncestor}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
            />
          </div>
        );
      })}

      {showDivider && isAllAncestor && (
        <ThreadForkDivider parentThreadTitle={parentThreadTitle} />
      )}
    </div>
  );
}
