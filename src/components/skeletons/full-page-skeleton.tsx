import { Box } from "@mui/material";
import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonCircle,
} from "./primitives/skeleton-base";

/**
 * 整页骨架屏
 * 用于 RootLayout 懒加载时的 Suspense fallback。
 * 布局与真实 RootLayout 一致：左侧 Sidebar + 右侧聊天区。
 */
export function FullPageSkeleton() {
  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ===== 左侧 Sidebar 骨架 ===== */}
      <Box
        sx={{
          width: 480,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: 1,
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        {/* Tab 栏占位 */}
        <Box
          sx={{
            height: 44,
            display: "flex",
            alignItems: "center",
            px: 2,
            gap: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <SkeletonLine width={60} height={20} />
          <SkeletonLine width={60} height={20} />
        </Box>

        {/* 会话列表条目 */}
        <Box
          sx={{
            flex: 1,
            px: 1.5,
            py: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1,
                py: 0.75,
              }}
            >
              <SkeletonCircle width={24} height={24} />
              <Box sx={{ flex: 1 }}>
                <SkeletonLine width={`${65 + (i % 3) * 10}%`} height={14} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ===== 右侧主区域骨架 ===== */}
      <Box
        sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
      >
        {/* Header 占位 */}
        <Box
          sx={{
            height: 56,
            display: "flex",
            alignItems: "center",
            px: 2,
            gap: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <SkeletonLine width={120} height={20} />
          <Box sx={{ flex: 1 }} />
          <SkeletonCircle width={32} height={32} />
        </Box>

        {/* 消息区占位 */}
        <Box
          sx={{
            flex: 1,
            px: 4,
            py: 3,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <MessageSkeletonRow align="left" widths={["75%", "60%", "40%"]} />
          <MessageSkeletonRow align="right" widths={["45%"]} />
          <MessageSkeletonRow align="left" widths={["80%", "55%"]} />
          <MessageSkeletonRow align="right" widths={["35%"]} />
          <MessageSkeletonRow align="left" widths={["70%", "50%", "60%"]} />
        </Box>

        {/* 输入框占位 */}
        <Box sx={{ px: 4, pb: 3, flexShrink: 0 }}>
          <SkeletonBlock width="100%" height={72} sx={{ borderRadius: 4 }} />
        </Box>
      </Box>
    </Box>
  );
}

// ===== 内部辅助组件 =====

interface MessageSkeletonRowProps {
  align: "left" | "right";
  widths: string[];
}

function MessageSkeletonRow({ align, widths }: MessageSkeletonRowProps) {
  const isLeft = align === "left";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        flexDirection: isLeft ? "row" : "row-reverse",
      }}
    >
      {isLeft && (
        <SkeletonCircle
          width={28}
          height={28}
          sx={{ flexShrink: 0, mt: 0.25 }}
        />
      )}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
          maxWidth: "65%",
          alignItems: isLeft ? "flex-start" : "flex-end",
        }}
      >
        {widths.map((w, i) => (
          <SkeletonLine key={i} width={w} height={16} />
        ))}
      </Box>
    </Box>
  );
}
