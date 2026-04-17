import { RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";

export interface PaginationRetryStateProps {
  onRetry: () => void;
  isRetrying?: boolean;
  text?: string;
}

export function PaginationRetryState({
  onRetry,
  isRetrying = false,
  text = "加载失败",
}: PaginationRetryStateProps) {
  return (
    <div className="flex animate-fade-in items-center justify-center py-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-error-glow px-3 py-1">
        <span className="select-none text-xs text-text-secondary">
          {text}
        </span>

        <button
          disabled={isRetrying}
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-error",
            "transition-colors hover:bg-error/10 disabled:opacity-50",
          )}
        >
          <RotateCw
            size={16}
            className={cn(isRetrying && "animate-spin")}
          />
          {isRetrying ? "重试中..." : "重试"}
        </button>
      </div>
    </div>
  );
}
