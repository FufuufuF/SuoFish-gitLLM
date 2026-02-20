import type { Thread } from "@/types";

export interface ThreadTreeNode extends Thread {
  children: ThreadTreeNode[];
}
