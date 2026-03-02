import { Box, Typography, keyframes } from "@mui/material";

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const dotBounce = keyframes`
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40%           { opacity: 1;   transform: scale(1.1); }
`;

export interface PaginationInlineLoadingProps {
  text?: string;
}

export function PaginationInlineLoading({
  text = "加载中",
}: PaginationInlineLoadingProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 1.5,
        animation: `${fadeIn} 0.25s ease-out`,
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          borderRadius: 999,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(99,102,241,0.08)"
              : "rgba(99,102,241,0.06)",
        }}
      >
        {/* 三点脉冲 —— 与流式生成风格一致 */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            "& span": {
              width: 5,
              height: 5,
              borderRadius: "50%",
              bgcolor: "primary.main",
              animation: `${dotBounce} 1.4s ease-in-out infinite`,
              "&:nth-of-type(2)": { animationDelay: "0.2s" },
              "&:nth-of-type(3)": { animationDelay: "0.4s" },
            },
          }}
        >
          <span />
          <span />
          <span />
        </Box>

        <Typography
          variant="caption"
          sx={{ color: "text.secondary", userSelect: "none" }}
        >
          {text}
        </Typography>
      </Box>
    </Box>
  );
}
