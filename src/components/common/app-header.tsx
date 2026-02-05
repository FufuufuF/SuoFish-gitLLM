import { Box, Typography } from "@mui/material";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="h6" color="text.primary">
        SuoFish
      </Typography>
      <ThemeToggle />
    </Box>
  );
}
