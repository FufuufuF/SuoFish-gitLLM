import { Box, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";

interface LayoutProps {
  /** Top area content (e.g. Header, Toolbar) */
  header?: ReactNode;
  /** Explicit height for the header. If not set, it wraps content. */
  headerHeight?: string | number;

  /** Main scrollable content */
  main: ReactNode;

  /** Bottom area content (e.g. Footer, Settings) */
  footer?: ReactNode;
  /** Explicit height for the footer. If not set, it wraps content. */
  footerHeight?: string | number;

  /** Container width, defaults to 100% */
  width?: string | number;

  /** Custom styles for the root container */
  sx?: SxProps<Theme>;
}

export function Layout({
  header,
  headerHeight,
  main,
  footer,
  footerHeight,
  width = "100%",
  sx,
}: LayoutProps) {
  return (
    <Box
      sx={{
        width: width,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // Prevent outer scrolling
        ...sx,
      }}
    >
      {/* 1. Header Area */}
      {header && (
        <Box
          component="header"
          sx={{
            height: headerHeight,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {header}
        </Box>
      )}

      {/* 2. Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0, // Fix flexbox child scrolling issue
          display: "flex",
          flexDirection: "column",
        }}
      >
        {main}
      </Box>

      {/* 3. Footer Area */}
      {footer && (
        <Box
          component="footer"
          sx={{
            height: footerHeight,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {footer}
        </Box>
      )}
    </Box>
  );
}
