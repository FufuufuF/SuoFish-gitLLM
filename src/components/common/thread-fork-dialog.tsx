import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import { CallSplit } from "@mui/icons-material";

export interface ThreadForkDialogProps {
  open: boolean;
  onClose: () => void;
  /** 确认时传入用户填写的 title，外部负责调用 forkThread */
  onConfirm: (title: string) => Promise<void>;
  /** 父 thread 名称，用于上下文提示 */
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
    if (e.key === "Escape") {
      handleClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pb: 1,
          fontWeight: 600,
        }}
      >
        <CallSplit fontSize="small" color="primary" />
        Fork 记忆分支
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
          新分支将从
          {parentThreadTitle ? (
            <Box component="span" sx={{ fontWeight: 600 }}>
              「{parentThreadTitle}」
            </Box>
          ) : (
            "当前分支"
          )}
          的最新节点开始独立演进。
        </Alert>

        <TextField
          autoFocus
          fullWidth
          label="分支名称"
          placeholder="例：探索方向 A"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          inputProps={{ maxLength: 50 }}
          helperText={`${title.length} / 50`}
          size="small"
          sx={{ mt: 0.5 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
          size="small"
        >
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          variant="contained"
          size="small"
          startIcon={
            loading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <CallSplit fontSize="small" />
            )
          }
        >
          确定 Fork
        </Button>
      </DialogActions>
    </Dialog>
  );
}
