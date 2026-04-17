import { SkeletonLine } from "./primitives/skeleton-base";

export function ThinkingSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <SkeletonLine width="72%" height={16} />
      <SkeletonLine width="55%" height={16} />
      <SkeletonLine width="40%" height={16} />
    </div>
  );
}
