import { Box, Typography } from "@mui/material";
import CallSplit from "@mui/icons-material/CallSplit";

interface ThreadForkDividerProps {
  /** 父线程标题，用于显示「从「xxx」切出」 */
  parentThreadTitle?: string;
}

/**
 * 分叉点分隔栏
 * - 在祖先消息区和当前分支消息区之间插入
 * - 明确标记「这里是分支起点」
 */
export function ThreadForkDivider({
  parentThreadTitle,
}: ThreadForkDividerProps) {
  const label = parentThreadTitle
    ? `从「${parentThreadTitle}」切出`
    : "分支起点";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 1.5,
        px: 2,
        my: 1,
        userSelect: "none",
      }}
    >
      {/* 左侧虚线 */}
      <Box
        sx={{
          flex: 1,
          borderTop: "1.5px dashed",
          borderColor: "primary.main",
          opacity: 0.5,
        }}
      />

      {/* 中心内容：图标 + 文字 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          color: "primary.main",
          opacity: 0.8,
          flexShrink: 0,
        }}
      >
        <CallSplit
          sx={{
            fontSize: 16,
            transform: "rotate(180deg)", // 让箭头朝上，表示"从上方切出"
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 500,
            letterSpacing: 0.3,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
      </Box>

      {/* 右侧虚线 */}
      <Box
        sx={{
          flex: 1,
          borderTop: "1.5px dashed",
          borderColor: "primary.main",
          opacity: 0.5,
        }}
      />
    </Box>
  );
}
