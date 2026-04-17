import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "default", size = "md", className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-primary text-primary-contrast hover:bg-primary-hover active:scale-[0.98]",
          variant === "outline" && "border border-border text-text-primary hover:bg-action-hover",
          variant === "ghost" && "text-text-secondary hover:bg-action-hover hover:text-text-primary",
          variant === "destructive" && "bg-error text-white hover:bg-error/90",
          size === "sm" && "h-8 px-3 text-sm",
          size === "md" && "h-9 px-4 text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
