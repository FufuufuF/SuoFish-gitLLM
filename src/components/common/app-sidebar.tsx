import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { ChatBubbleOutline, AccountTree } from "@mui/icons-material";
import { ChatSessionList } from "@/feature/chat-session-list";
import { ThreadTreePanel } from "@/feature/thread-branch-graph";
import { useChatSessionStore } from "@/stores/chat-session-store";

// ===== 常量 =====

type SidebarTab = "sessions" | "branches";

// ===== 组件实现 =====

export function AppSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("sessions");

  // 仅在切换到分支树 Tab 时才需要 sessionId（懒加载设计）
  const activeSessionId = useChatSessionStore((state) => state.activeSessionId);

  const handleTabChange = (_: React.SyntheticEvent, value: SidebarTab) => {
    setActiveTab(value);
  };

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
      {/* Tab 切换栏 */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          minHeight: 44,
          "& .MuiTab-root": {
            minHeight: 44,
            fontSize: 12,
          },
        }}
      >
        <Tab
          value="sessions"
          icon={<ChatBubbleOutline sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="会话"
        />
        <Tab
          value="branches"
          icon={<AccountTree sx={{ fontSize: 16 }} />}
          iconPosition="start"
          label="分支树"
        />
      </Tabs>

      {/* Tab 内容区 */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 会话列表：始终挂载，切换时用 display 隐藏，保留滚动位置 */}
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            display: activeTab === "sessions" ? "flex" : "none",
            flexDirection: "column",
          }}
        >
          <ChatSessionList />
        </Box>

        {/* 分支树：仅在有活跃会话时渲染，Tab 激活时才触发懒加载 */}
        {activeTab === "branches" && typeof activeSessionId === "number" && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <ThreadTreePanel chatSessionId={activeSessionId} />
          </Box>
        )}

        {/* 分支树 Tab 激活但无活跃会话时的兜底 */}
        {activeTab === "branches" && typeof activeSessionId !== "number" && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box component="span" sx={{ fontSize: 12, color: "text.disabled" }}>
              请先选择一个会话
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
