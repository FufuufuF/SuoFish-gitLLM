import { Box, Typography, keyframes } from "@mui/material";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const dotPulse = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40%           { opacity: 1;    transform: scale(1.15); }
`;

export interface PaginationInitialLoadingProps {
  text?: string;
}

export function PaginationInitialLoading({
  text = "正在加载内容",
}: PaginationInitialLoadingProps) {
  return (
    <Box
      sx={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          animation: `${fadeIn} 0.35s ease-out`,
        }}
      >
        {/* 三点脉冲动画 —— 沿用项目流式生成风格 */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            "& span": {
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "primary.main",
              animation: `${dotPulse} 1.4s ease-in-out infinite`,
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
          variant="body2"
          sx={{
            color: "text.secondary",
            letterSpacing: "0.02em",
            userSelect: "none",
          }}
        >
          {text}
        </Typography>
      </Box>
    </Box>
  );
}
