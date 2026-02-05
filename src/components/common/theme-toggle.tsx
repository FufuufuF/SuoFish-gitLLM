import { IconButton } from "@mui/material";
import { DarkMode, LightMode } from "@mui/icons-material";
import { useThemeMode } from "@/theme";

export function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode();

  return (
    <IconButton onClick={toggleMode} color="inherit">
      {mode === "dark" ? <LightMode /> : <DarkMode />}
    </IconButton>
  );
}
