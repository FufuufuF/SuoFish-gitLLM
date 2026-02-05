import { Box, Typography } from "@mui/material";

export function ChatPage() {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
    >
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
        👋 你好
      </Typography>
      <Typography variant="h6" color="text.secondary">
        需要我为你做些什么？
      </Typography>
    </Box>
  );
}
