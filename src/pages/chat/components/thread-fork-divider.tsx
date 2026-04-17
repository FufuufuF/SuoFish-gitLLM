import { GitBranch } from "lucide-react";

interface ThreadForkDividerProps {
  parentThreadTitle?: string;
}

export function ThreadForkDivider({
  parentThreadTitle,
}: ThreadForkDividerProps) {
  const label = parentThreadTitle
    ? `从「${parentThreadTitle}」切出`
    : "分支起点";

  return (
    <div className="my-2 flex select-none items-center gap-2 px-4 py-3">
      <div className="flex-1 border-t-[1.5px] border-dashed border-primary/50" />

      <div className="flex shrink-0 items-center gap-1 text-primary/80">
        <GitBranch size={16} className="rotate-180" />
        <span className="whitespace-nowrap text-xs font-medium tracking-wide">
          {label}
        </span>
      </div>

      <div className="flex-1 border-t-[1.5px] border-dashed border-primary/50" />
    </div>
  );
}
