import type { ThreadTreeNode } from "./types";
import type { Thread } from "@/types";

export function buildThreadTree(threads: Thread[]): ThreadTreeNode {
  const threadMap = new Map<number, ThreadTreeNode>();
  let rootNode: ThreadTreeNode;

  // 1. 将 Thread[] 转为 Map<id, ThreadTreeNode>
  for (const thread of threads) {
    threadMap.set(thread.id, { ...thread, children: [] });
  }

  // 2. 遍历，有 parentId 的挂到父节点的 children 上
  for (const thread of threads) {
    if (thread.parentThreadId === null) {
      rootNode = threadMap.get(thread.id)!;
    } else {
      const parent = threadMap.get(thread.parentThreadId);
      if (parent) {
        parent.children.push(threadMap.get(thread.id)!);
      }
    }
  }

  // 3. 返回根节点
  return rootNode!;
}
