import { Skeleton, type SkeletonProps } from "@mui/material";

/**
 * 单行文字骨架
 * @param width - 宽度，默认 "100%"
 * @param height - 高度，默认 16（约等于 body2 字号行高）
 */
export function SkeletonLine({
  width = "100%",
  height = 16,
  ...rest
}: SkeletonProps) {
  return (
    <Skeleton
      variant="text"
      animation="wave"
      width={width}
      height={height}
      {...rest}
    />
  );
}

/**
 * 矩形色块骨架（用于头像、图标、卡片等）
 */
export function SkeletonBlock({ width, height, sx, ...rest }: SkeletonProps) {
  return (
    <Skeleton
      variant="rounded"
      animation="wave"
      width={width}
      height={height}
      sx={{ borderRadius: 1, ...sx }}
      {...rest}
    />
  );
}

/**
 * 圆形骨架（用于头像）
 */
export function SkeletonCircle({
  width = 28,
  height = 28,
  ...rest
}: SkeletonProps) {
  return (
    <Skeleton
      variant="circular"
      animation="wave"
      width={width}
      height={height}
      {...rest}
    />
  );
}
