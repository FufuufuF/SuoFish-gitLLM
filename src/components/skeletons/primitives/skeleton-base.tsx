import { cn } from "@/lib/cn";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

const baseClass = "animate-pulse rounded-md bg-action-hover";

export function SkeletonLine({
  width = "100%",
  height = 16,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(baseClass, "rounded", className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonBlock({
  width,
  height,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(baseClass, className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonCircle({
  width = 28,
  height = 28,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(baseClass, "rounded-full", className)}
      style={{ width, height }}
    />
  );
}
