import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/theme";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

export function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode();
  const [rotating, setRotating] = useState(false);

  const handleToggle = () => {
    setRotating(true);
    toggleMode();
    setTimeout(() => setRotating(false), 500);
  };

  return (
    <IconButton onClick={handleToggle} className="hover:shadow-glow-primary">
      <span className={cn("transition-transform duration-500", rotating && "rotate-180")}>
        {mode === "dark" ? <Sun /> : <Moon />}
      </span>
    </IconButton>
  );
}
