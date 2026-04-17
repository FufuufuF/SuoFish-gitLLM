import { useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonLine } from "@/components/skeletons/primitives/skeleton-base";
import { useMergeStore } from "@/stores/merge-store";

export const MERGE_DRAWER_WIDTH = 400;

interface ThreadMergeDrawerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (briefContent: string) => Promise<void>;
}

export function ThreadMergeDrawer({
  open,
  onClose,
  onConfirm,
}: ThreadMergeDrawerProps) {
  const mergePhase = useMergeStore((s) => s.mergePhase);
  const briefContent = useMergeStore((s) => s.briefContent);
  const errorMessage = useMergeStore((s) => s.errorMessage);
  const updateBriefContent = useMergeStore.getState().updateBriefContent;
  const reset = useMergeStore.getState().reset;

  useEffect(() => {
    if (mergePhase === "success") {
      onClose();
    }
  }, [mergePhase, onClose]);

  const isLoadingPreview = mergePhase === "previewing" && briefContent === "";
  const isConfirming = mergePhase === "confirming";
  const hasError = mergePhase === "error";

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    await onConfirm(briefContent);
  };

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-l border-divider bg-bg-paper transition-[width] duration-300",
      )}
      style={{ width: open ? MERGE_DRAWER_WIDTH : 0 }}
    >
      {/* Header */}
      <div className="px-6 py-4">
        <h6 className="text-base font-medium">合并分支到父线程</h6>
      </div>
      <div className="h-px bg-divider" />

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoadingPreview && (
          <div className="flex flex-col gap-3">
            <p className="mb-2 text-sm text-text-secondary">
              正在生成学习简报，请稍候...
            </p>
            <SkeletonLine height={24} />
            <SkeletonLine height={24} />
            <SkeletonLine width="80%" height={24} />
          </div>
        )}

        {!isLoadingPreview && !hasError && (
          <>
            <p className="mb-4 text-sm text-text-secondary">
              以下是本次分支的学习简报，你可以在确认前编辑内容：
            </p>
            <Textarea
              value={briefContent}
              onChange={(e) => updateBriefContent(e.target.value)}
              disabled={isConfirming}
              placeholder="学习简报内容..."
              rows={6}
              className="font-mono"
            />
          </>
        )}

        {hasError && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {errorMessage ?? "操作失败，请重试"}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="h-px bg-divider" />
      <div className="flex justify-end gap-2 px-6 py-4">
        <Button variant="ghost" onClick={handleClose} disabled={isConfirming}>
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isLoadingPreview || isConfirming || hasError}
        >
          {isConfirming && <Loader2 size={16} className="animate-spin" />}
          {isConfirming ? "合并中..." : "确认合并"}
        </Button>
      </div>
    </div>
  );
}
