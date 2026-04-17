import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface LayoutProps {
  header?: ReactNode;
  headerHeight?: string | number;
  main: ReactNode;
  footer?: ReactNode;
  footerHeight?: string | number;
  width?: string | number;
  className?: string;
}

export function Layout({
  header,
  headerHeight,
  main,
  footer,
  footerHeight,
  width = "100%",
  className,
}: LayoutProps) {
  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden", className)}
      style={{ width }}
    >
      {header && (
        <header className="flex shrink-0 flex-col" style={{ height: headerHeight }}>
          {header}
        </header>
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {main}
      </main>

      {footer && (
        <footer className="flex shrink-0 flex-col" style={{ height: footerHeight }}>
          {footer}
        </footer>
      )}
    </div>
  );
}
