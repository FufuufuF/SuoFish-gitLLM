import { Box, Skeleton } from "@mui/material";

// ===== 类型定义 =====

export interface ChatSessionListSkeletonProps {
  /** 骨架屏条数，默认 6 */
  count?: number;
}

// ===== 组件实现 =====

export function ChatSessionListSkeleton({
  count = 6,
}: ChatSessionListSkeletonProps) {
  return (
    <Box sx={{ px: 1, pt: 0.5 }}>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.5,
            py: 1,
            mx: 1,
            mb: 0.5,
            borderRadius: 2,
          }}
        >
          {/* 图标骨架 */}
          <Skeleton variant="circular" width={18} height={18} />
          {/* 标题骨架 */}
          <Skeleton
            variant="text"
            sx={{
              flex: 1,
              fontSize: "0.875rem",
            }}
          />
        </Box>
      ))}
    </Box>
  );
}
