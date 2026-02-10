import { Box } from "@mui/material";
import { ChatSessionList } from "@/feature/chat-session-list";
import type { ChatSession } from "@/types";

// ===== Mock 数据（待接入真实 Hook 后移除） =====

const MOCK_SESSIONS: ChatSession[] = [
  {
    id: 1,
    title: "如何使用 React Hooks",
    status: "active",
    createdAt: new Date("2026-02-10T10:00:00"),
    updatedAt: new Date("2026-02-10T10:30:00"),
  },
  {
    id: 2,
    title: "TypeScript 泛型最佳实践",
    status: "active",
    createdAt: new Date("2026-02-09T14:00:00"),
    updatedAt: new Date("2026-02-09T15:00:00"),
  },
  {
    id: 3,
    title: "Material UI 主题定制指南",
    status: "active",
    createdAt: new Date("2026-02-08T09:00:00"),
    updatedAt: new Date("2026-02-08T11:00:00"),
  },
  {
    tempId: "temp-creating",
    title: "新对话",
    status: "creating",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 5,
    title: "数据库连接池配置问题排查",
    status: "error",
    createdAt: new Date("2026-02-07T16:00:00"),
    updatedAt: new Date("2026-02-07T16:30:00"),
  },
];

// ===== 组件实现 =====

export function AppSidebar() {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: 1,
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      <ChatSessionList />
    </Box>
  );
}
