import { memo, useState } from "react";
import { Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";
import { MarkdownContent } from "./markdown-content";
import { MessageActions } from "./message-actions";
import { BriefMessageItem } from "./brief-message-item";
import { ThinkingSkeleton } from "@/components/skeletons";
import type { Message } from "@/types";
import { MessageRoleEnum, MessageStatusEnum, MessageType } from "@/types";

interface MessageItemProps {
  message: Message;
  isAncestor?: boolean;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string | number) => void;
}

export const MessageItem = memo(function MessageItem({
  message,
  isAncestor = false,
  onCopy,
  onRegenerate,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isAI = message.role === MessageRoleEnum.ASSISTANT;

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

  const isStreaming = message.status === MessageStatusEnum.STREAMING;

  if (isAI) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 px-4 text-base transition-opacity duration-200",
          isAncestor && "opacity-85",
        )}
      >
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition-all duration-200",
            isAncestor
              ? "bg-action-disabled-bg text-text-disabled"
              : "bg-primary text-primary-contrast",
            isStreaming && !isAncestor && "animate-glow-pulse",
          )}
        >
          ✦
        </div>

        <div
          className={cn(
            "min-w-0 max-w-[85%] flex-1",
            isAncestor ? "text-text-secondary" : "text-text-primary",
          )}
        >
          {message.status === MessageStatusEnum.THINKING && <ThinkingSkeleton />}

          {message.status !== MessageStatusEnum.THINKING && (
            <MarkdownContent content={message.content} />
          )}

          {message.status === MessageStatusEnum.STREAMING && (
            <div className="inline-flex items-center gap-1 py-1.5 text-primary">
              <span className="h-[5px] w-[5px] rounded-full bg-current animate-dot-pulse" />
              <span className="h-[5px] w-[5px] rounded-full bg-current animate-dot-pulse [animation-delay:0.2s]" />
              <span className="h-[5px] w-[5px] rounded-full bg-current animate-dot-pulse [animation-delay:0.4s]" />
            </div>
          )}

          {message.status === MessageStatusEnum.ERROR && (
            <div className="mt-1 flex items-center gap-1 text-xs text-error select-none">
              <AlertCircle size={14} />
              <span>回复出错</span>
            </div>
          )}

          {message.status === MessageStatusEnum.STOP_STREAMING && (
            <div className="mt-1 flex items-center gap-1 text-xs text-text-disabled select-none">
              <span className="italic">已停止生成</span>
            </div>
          )}

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
        </div>
      </div>
    );
  }

  // Human 消息
  return (
    <div
      className={cn(
        "flex justify-end px-4 text-base transition-opacity duration-200",
        isAncestor && "opacity-75",
      )}
    >
      <div className="group relative max-w-[70%]">
        {!isAncestor && (
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <IconButton
              size="sm"
              onClick={handleCopy}
              title="复制"
              className="bg-bg-paper shadow-glass-sm hover:bg-action-hover"
            >
              {copied ? <Check /> : <Copy />}
            </IconButton>
          </div>
        )}

        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-5 py-3 leading-relaxed transition-all duration-200",
            isAncestor
              ? "bg-action-selected text-text-secondary"
              : "bg-action-hover text-text-primary",
            message.status === MessageStatusEnum.SENDING && "opacity-65",
            message.status === MessageStatusEnum.ERROR && "outline outline-[1.5px] outline-error",
          )}
        >
          {message.content}
        </div>

        {message.status === MessageStatusEnum.SENDING && (
          <div className="mt-1 flex items-center justify-end gap-1 text-xs text-text-disabled select-none">
            <Loader2 size={10} className="animate-spin" />
            <span>发送中</span>
          </div>
        )}

        {message.status === MessageStatusEnum.ERROR && (
          <div className="mt-1 flex items-center justify-end gap-1 text-xs text-error select-none">
            <AlertCircle size={14} />
            <span>发送失败</span>
          </div>
        )}
      </div>
    </div>
  );
});
