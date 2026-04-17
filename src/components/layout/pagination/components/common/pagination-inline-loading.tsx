export interface PaginationInlineLoadingProps {
  text?: string;
}

export function PaginationInlineLoading({
  text = "加载中",
}: PaginationInlineLoadingProps) {
  return (
    <div className="flex animate-fade-in-pure items-center justify-center py-3">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary-glow px-3 py-1">
        <div className="inline-flex items-center gap-1">
          <span className="h-[5px] w-[5px] rounded-full bg-primary animate-dot-bounce" />
          <span className="h-[5px] w-[5px] rounded-full bg-primary animate-dot-bounce [animation-delay:0.2s]" />
          <span className="h-[5px] w-[5px] rounded-full bg-primary animate-dot-bounce [animation-delay:0.4s]" />
        </div>

        <span className="select-none text-xs text-text-secondary">
          {text}
        </span>
      </div>
    </div>
  );
}
