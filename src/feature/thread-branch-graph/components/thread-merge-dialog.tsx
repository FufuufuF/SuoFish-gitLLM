import { useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  Divider,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { useMergeStore } from "@/stores/merge-store";

/** Drawer 固定宽度 */
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

  // 成功后自动关闭
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
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      variant="persistent"
      sx={{
        width: open ? MERGE_DRAWER_WIDTH : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: MERGE_DRAWER_WIDTH,
          position: "relative",
          border: "none",
          borderLeft: 1,
          borderColor: "divider",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="h6">合并分支到父线程</Typography>
      </Box>
      <Divider />

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
        {/* Phase: previewing（等待 LLM 返回） */}
        {isLoadingPreview && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              正在生成学习简报，请稍候...
            </Typography>
            <Skeleton variant="rectangular" height={24} />
            <Skeleton variant="rectangular" height={24} />
            <Skeleton variant="rectangular" height={24} width="80%" />
          </Box>
        )}

        {/* Phase: 有简报数据（可编辑） */}
        {!isLoadingPreview && !hasError && (
          <>
            <Typography variant="body2" color="text.secondary" mb={2}>
              以下是本次分支的学习简报，你可以在确认前编辑内容：
            </Typography>
            <TextField
              value={briefContent}
              onChange={(e) => updateBriefContent(e.target.value)}
              multiline
              minRows={6}
              maxRows={16}
              fullWidth
              variant="outlined"
              disabled={isConfirming}
              placeholder="学习简报内容..."
              sx={{ fontFamily: "monospace" }}
            />
          </>
        )}

        {/* Phase: error */}
        {hasError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errorMessage ?? "操作失败，请重试"}
          </Alert>
        )}
      </Box>

      {/* Footer Actions */}
      <Divider />
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          px: 3,
          py: 2,
        }}
      >
        <Button onClick={handleClose} disabled={isConfirming}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={isLoadingPreview || isConfirming || hasError}
          startIcon={isConfirming ? <CircularProgress size={16} /> : undefined}
        >
          {isConfirming ? "合并中..." : "确认合并"}
        </Button>
      </Box>
    </Drawer>
  );
}
