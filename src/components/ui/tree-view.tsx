import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface TreeViewContextType {
  expandedItems: Set<string>;
  selectedItem: string;
  toggleExpand: (itemId: string) => void;
}

const TreeViewContext = createContext<TreeViewContextType | null>(null);

function useTreeView() {
  const ctx = useContext(TreeViewContext);
  if (!ctx) throw new Error("TreeNode must be used within TreeView");
  return ctx;
}

interface TreeViewProps {
  defaultExpandedItems?: string[];
  selectedItems?: string;
  children: ReactNode;
  className?: string;
}

export function TreeView({
  defaultExpandedItems = [],
  selectedItems = "",
  children,
  className,
}: TreeViewProps) {
  const [expandedItems, setExpandedItems] = useState(
    () => new Set(defaultExpandedItems),
  );

  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  return (
    <TreeViewContext.Provider
      value={{ expandedItems, selectedItem: selectedItems, toggleExpand }}
    >
      <div role="tree" className={className}>
        {children}
      </div>
    </TreeViewContext.Provider>
  );
}

interface TreeNodeProps {
  itemId: string;
  label: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  children?: ReactNode;
}

export function TreeNode({ itemId, label, onClick, children }: TreeNodeProps) {
  const { expandedItems, selectedItem, toggleExpand } = useTreeView();
  const isExpanded = expandedItems.has(itemId);
  const isSelected = selectedItem === itemId;
  const hasChildren = Boolean(children);

  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpand(itemId);
  };

  return (
    <div role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
      <div
        onClick={handleClick}
        className={cn(
          "flex cursor-pointer items-center rounded-md py-1 px-1",
          "transition-colors duration-100",
          isSelected ? "bg-action-selected" : "hover:bg-action-hover",
        )}
      >
        {hasChildren ? (
          <button
            onClick={handleExpandClick}
            className="mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-action-hover"
          >
            <ChevronRight
              size={14}
              className={cn(
                "transition-transform duration-150",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="mr-0.5 w-5 shrink-0" />
        )}

        <div className="min-w-0 flex-1">{label}</div>
      </div>

      {hasChildren && isExpanded && (
        <div role="group" className="ml-3 border-l border-divider pl-1">
          {children}
        </div>
      )}
    </div>
  );
}
