import { useState, useRef, useEffect } from "react";
import { MoreVertical, AlertCircle, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { ChatSession } from "@/types";

export interface ChatSessionItemProps {
  session: ChatSession;
  isActive: boolean;
  isTitleGenerating: boolean;
  onClick: (chatSessionId: string | number) => void;
  onDelete?: (chatSessionId: string | number) => void | Promise<void>;
}

function getSessionKey(session: ChatSession): string | number {
  return session.id ?? session.tempId ?? "";
}

export function ChatSessionItem({
  session,
  isActive,
  isTitleGenerating,
  onClick,
  onDelete,
}: ChatSessionItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const sessionKey = getSessionKey(session);
  const isCreating = session.status === "creating";
  const isError = session.status === "error";
  const hasTitle = Boolean(session.title?.trim());
  const showSkeleton = isCreating && isTitleGenerating && !hasTitle;
  const canDelete = typeof session.id === "number" && session.id > 0 && !isCreating;

  const handleClick = () => {
    onClick(sessionKey);
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    onDelete?.(sessionKey);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "mx-2 mb-1 flex min-h-[44px] w-[calc(100%-16px)] items-center rounded-md px-3 py-2 text-left",
        "transition-all duration-150",
        isActive
          ? "bg-action-selected shadow-glow-primary/30"
          : "hover:bg-action-hover hover:translate-x-0.5",
      )}
    >
      <MessageSquare
        size={18}
        className={cn(
          "mr-3 shrink-0",
          isError ? "text-error" : "text-text-secondary",
        )}
      />

      {showSkeleton ? (
        <div className="h-5 w-[70%] animate-pulse rounded bg-action-hover" />
      ) : (
        <span
          className={cn(
            "flex-1 truncate text-sm",
            isError ? "text-error" : "text-text-primary",
            isActive ? "font-semibold" : "font-normal",
          )}
        >
          {session.title || "新对话"}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center">
        {isError && (
          <AlertCircle size={16} className="mr-1 text-error" />
        )}

        {(isHovered || menuOpen) && !showSkeleton && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <IconButton
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDeleteClick}
                disabled={!canDelete || !onDelete}
                className="text-error focus:text-error"
              >
                <Trash2 size={16} />
                删除会话
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </button>
  );
}
