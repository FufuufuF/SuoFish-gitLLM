# 主题与颜色系统设计

> 本文档定义了 gitLLM 项目中使用 Material UI 实现 Dark/Light 模式的最佳实践。

## 核心原则

1. **禁止硬编码颜色** - 所有颜色必须使用 MUI 提供的 `theme.palette` 变量
2. **使用语义化颜色** - 使用 `primary`、`secondary`、`background` 等语义 token，而非具体色值
3. **通过 ThemeProvider 统一管理** - 主题切换由顶层 Context 控制

---

## 实现方案

### 1. 创建主题配置

```tsx
// src/theme/theme.ts
import { createTheme, type PaletteMode } from "@mui/material";

// 创建主题的工厂函数
export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode, // 'light' | 'dark'
      primary: {
        main: "#6366f1", // 可自定义品牌色
      },
      secondary: {
        main: "#ec4899",
      },
      // MUI 会根据 mode 自动设置 background、text 等颜色
    },
  });
}
```

### 2. 创建主题 Context

```tsx
// src/theme/ThemeContext.tsx
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  type PaletteMode,
} from "@mui/material";
import { createAppTheme } from "./theme";

interface ThemeContextType {
  mode: PaletteMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>("dark");

  const toggleMode = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline /> {/* 重置样式并应用背景色 */}
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useThemeMode must be used within ThemeProvider");
  return context;
}
```

### 3. 在 App 入口使用

```tsx
// src/App.tsx
import { ThemeProvider } from "@/theme/ThemeContext";
import { RouterProvider } from "react-router-dom";

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
```

---

## 颜色使用规范

### ✅ 正确做法：使用 theme.palette

```tsx
// 方式 1：sx prop 中使用字符串路径
<Box sx={{ bgcolor: "background.paper", color: "text.primary" }} />

// 方式 2：sx prop 中使用回调函数
<Box sx={(theme) => ({ borderColor: theme.palette.divider })} />

// 方式 3：useTheme hook
import { useTheme } from "@mui/material";
const theme = useTheme();
<div style={{ color: theme.palette.primary.main }} />
```

### ❌ 错误做法：硬编码颜色

```tsx
// 禁止
<Box sx={{ bgcolor: "#1a1a1a", color: "#ffffff" }} />
<Box sx={{ bgcolor: "white" }} />
```

---

## 常用 Palette Token

| Token                | Light 模式 | Dark 模式 | 用途          |
| -------------------- | ---------- | --------- | ------------- |
| `background.default` | 浅灰白     | 深灰黑    | 页面背景      |
| `background.paper`   | 白色       | 深灰      | 卡片/弹窗背景 |
| `text.primary`       | 深灰黑     | 白色      | 主要文字      |
| `text.secondary`     | 灰色       | 浅灰      | 次要文字      |
| `divider`            | 浅灰       | 深灰      | 分割线        |
| `primary.main`       | 品牌主色   | 品牌主色  | 主要按钮/链接 |
| `action.hover`       | 浅灰       | 深灰      | 悬停状态      |
| `action.selected`    | 浅灰       | 深灰      | 选中状态      |

---

## 目录结构

```
src/
├── theme/
│   ├── theme.ts           # 主题配置（createAppTheme）
│   ├── ThemeContext.tsx   # 主题 Context 与 Provider
│   └── index.ts           # 导出
└── App.tsx                # 使用 ThemeProvider 包裹
```

---

## 主题切换按钮示例

```tsx
// src/components/common/ThemeToggle.tsx
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
```

---

## 持久化（可选）

如需记住用户偏好，可在 `ThemeContext` 中添加 localStorage 支持：

```tsx
const [mode, setMode] = useState<PaletteMode>(() => {
  return (localStorage.getItem("theme-mode") as PaletteMode) || "dark";
});

const toggleMode = () => {
  setMode((prev) => {
    const next = prev === "light" ? "dark" : "light";
    localStorage.setItem("theme-mode", next);
    return next;
  });
};
```
