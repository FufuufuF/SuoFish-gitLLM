import { useState, useRef, useEffect } from "react";
import { Send, CircleStop, Paperclip, Mic, GitBranch, GitMerge } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { getChatInputPlaceholder } from "../utils/get-chat-input-placeholder";

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  onAttach?: () => void;
  onVoice?: () => void;
  onFork?: () => void;
  forkDisabled?: boolean;
  onMerge: () => void;
  mergeDisabled?: boolean;
  isMerging?: boolean;
  isMerged?: boolean;
  isStreaming?: boolean;
  onStopGeneration?: () => void;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onAttach,
  onVoice,
  onFork,
  forkDisabled = false,
  onMerge,
  mergeDisabled = false,
  isMerging = false,
  isMerged = false,
  isStreaming = false,
  onStopGeneration,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = loading || isMerging || isMerged || isStreaming;
  const canSend = value.trim().length > 0 && !isDisabled;

  const handleSend = async () => {
    if (!canSend) return;
    const message = value.trim();
    setValue("");
    setLoading(true);
    try {
      await onSend(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isStreaming) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  return (
    <div className="mx-auto w-full px-4 pb-4">
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border border-divider bg-action-hover",
          "transition-all duration-200",
          "focus-within:border-primary focus-within:shadow-glow-primary",
        )}
      >
        {/* 输入区域 */}
        <div className="px-4 pb-2 pt-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getChatInputPlaceholder(isMerging, isMerged)}
            disabled={isDisabled}
            rows={1}
            className="w-full resize-none bg-transparent text-base leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between border-t border-divider px-2 py-1">
          <TooltipProvider>
            <div className="flex gap-1">
              {onFork && (
                <Tooltip content={forkDisabled ? "请先发送消息再 Fork" : "Fork 记忆分支"}>
                  <span>
                    <IconButton
                      size="sm"
                      onClick={onFork}
                      disabled={isDisabled || forkDisabled}
                    >
                      <GitBranch />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              <Tooltip content={mergeDisabled ? "当前不可合并（主线/已合并/有子分支未合并）" : "合并到父线程"}>
                <span>
                  <IconButton
                    size="sm"
                    onClick={onMerge}
                    disabled={isDisabled || mergeDisabled}
                  >
                    <GitMerge />
                  </IconButton>
                </span>
              </Tooltip>

              {onAttach && (
                <IconButton size="sm" onClick={onAttach} disabled={isDisabled}>
                  <Paperclip />
                </IconButton>
              )}
              {onVoice && (
                <IconButton size="sm" onClick={onVoice} disabled={isDisabled}>
                  <Mic />
                </IconButton>
              )}
            </div>
          </TooltipProvider>

          {isStreaming ? (
            <IconButton
              size="sm"
              onClick={onStopGeneration}
              disabled={!onStopGeneration}
              className="bg-warning text-warning-contrast hover:bg-warning/90"
            >
              <CircleStop />
            </IconButton>
          ) : (
            <IconButton
              size="sm"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "transition-colors duration-200",
                canSend
                  ? "bg-primary text-primary-contrast hover:bg-primary-hover hover:shadow-glow-primary-strong active:scale-90"
                  : "bg-action-disabled-bg text-text-disabled",
              )}
            >
              <Send />
            </IconButton>
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-text-secondary">
        SuoFish 是一个 AI 助手
      </p>
    </div>
  );
}
