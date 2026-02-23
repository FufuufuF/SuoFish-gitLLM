import { useState } from "react";
import { Box, IconButton, InputBase, Paper, Tooltip } from "@mui/material";
import {
  Send,
  AttachFile,
  Mic,
  CallSplit,
  MergeType,
} from "@mui/icons-material";

interface ChatInputProps {
  /** 发送回调，参数为输入的消息内容 */
  onSend: (message: string) => Promise<void>;
  /** 附件按钮回调 */
  onAttach?: () => void;
  /** 语音输入回调 */
  onVoice?: () => void;
  /** Fork 记忆分支回调，不传则不显示该按钮 */
  onFork?: () => void;
  /** Fork 按钮禁用（无活跃 thread 时为 true） */
  forkDisabled?: boolean;
  /** Merge 记忆分支回调 */
  onMerge: () => void;
  /** Merge 按钮禁用（主线/已合并/有未合并子分支时为 true） */
  mergeDisabled?: boolean;
  /** 整体禁用（合并流程进行中时为 true，禁止发送消息和所有操作） */
  disabled?: boolean;
  /** 占位符文本 */
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
  disabled = false,
  placeholder = "输入消息...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const isDisabled = loading || disabled;
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
            placeholder={disabled ? "合并流程进行中..." : placeholder}
            disabled={isDisabled}
            multiline
            maxRows={8}
            sx={{
              width: "100%",
              fontSize: "1.4rem",
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
            {onFork && (
              <Tooltip
                title={forkDisabled ? "请先发送消息再 Fork" : "Fork 记忆分支"}
              >
                <span>
                  <IconButton
                    size="small"
                    onClick={onFork}
                    disabled={isDisabled || forkDisabled}
                    sx={{ color: "text.secondary" }}
                  >
                    <CallSplit fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            <Tooltip
              title={
                mergeDisabled
                  ? "当前不可合并（主线/已合并/有子分支未合并）"
                  : "合并到父线程"
              }
            >
              <span>
                <IconButton
                  size="small"
                  onClick={onMerge}
                  disabled={isDisabled || mergeDisabled}
                  sx={{ color: "text.secondary" }}
                >
                  <MergeType fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {onAttach && (
              <IconButton
                size="small"
                onClick={onAttach}
                disabled={isDisabled}
                sx={{ color: "text.secondary" }}
              >
                <AttachFile fontSize="small" />
              </IconButton>
            )}
            {onVoice && (
              <IconButton
                size="small"
                onClick={onVoice}
                disabled={isDisabled}
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
          fontSize: "1rem",
        }}
      >
        SuoFish 是一个 AI 助手
      </Box>
    </Box>
  );
}
