import { useState } from "react";
import { Box, Typography, IconButton, Collapse } from "@mui/material";
import Article from "@mui/icons-material/Article";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";
import { MarkdownContent } from "./markdown-content";
import type { Message } from "@/types";

interface BriefMessageItemProps {
  message: Message;
  onCopy?: (content: string) => void;
}

/**
 * 学习简报（BRIEF）消息专属卡片
 * - 左侧 3px primary accent 竖条
 * - 默认折叠，点击「展开」查看完整内容
 * - 内容区复用 MarkdownContent
 */
export function BriefMessageItem({
  message,
  onCopy: _onCopy,
}: BriefMessageItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      sx={{
        maxWidth: "85%",
        ml: 5, // 与 AI 消息左对齐（头像 28px + gap 12px）
      }}
    >
      <Box
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "primary.main",
          borderOpacity: 0.3,
          borderLeft: "3px solid",
          borderLeftColor: "primary.main",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(99, 102, 241, 0.06)"
              : "rgba(99, 102, 241, 0.04)",
        }}
      >
        {/* 标题栏 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.25,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(99, 102, 241, 0.1)"
                : "rgba(99, 102, 241, 0.06)",
          }}
        >
          <Article sx={{ fontSize: 16, color: "primary.main" }} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "primary.main",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              fontSize: "0.7rem",
            }}
          >
            学习简报
          </Typography>
        </Box>

        {/* 内容区：折叠/展开 */}
        <Box sx={{ position: "relative" }}>
          <Collapse in={expanded} collapsedSize={100}>
            <Box sx={{ px: 2, py: 1.5, fontSize: "0.9rem" }}>
              <MarkdownContent content={message.content} />
            </Box>
          </Collapse>

          {/* 折叠遮罩：未展开时显示底部渐变 */}
          {!expanded && (
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 40,
                background: (theme) =>
                  `linear-gradient(to bottom, transparent, ${
                    theme.palette.mode === "dark"
                      ? "rgba(18, 18, 18, 0.95)"
                      : "rgba(250, 250, 255, 0.97)"
                  })`,
                pointerEvents: "none",
              }}
            />
          )}
        </Box>

        {/* 展开/收起按钮 */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            px: 1.5,
            py: 0.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <IconButton
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            sx={{ color: "primary.main", fontSize: "0.75rem" }}
          >
            {expanded ? (
              <>
                <ExpandLess fontSize="small" />
                <Typography
                  variant="caption"
                  sx={{ ml: 0.5, color: "primary.main" }}
                >
                  收起
                </Typography>
              </>
            ) : (
              <>
                <ExpandMore fontSize="small" />
                <Typography
                  variant="caption"
                  sx={{ ml: 0.5, color: "primary.main" }}
                >
                  展开
                </Typography>
              </>
            )}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
