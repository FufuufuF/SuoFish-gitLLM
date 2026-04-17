import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonCircle,
} from "./primitives/skeleton-base";

export function FullPageSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧 Sidebar 骨架 */}
      <div className="flex w-[480px] shrink-0 flex-col border-r border-divider bg-bg-default">
        <div className="flex h-11 items-center gap-4 border-b border-divider px-4">
          <SkeletonLine width={60} height={20} />
          <SkeletonLine width={60} height={20} />
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-3 py-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-1.5">
              <SkeletonCircle width={24} height={24} />
              <div className="flex-1">
                <SkeletonLine width={`${65 + (i % 3) * 10}%`} height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧主区域骨架 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-divider px-4">
          <SkeletonLine width={120} height={20} />
          <div className="flex-1" />
          <SkeletonCircle width={32} height={32} />
        </div>

        <div className="flex flex-1 flex-col gap-6 px-8 py-6">
          <MessageSkeletonRow align="left" widths={["75%", "60%", "40%"]} />
          <MessageSkeletonRow align="right" widths={["45%"]} />
          <MessageSkeletonRow align="left" widths={["80%", "55%"]} />
          <MessageSkeletonRow align="right" widths={["35%"]} />
          <MessageSkeletonRow align="left" widths={["70%", "50%", "60%"]} />
        </div>

        <div className="shrink-0 px-8 pb-6">
          <SkeletonBlock width="100%" height={72} className="rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

interface MessageSkeletonRowProps {
  align: "left" | "right";
  widths: string[];
}

function MessageSkeletonRow({ align, widths }: MessageSkeletonRowProps) {
  const isLeft = align === "left";

  return (
    <div className={`flex items-start gap-3 ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
      {isLeft && (
        <SkeletonCircle width={28} height={28} className="mt-0.5 shrink-0" />
      )}
      <div className={`flex max-w-[65%] flex-col gap-1.5 ${isLeft ? "items-start" : "items-end"}`}>
        {widths.map((w, i) => (
          <SkeletonLine key={i} width={w} height={16} />
        ))}
      </div>
    </div>
  );
}
