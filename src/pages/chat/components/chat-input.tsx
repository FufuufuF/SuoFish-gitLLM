import { useState } from "react";
import { Box, IconButton, InputBase, Paper } from "@mui/material";
import { Send, AttachFile, Mic } from "@mui/icons-material";

interface ChatInputProps {
  /** 发送回调，参数为输入的消息内容 */
  onSend: (message: string) => Promise<void>;
  /** 附件按钮回调 */
  onAttach?: () => void;
  /** 语音输入回调 */
  onVoice?: () => void;
  /** 占位符文本 */
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onAttach,
  onVoice,
  placeholder = "输入消息...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const canSend = value.trim().length > 0 && !loading;

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        mx: "auto",
        px: 2,
        pb: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 8,
          width: "sm",
          bgcolor: "action.hover",
          border: 1,
          borderColor: "divider",
          overflow: "hidden",
          transition: "border-color 0.2s, box-shadow 0.2s",
          "&:focus-within": {
            borderColor: "primary.main",
            boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}`,
          },
        }}
      >
        {/* 上部：输入区域 */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <InputBase
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading}
            multiline
            maxRows={8}
            sx={{
              width: "100%",
              fontSize: "1.5rem",
              lineHeight: 1.6,
              minHeight: 24,
            }}
          />
        </Box>

        {/* 下部：工具栏 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1,
            py: 0.5,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          {/* 左侧工具按钮 */}
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {onAttach && (
              <IconButton
                size="small"
                onClick={onAttach}
                disabled={loading}
                sx={{ color: "text.secondary" }}
              >
                <AttachFile fontSize="small" />
              </IconButton>
            )}
            {onVoice && (
              <IconButton
                size="small"
                onClick={onVoice}
                disabled={loading}
                sx={{ color: "text.secondary" }}
              >
                <Mic fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* 右侧发送按钮 */}
          <IconButton
            onClick={handleSend}
            disabled={!canSend}
            sx={{
              bgcolor: canSend ? "primary.main" : "action.disabledBackground",
              color: canSend ? "primary.contrastText" : "action.disabled",
              "&:hover": {
                bgcolor: canSend ? "primary.dark" : "action.disabledBackground",
              },
              transition: "background-color 0.2s",
            }}
            size="small"
          >
            <Send fontSize="small" />
          </IconButton>
        </Box>
      </Paper>

      {/* 底部提示文字 */}
      <Box
        sx={{
          textAlign: "center",
          mt: 1,
          color: "text.secondary",
          fontSize: "0.75rem",
        }}
      >
        SuoFish 是一个 AI 助手
      </Box>
    </Box>
  );
}
