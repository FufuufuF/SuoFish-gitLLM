import { useState, useRef, useEffect } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { MarkdownContent } from "./markdown-content";
import type { Message } from "@/types";

interface BriefMessageItemProps {
  message: Message;
  onCopy?: (content: string) => void;
}

export function BriefMessageItem({
  message,
  onCopy: _onCopy,
}: BriefMessageItemProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [message.content]);

  return (
    <div className="ml-10 max-w-[85%]">
      <div className="overflow-hidden rounded-lg border border-primary/30 border-l-[3px] border-l-primary bg-secondary-glow">
        {/* 标题栏 */}
        <div className="flex items-center gap-2 border-b border-divider bg-secondary/10 px-4 py-2.5">
          <FileText size={16} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            学习简报
          </span>
        </div>

        {/* 内容区 */}
        <div className="relative">
          <div
            ref={contentRef}
            className="overflow-hidden px-4 py-3 text-sm transition-[max-height] duration-300 ease-in-out"
            style={{ maxHeight: expanded ? contentHeight : 100 }}
          >
            <MarkdownContent content={message.content} />
          </div>

          {!expanded && contentHeight > 100 && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-bg-paper/95" />
          )}
        </div>

        {/* 展开/收起按钮 */}
        <div className="flex justify-end border-t border-divider px-3 py-1">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-0.5 rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-action-hover"
          >
            {expanded ? (
              <>
                <ChevronUp size={14} />
                收起
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                展开
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
