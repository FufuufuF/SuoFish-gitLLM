import { MessageSquare } from "lucide-react";

export function ChatSessionListEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
      <MessageSquare size={40} className="text-text-disabled" />
      <p className="text-sm text-text-secondary">暂无对话</p>
      <p className="text-xs text-text-disabled">点击上方按钮开始新对话</p>
    </div>
  );
}
