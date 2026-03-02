import { Box, Button, Typography, keyframes } from "@mui/material";
import { RefreshRounded } from "@mui/icons-material";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 1.5,
        animation: `${fadeIn} 0.3s ease-out`,
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: 999,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(244,67,54,0.08)"
              : "rgba(244,67,54,0.06)",
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", userSelect: "none", fontSize: "1rem" }}
        >
          {text}
        </Typography>

        <Button
          size="small"
          variant="text"
          disabled={isRetrying}
          onClick={onRetry}
          startIcon={
            <RefreshRounded
              sx={{
                fontSize: "16px !important",
                ...(isRetrying && {
                  animation: `${spin} 1s linear infinite`,
                }),
              }}
            />
          }
          sx={{
            minWidth: 0,
            px: 1,
            py: 0.25,
            borderRadius: 999,
            color: "error.main",
            fontSize: "1rem",
            textTransform: "none",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(244,67,54,0.12)"
                  : "rgba(244,67,54,0.08)",
            },
          }}
        >
          {isRetrying ? "重试中..." : "重试"}
        </Button>
      </Box>
    </Box>
  );
}
