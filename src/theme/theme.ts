import { createTheme, type PaletteMode } from "@mui/material";

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#6366f1",
      },
      secondary: {
        main: "#ec4899",
      },
    },
  });
}
