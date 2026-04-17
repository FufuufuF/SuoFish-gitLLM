import { cn } from "@/lib/cn";
import { TreeNode } from "@/components/ui/tree-view";
import { ThreadStatus } from "@/types/thread";
import type { ThreadTreeNode as ThreadTreeNodeType } from "../types";

export interface ThreadTreeNodeProps {
  node: ThreadTreeNodeType;
  activeThreadId: number | null | undefined;
  onNodeClick: (threadId: number) => void;
}

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
    <div
      className={cn(
        "flex items-center gap-2 py-0.5",
        isMerged && "opacity-50",
      )}
    >
      <span
        className={cn(
          "flex-1 truncate text-sm",
          isActive && "font-semibold text-primary",
          isMerged && "text-text-disabled",
          !isActive && !isMerged && "text-text-primary",
        )}
      >
        {node.title ?? "未命名分支"}
      </span>

      {isMerged && (
        <span className="shrink-0 rounded px-1 py-0.5 text-xs font-medium text-text-disabled border border-divider">
          已合并
        </span>
      )}

      {isActive && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  );
}

export function ThreadTreeNode({
  node,
  activeThreadId,
  onNodeClick,
}: ThreadTreeNodeProps) {
  const isActive = node.id === activeThreadId;
  const isMerged = node.status === ThreadStatus.MERGED;

  return (
    <TreeNode
      itemId={String(node.id)}
      label={<NodeLabel node={node} isActive={isActive} isMerged={isMerged} />}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onNodeClick(node.id);
      }}
    >
      {node.children.length > 0
        ? node.children.map((child) => (
            <ThreadTreeNode
              key={child.id}
              node={child}
              activeThreadId={activeThreadId}
              onNodeClick={onNodeClick}
            />
          ))
        : undefined}
    </TreeNode>
  );
}
