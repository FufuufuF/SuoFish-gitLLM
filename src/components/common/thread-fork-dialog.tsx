import { useState } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ThreadForkDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (title: string) => Promise<void>;
  parentThreadTitle?: string;
}

export function ThreadForkDialog({
  open,
  onClose,
  onConfirm,
  parentThreadTitle,
}: ThreadForkDialogProps) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmedTitle = title.trim();
  const canConfirm = trimmedTitle.length > 0 && !loading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm(trimmedTitle);
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setTitle("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogTitle>
          <span className="flex items-center gap-2">
            <GitBranch size={18} className="text-primary" />
            Fork 记忆分支
          </span>
        </DialogTitle>

        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-info/30 bg-info/5 px-3 py-2 text-xs text-text-secondary">
            新分支将从
            {parentThreadTitle ? (
              <span className="font-semibold">「{parentThreadTitle}」</span>
            ) : (
              "当前分支"
            )}
            的最新节点开始独立演进。
          </div>

          <div>
            <Input
              autoFocus
              placeholder="例：探索方向 A"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={50}
            />
            <p className="mt-1 text-right text-xs text-text-muted">{title.length} / 50</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
              取消
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!canConfirm}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
              确定 Fork
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
