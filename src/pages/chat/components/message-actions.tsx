import { useState } from "react";
import { Box, IconButton } from "@mui/material";
import ContentCopy from "@mui/icons-material/ContentCopy";
import Check from "@mui/icons-material/Check";
import Refresh from "@mui/icons-material/Refresh";
import ThumbUp from "@mui/icons-material/ThumbUp";
import ThumbDown from "@mui/icons-material/ThumbDown";
import styles from "./index.module.less";

interface MessageActionsProps {
  /** 要复制的文本内容 */
  content: string;
  /** 消息 ID，用于重新生成回调 */
  messageId?: string | number;
  /** 是否为祖先消息（仅保留复制，隐藏其余操作） */
  isAncestor?: boolean;
  /** 复制成功回调 */
  onCopy?: (content: string) => void;
  /** 重新生成回调 */
  onRegenerate?: (messageId: string | number) => void;
}

/**
 * AI 消息底部操作栏
 * - 复制：始终可用
 * - 重新生成 / 有帮助 / 没帮助：祖先消息中隐藏
 */
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
    <Box className={styles.aiToolbar}>
      <IconButton
        size="small"
        onClick={handleCopy}
        title="复制"
        sx={{ color: "text.secondary" }}
      >
        {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
      </IconButton>

      {!isAncestor && (
        <>
          <IconButton
            size="small"
            onClick={() => messageId != null && onRegenerate?.(messageId)}
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
  );
}
