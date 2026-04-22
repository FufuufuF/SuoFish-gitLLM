import { useLayoutEffect, useRef } from "react";
import type { Virtualizer } from "@tanstack/react-virtual";

interface UsePrependAnchorOptions<T> {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  items: T[];
  getItemKey: (item: T, index: number) => string | number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  estimateSize: number;
}

export function usePrependAnchor<T>({
  virtualizer,
  items,
  getItemKey,
  scrollContainerRef,
  estimateSize,
}: UsePrependAnchorOptions<T>) {
  const prevFirstKeyRef = useRef<string | number | null>(null);
  const prevItemsLenRef = useRef(0);

  useLayoutEffect(() => {
    const prevLen = prevItemsLenRef.current;
    const curLen = items.length;

    if (prevLen > 0 && curLen > prevLen && prevFirstKeyRef.current !== null) {
      const curFirstKey = getItemKey(items[0], 0);
      if (curFirstKey !== prevFirstKeyRef.current) {
        const prependCount = curLen - prevLen;
        const container = scrollContainerRef.current;
        if (container) {
          container.scrollTop += prependCount * estimateSize;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const anchorItem = virtualizer
                .getVirtualItems()
                .find((vi) => vi.index === prependCount);
              if (anchorItem && container) {
                const currentTop = container.scrollTop;
                const expectedTop = anchorItem.start;
                const roughTop = prependCount * estimateSize;
                const correction = expectedTop - roughTop;
                if (Math.abs(correction) > 1) {
                  container.scrollTop = currentTop + correction;
                }
              }
            });
          });
        }
      }
    }

    if (items.length > 0) {
      prevFirstKeyRef.current = getItemKey(items[0], 0);
    }
    prevItemsLenRef.current = items.length;
  }, [items, getItemKey, scrollContainerRef, estimateSize, virtualizer]);
}
