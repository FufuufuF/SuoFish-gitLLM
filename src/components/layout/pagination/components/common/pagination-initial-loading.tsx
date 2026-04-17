export interface PaginationInitialLoadingProps {
  text?: string;
}

export function PaginationInitialLoading({
  text = "正在加载内容",
}: PaginationInitialLoadingProps) {
  return (
    <div className="grid h-full place-items-center px-4">
      <div className="flex animate-fade-in flex-col items-center gap-4">
        <div className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary animate-dot-pulse" />
          <span className="h-2 w-2 rounded-full bg-primary animate-dot-pulse [animation-delay:0.2s]" />
          <span className="h-2 w-2 rounded-full bg-primary animate-dot-pulse [animation-delay:0.4s]" />
        </div>

        <p className="select-none text-sm tracking-wide text-text-secondary">
          {text}
        </p>
      </div>
    </div>
  );
}
