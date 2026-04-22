import { useLayoutEffect, useRef } from "react";
import type { Virtualizer } from "@tanstack/react-virtual";

interface UseInitialAnchorOptions {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  itemCount: number;
  isInitialLoading: boolean;
  anchor: "start" | "end";
}

export function useInitialAnchor({
  virtualizer,
  itemCount,
  isInitialLoading,
  anchor,
}: UseInitialAnchorOptions) {
  const hasAnchoredRef = useRef(false);

  useLayoutEffect(() => {
    if (hasAnchoredRef.current) return;
    if (isInitialLoading || itemCount === 0) return;

    if (anchor === "end") {
      virtualizer.scrollToIndex(itemCount - 1, { align: "end" });
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(itemCount - 1, { align: "end" });
        hasAnchoredRef.current = true;
      });
    } else {
      hasAnchoredRef.current = true;
    }
  }, [isInitialLoading, itemCount, virtualizer, anchor]);
}
