import { Plus } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

export interface ChatSessionListHeaderProps {
  onCreateSession: () => void;
}

export function ChatSessionListHeader({
  onCreateSession,
}: ChatSessionListHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between px-4 py-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
        对话列表
      </h3>

      <TooltipProvider>
        <Tooltip content="新建对话" side="right">
          <IconButton
            size="sm"
            onClick={onCreateSession}
            className="hover:text-primary"
          >
            <Plus size={20} />
          </IconButton>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
