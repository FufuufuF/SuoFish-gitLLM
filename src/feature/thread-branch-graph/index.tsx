import { useMemo } from "react";
import { Box, Alert, Typography } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useThreadTree } from "./hooks";
import { ThreadTreeNode } from "./components/thread-tree-node";
import { ThreadTreeSkeleton } from "./components/thread-tree-skeleton";

// ===== 类型定义 =====

export interface ThreadTreePanelProps {
  chatSessionId: number;
}

// ===== 组件实现 =====

export function ThreadTreePanel({ chatSessionId }: ThreadTreePanelProps) {
  // ── 数据层：通过 Hook 加载（懒加载 + 建树 + 状态管理）
  const { tree, isLoading, error, switchActiveThread } =
    useThreadTree(chatSessionId);

  // ── 活跃 thread（响应式 selector，禁止用 getState() 快照）
  const activeThreadId = useChatSessionStore(
    (state) =>
      state.sessions.find((s) => s.id === state.activeSessionId)
        ?.activeThreadId ?? null,
  );

  // ── 默认展开所有节点
  const allNodeIds = useMemo(() => {
    if (!tree) return [];
    const ids: string[] = [];
    const collect = (node: typeof tree) => {
      ids.push(String(node.id));
      node.children.forEach(collect);
    };
    collect(tree);
    return ids;
  }, [tree]);

  // ── 切换线程（乐观更新由 hook 管理，失败时 hook 内自动回滚）
  const handleNodeClick = (threadId: number) => {
    if (threadId === activeThreadId) return;
    switchActiveThread(threadId);
  };

  // ── 渲染守卫
  if (isLoading) return <ThreadTreeSkeleton />;

  if (error) {
    return (
      <Box sx={{ px: 2, py: 1 }}>
        <Alert severity="error" sx={{ fontSize: 12 }}>
          加载失败，请稍后重试
        </Alert>
      </Box>
    );
  }

  if (!tree) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          暂无分支记录
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 1, py: 0.5 }}>
      <SimpleTreeView
        defaultExpandedItems={allNodeIds}
        selectedItems={activeThreadId !== null ? String(activeThreadId) : ""}
        sx={{
          "& .MuiTreeItem-root": {
            "& .MuiTreeItem-content": {
              borderRadius: 1,
            },
          },
        }}
      >
        <ThreadTreeNode
          node={tree}
          activeThreadId={activeThreadId}
          onNodeClick={handleNodeClick}
        />
      </SimpleTreeView>
    </Box>
  );
}
