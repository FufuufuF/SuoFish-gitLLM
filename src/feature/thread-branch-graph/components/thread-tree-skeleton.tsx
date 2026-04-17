import { SkeletonCircle, SkeletonLine } from "@/components/skeletons/primitives/skeleton-base";

const SKELETON_ROWS = [
  { indent: 0, width: "60%" },
  { indent: 2, width: "50%" },
  { indent: 4, width: "45%" },
  { indent: 2, width: "55%" },
  { indent: 0, width: "65%" },
];

export function ThreadTreeSkeleton() {
  return (
    <div className="px-4 py-2">
      {SKELETON_ROWS.map((row, i) => (
        <div
          key={i}
          className="mb-2 flex items-center"
          style={{ paddingLeft: row.indent * 8 }}
        >
          <SkeletonCircle width={16} height={16} className="mr-2 shrink-0" />
          <SkeletonLine width={row.width} height={16} />
        </div>
      ))}
    </div>
  );
}
