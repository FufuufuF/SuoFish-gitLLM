import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex items-center border-b border-divider",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium",
        "text-text-secondary transition-colors hover:text-text-primary",
        "data-[state=active]:text-text-primary",
        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
        "after:scale-x-0 after:bg-primary after:transition-transform",
        "data-[state=active]:after:scale-x-100",
        "focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}
