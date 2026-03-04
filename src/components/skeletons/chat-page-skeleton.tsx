import { Box } from "@mui/material";
import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonCircle,
} from "./primitives/skeleton-base";

/**
 * 聊天页骨架屏
 * 用于 ChatPage 懒加载时的 Suspense fallback。
 * 仅渲染消息列表 + 底部输入框区域，不含 Sidebar/Header（由父层 RootLayout 保持真实渲染）。
 */
export function ChatPageSkeleton() {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* 消息列表骨架 */}
      <Box
        sx={{
          flex: 1,
          px: 4,
          py: 3,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {/* 从上往下交替展示 AI / 用户 消息骨架 */}
        <AiMessageSkeleton lineCount={3} widths={["78%", "62%", "45%"]} />
        <HumanMessageSkeleton width="40%" />
        <AiMessageSkeleton lineCount={2} widths={["72%", "55%"]} />
        <HumanMessageSkeleton width="30%" />
        <AiMessageSkeleton
          lineCount={4}
          widths={["80%", "68%", "54%", "35%"]}
        />
      </Box>

      {/* 输入框骨架 */}
      <Box sx={{ px: 4, pb: 3, flexShrink: 0 }}>
        <SkeletonBlock width="100%" height={80} sx={{ borderRadius: 4 }} />
      </Box>
    </Box>
  );
}

// ===== 内部辅助组件 =====

interface AiMessageSkeletonProps {
  /** 每行骨架的宽度列表（length 对应行数） */
  widths: string[];
  lineCount: number;
}

function AiMessageSkeleton({ widths }: AiMessageSkeletonProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
      {/* AI 头像骨架 */}
      <SkeletonCircle width={28} height={28} sx={{ flexShrink: 0, mt: 0.25 }} />
      {/* 多行文字骨架 */}
      <Box
        sx={{
          flex: 1,
          maxWidth: "85%",
          display: "flex",
          flexDirection: "column",
          gap: 0.8,
        }}
      >
        {widths.map((w, i) => (
          <SkeletonLine key={i} width={w} height={16} />
        ))}
      </Box>
    </Box>
  );
}

interface HumanMessageSkeletonProps {
  width: string;
}

function HumanMessageSkeleton({ width }: HumanMessageSkeletonProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", px: 0 }}>
      {/* 气泡骨架 */}
      <SkeletonBlock width={width} height={38} sx={{ borderRadius: 3 }} />
    </Box>
  );
}
