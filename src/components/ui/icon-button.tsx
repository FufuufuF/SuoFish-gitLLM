import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ size = "md", className, disabled, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-colors",
          "text-text-secondary hover:bg-action-hover hover:text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:pointer-events-none disabled:opacity-40",
          size === "sm" && "h-7 w-7 [&_svg]:size-4",
          size === "md" && "h-9 w-9 [&_svg]:size-5",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
