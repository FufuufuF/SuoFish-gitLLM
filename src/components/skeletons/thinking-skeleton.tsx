import { Box } from "@mui/material";
import { SkeletonLine } from "./primitives/skeleton-base";

/**
 * AI 思考中脉冲骨架屏
 * 用于发送消息后、首个 token 到达前的 AI 占位展示。
 */
export function ThinkingSkeleton() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.8,
        py: 0.5,
      }}
    >
      <SkeletonLine width="72%" height={16} />
      <SkeletonLine width="55%" height={16} />
      <SkeletonLine width="40%" height={16} />
    </Box>
  );
}
