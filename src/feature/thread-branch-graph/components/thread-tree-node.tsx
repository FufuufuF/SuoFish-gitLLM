import { Box, Chip, Typography } from "@mui/material";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
// 直接从源文件导入 enum（@/types 使用 export type 形式，无法作为值使用）
import { ThreadStatus } from "@/types/thread";
import type { ThreadTreeNode as ThreadTreeNodeType } from "../types";

// ===== 类型定义 =====

export interface ThreadTreeNodeProps {
  node: ThreadTreeNodeType;
  activeThreadId: number | null | undefined;
  onNodeClick: (threadId: number) => void;
}

// ===== 辅助函数 =====

function NodeLabel({
  node,
  isActive,
  isMerged,
}: {
  node: ThreadTreeNodeType;
  isActive: boolean;
  isMerged: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        opacity: isMerged ? 0.5 : 1,
        py: 0.25,
      }}
    >
      <Typography
        variant="body2"
        noWrap
        sx={{
          flex: 1,
          color: isActive
            ? "primary.main"
            : isMerged
              ? "text.disabled"
              : "text.primary",
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {node.title ?? "未命名分支"}
      </Typography>

      {isMerged && (
        <Chip
          label="已合并"
          size="small"
          sx={{ height: 16, fontSize: 10, px: 0.5 }}
        />
      )}

      {isActive && (
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: "primary.main",
            flexShrink: 0,
          }}
        />
      )}
    </Box>
  );
}

// ===== 组件实现（递归） =====

export function ThreadTreeNode({
  node,
  activeThreadId,
  onNodeClick,
}: ThreadTreeNodeProps) {
  const isActive = node.id === activeThreadId;
  const isMerged = node.status === ThreadStatus.MERGED;

  return (
    <TreeItem
      itemId={String(node.id)}
      label={<NodeLabel node={node} isActive={isActive} isMerged={isMerged} />}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onNodeClick(node.id);
      }}
      sx={{
        "& .MuiTreeItem-content": {
          borderRadius: 1,
          py: 0.5,
          "&:hover": {
            bgcolor: "action.hover",
          },
          "&.Mui-selected, &.Mui-selected:hover": {
            bgcolor: "action.selected",
          },
        },
      }}
    >
      {node.children.map((child) => (
        <ThreadTreeNode
          key={child.id}
          node={child}
          activeThreadId={activeThreadId}
          onNodeClick={onNodeClick}
        />
      ))}
    </TreeItem>
  );
}
