import { createTheme, type PaletteMode, type Theme } from "@mui/material";

// 现代 AI SaaS 风格主题（Vercel / Linear 风格）
export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  // 基础色板
  const palette = isDark
    ? {
        mode: "dark" as const,
        primary: { main: "#00e5a0" }, // 极客荧光绿
        secondary: { main: "#a78bfa" },
        background: {
          default: "#09090b", // 极深灰黑
          paper: "#111113",
        },
        text: {
          primary: "#fafafa",
          secondary: "#a1a1aa",
        },
        divider: "rgba(255,255,255,0.08)",
        action: {
          hover: "rgba(255,255,255,0.04)",
          selected: "rgba(255,255,255,0.06)",
          disabled: "rgba(255,255,255,0.2)",
          disabledBackground: "rgba(255,255,255,0.06)",
        },
      }
    : {
        mode: "light" as const,
        primary: { main: "#0a0a0a" }, // 高对比黑
        secondary: { main: "#7c3aed" },
        background: {
          default: "#fafafa",
          paper: "#ffffff",
        },
        text: {
          primary: "#0a0a0a",
          secondary: "#71717a",
        },
        divider: "rgba(0,0,0,0.08)",
        action: {
          hover: "rgba(0,0,0,0.03)",
          selected: "rgba(0,0,0,0.05)",
          disabled: "rgba(0,0,0,0.2)",
          disabledBackground: "rgba(0,0,0,0.04)",
        },
      };

  // 通用边框token
  const border = isDark
    ? "1px solid rgba(255,255,255,0.08)"
    : "1px solid rgba(0,0,0,0.08)";

  return createTheme({
    palette,
    shape: {
      borderRadius: 10, // 全局统一圆角
    },
    typography: {
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      h1: { fontWeight: 500, letterSpacing: "-0.025em" },
      h2: { fontWeight: 500, letterSpacing: "-0.02em" },
      h3: { fontWeight: 500, letterSpacing: "-0.015em" },
      h4: { fontWeight: 500, letterSpacing: "-0.01em" },
      h5: { fontWeight: 500, letterSpacing: "-0.005em" },
      h6: { fontWeight: 500, letterSpacing: "0em" },
      subtitle1: { fontWeight: 400, letterSpacing: "0em" },
      subtitle2: { fontWeight: 500, letterSpacing: "0.01em" },
      body1: { fontWeight: 400, letterSpacing: "0em", lineHeight: 1.6 },
      body2: { fontWeight: 400, letterSpacing: "0.01em", lineHeight: 1.5 },
      button: { fontWeight: 500, letterSpacing: "0.02em", textTransform: "none" as const },
      caption: { letterSpacing: "0.02em" },
      overline: { letterSpacing: "0.08em", fontWeight: 500 },
    },
    shadows: [
      "none", // 0
      ...Array(24).fill("none"),
    ] as Theme["shadows"],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            // 全局滚动条美化
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              borderRadius: 3,
            },
            "*::-webkit-scrollbar": { width: 6 },
            "*::-webkit-scrollbar-track": { background: "transparent" },
            "*::-webkit-scrollbar-thumb": {
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              borderRadius: 3,
            },
          },
        },
      },
      // 移除 Paper 阴影，用边框替代
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { border, backgroundImage: "none" },
        },
      },
      // Card 无阴影 + 边框
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { border, backgroundImage: "none" },
        },
      },
      // Button 极简化
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            padding: "6px 16px",
          },
          outlined: { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" },
          contained: {
            "&:hover": { boxShadow: "none" },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      // Dialog 无阴影 + 边框
      MuiDialog: {
        defaultProps: { PaperProps: { elevation: 0 } },
        styleOverrides: {
          paper: {
            border,
            backgroundImage: "none",
            borderRadius: 12,
          },
        },
      },
      // Drawer 边框
      MuiDrawer: {
        styleOverrides: {
          paper: {
            border: "none",
            borderLeft: border,
            backgroundImage: "none",
          },
        },
      },
      // 输入框
      MuiTextField: {
        defaultProps: { variant: "outlined" as const },
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 8,
              "& fieldset": {
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              },
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: { fontSize: "0.9rem" },
        },
      },
      // Alert
      MuiAlert: {
        defaultProps: { variant: "outlined" as const },
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      // Chip
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            height: 26,
          },
        },
      },
      // Tooltip
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
            color: isDark ? "#fafafa" : "#0a0a0a",
            border,
            borderRadius: 8,
            fontSize: "0.8rem",
            padding: "6px 12px",
          },
        },
      },
      // Tabs
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none" as const,
            fontWeight: 500,
            minHeight: 40,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 2, borderRadius: 1 },
        },
      },
      // Skeleton 动画过渡更柔和
      MuiSkeleton: {
        defaultProps: { animation: "wave" as const },
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          },
        },
      },
      // Snackbar
      MuiSnackbar: {
        defaultProps: { anchorOrigin: { vertical: "bottom", horizontal: "center" } },
      },
      // ListItemButton
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      // Divider
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          },
        },
      },
      // Menu
      MuiMenu: {
        styleOverrides: {
          paper: {
            border,
            borderRadius: 10,
            backgroundImage: "none",
            marginTop: 4,
          },
        },
      },
    },
  });
}
