import { Box, Skeleton } from "@mui/material";

// 模拟分支树结构的骨架屏
const SKELETON_ROWS = [
  { indent: 0, width: "60%" },
  { indent: 2, width: "50%" },
  { indent: 4, width: "45%" },
  { indent: 2, width: "55%" },
  { indent: 0, width: "65%" },
];

export function ThreadTreeSkeleton() {
  return (
    <Box sx={{ px: 2, py: 1 }}>
      {SKELETON_ROWS.map((row, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            pl: row.indent,
            mb: 1,
          }}
        >
          {/* 展开图标占位 */}
          <Skeleton
            variant="circular"
            width={16}
            height={16}
            sx={{ mr: 1, flexShrink: 0 }}
          />
          <Skeleton
            variant="text"
            width={row.width}
            sx={{ fontSize: "1rem" }}
          />
        </Box>
      ))}
    </Box>
  );
}
