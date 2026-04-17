import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonCircle,
} from "./primitives/skeleton-base";

export function ChatPageSkeleton() {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-6">
        <AiMessageSkeleton widths={["78%", "62%", "45%"]} />
        <HumanMessageSkeleton width="40%" />
        <AiMessageSkeleton widths={["72%", "55%"]} />
        <HumanMessageSkeleton width="30%" />
        <AiMessageSkeleton widths={["80%", "68%", "54%", "35%"]} />
      </div>

      <div className="shrink-0 px-8 pb-6">
        <SkeletonBlock width="100%" height={80} className="rounded-2xl" />
      </div>
    </div>
  );
}

function AiMessageSkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="flex items-start gap-3">
      <SkeletonCircle width={28} height={28} className="mt-0.5 shrink-0" />
      <div className="flex max-w-[85%] flex-1 flex-col gap-1.5">
        {widths.map((w, i) => (
          <SkeletonLine key={i} width={w} height={16} />
        ))}
      </div>
    </div>
  );
}

function HumanMessageSkeleton({ width }: { width: string }) {
  return (
    <div className="flex justify-end">
      <SkeletonBlock width={width} height={38} className="rounded-xl" />
    </div>
  );
}
