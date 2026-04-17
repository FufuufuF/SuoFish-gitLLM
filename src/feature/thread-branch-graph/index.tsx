import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { TreeView } from "@/components/ui/tree-view";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useThreadTree } from "./hooks";
import { ThreadTreeNode } from "./components/thread-tree-node";
import { ThreadTreeSkeleton } from "./components/thread-tree-skeleton";

export interface ThreadTreePanelProps {
  chatSessionId: number;
}

export function ThreadTreePanel({ chatSessionId }: ThreadTreePanelProps) {
  const { tree, isLoading, error, switchActiveThread } =
    useThreadTree(chatSessionId);

  const activeThreadId = useChatSessionStore(
    (state) =>
      state.sessions.find((s) => s.id === state.activeSessionId)
        ?.activeThreadId ?? null,
  );

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

  const handleNodeClick = (threadId: number) => {
    if (threadId === activeThreadId) return;
    switchActiveThread(threadId);
  };

  if (isLoading) return <ThreadTreeSkeleton />;

  if (error) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          加载失败，请稍后重试
        </div>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-text-secondary">暂无分支记录</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      <TreeView
        defaultExpandedItems={allNodeIds}
        selectedItems={activeThreadId !== null ? String(activeThreadId) : ""}
      >
        <ThreadTreeNode
          node={tree}
          activeThreadId={activeThreadId}
          onNodeClick={handleNodeClick}
        />
      </TreeView>
    </div>
  );
}
