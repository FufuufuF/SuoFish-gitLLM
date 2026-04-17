import { useState } from "react";
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

interface MessageActionsProps {
  content: string;
  messageId?: string | number;
  isAncestor?: boolean;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string | number) => void;
}

export function MessageActions({
  content,
  messageId,
  isAncestor = false,
  onCopy,
  onRegenerate,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.(content);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  return (
    <div className="mt-2 flex gap-1 opacity-70 transition-opacity hover:opacity-100">
      <IconButton size="sm" onClick={handleCopy} title="复制">
        {copied ? <Check /> : <Copy />}
      </IconButton>

      {!isAncestor && (
        <>
          <IconButton
            size="sm"
            onClick={() => messageId != null && onRegenerate?.(messageId)}
            title="重新生成"
          >
            <RefreshCw />
          </IconButton>
          <IconButton size="sm" title="有帮助">
            <ThumbsUp />
          </IconButton>
          <IconButton size="sm" title="没帮助">
            <ThumbsDown />
          </IconButton>
        </>
      )}
    </div>
  );
}
