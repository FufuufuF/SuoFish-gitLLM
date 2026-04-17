import { SkeletonCircle, SkeletonLine } from "@/components/skeletons/primitives/skeleton-base";

export interface ChatSessionListSkeletonProps {
  count?: number;
}

export function ChatSessionListSkeleton({
  count = 6,
}: ChatSessionListSkeletonProps) {
  return (
    <div className="px-2 pt-1">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="mx-2 mb-1 flex items-center gap-3 rounded-md px-3 py-2"
        >
          <SkeletonCircle width={18} height={18} />
          <div className="flex-1">
            <SkeletonLine height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}
