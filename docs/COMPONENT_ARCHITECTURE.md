# 组件架构设计指南

> 本文档定义了 gitLLM 项目中**布局组件**与**业务组件**的解耦原则与最佳实践。

## 页面整体结构

采用 Sidebar + Header + MainContentArea 的经典布局，MainContentArea 通过 react-router 动态切换：

```
┌─────────────────────────────────────────────────────────────────┐
│                        RootLayout                               │
├─────────────┬───────────────────────────────────────────────────┤
│             │                  Header (业务组件)                 │
│   Sidebar   ├───────────────────────────────────────────────────┤
│  (业务组件)  │                                                   │
│             │              Main Content Area                    │
│  ┌───────┐  │           (由 react-router <Outlet /> 控制)        │
│  │ Tab 1 │  │                                                   │
│  │ Tab 2 │  │                                                   │
│  └───────┘  │                                                   │
└─────────────┴───────────────────────────────────────────────────┘
```

**核心设计决策：**

- Sidebar 和 Header **固定不变**，不随路由切换重新渲染
- MainContentArea 通过 `<Outlet />` 动态渲染子路由页面
- Sidebar 和 Header 是**业务组件**，内部绑定业务逻辑（会话列表、分支切换、面包屑等）

---

## 核心原则：布局组件 vs 业务组件

### 布局组件 (Layout Components)

| 特征         | 说明                                        |
| ------------ | ------------------------------------------- |
| **职责**     | 定义区域划分、尺寸约束、滚动行为            |
| **状态**     | 无业务状态，仅有 UI 状态（如 sidebar 折叠） |
| **依赖**     | 不依赖任何业务 API 或 Store                 |
| **可复用性** | 高度通用，可跨项目使用                      |

### 业务组件 (Feature Components)

| 特征         | 说明                                 |
| ------------ | ------------------------------------ |
| **职责**     | 调用 API、管理业务状态、响应用户交互 |
| **状态**     | 连接 Store 或 Context、发起 API 请求 |
| **依赖**     | 依赖业务逻辑、API 接口               |
| **可复用性** | 项目内复用，通常不跨项目             |

---

## 目录结构

```
src/
├── components/
│   ├── layout/                    # 布局组件（唯一）
│   │   ├── Layout.tsx             # 通用上中下布局
│   │   └── index.ts
│   │
│   ├── common/                    # 通用 UI 组件（无业务依赖）
│   │   ├── SearchButton.tsx
│   │   ├── TabPanel.tsx
│   │   └── ...
│   │
│   └── features/                  # 业务组件
│       ├── chat/
│       │   ├── ChatInput.tsx
│       │   ├── ChatMessageList.tsx
│       │   └── ChatBubble.tsx
│       ├── sidebar/
│       │   ├── Sidebar.tsx            # 侧边栏业务组件（含 Tab 切换）
│       │   ├── ConversationList.tsx   # 历史会话列表
│       │   └── BranchTree.tsx         # 记忆分支树
│       ├── header/
│       │   ├── AppHeader.tsx          # 业务 Header（面包屑、用户菜单）
│       │   └── UserMenu.tsx
│       └── branch/
│           ├── BranchSuggestionCard.tsx
│           ├── MergeDialog.tsx
│           └── BriefPanel.tsx
│
├── pages/                         # 页面组件（组装层）
│   ├── RootLayout.tsx             # 根布局（Sidebar + Header + Outlet）
│   ├── chat/
│   │   └── index.tsx
│   └── settings/
│       └── index.tsx
│
└── App.tsx
```

---

## 路由与页面组装

### 路由配置

```tsx
// src/router.tsx
import { RootLayout } from "@/pages/RootLayout";
import { ChatPage } from "@/pages/chat";
import { SettingsPage } from "@/pages/settings";

export const router: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />, // 包含 Sidebar + Header
    children: [
      { index: true, element: <WelcomePage /> },
      { path: "chat/:conversationId?", element: <ChatPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
];
```

### RootLayout 实现

使用 `Layout` 组件 + flex 容器实现左右分栏，无需额外的 AppShell：

```tsx
// src/pages/RootLayout.tsx
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { Sidebar } from "@/components/features/sidebar/Sidebar";
import { AppHeader } from "@/components/features/header/AppHeader";

export function RootLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* 左侧：Sidebar（业务组件） */}
      <Box
        sx={{
          width: sidebarCollapsed ? 0 : 280,
          flexShrink: 0,
          transition: "width 0.2s",
          overflow: "hidden",
        }}
      >
        <Sidebar />
      </Box>

      {/* 右侧：Header + MainContentArea */}
      <Layout
        header={
          <AppHeader onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
        }
        main={<Outlet />}
      />
    </Box>
  );
}
```

---

## 组件分类速查表

| 组件                   | 类型 | 所属目录            | 职责                            |
| ---------------------- | ---- | ------------------- | ------------------------------- |
| `Layout`               | 布局 | `layout/`           | 通用上中下布局                  |
| `Sidebar`              | 业务 | `features/sidebar/` | 侧边栏（含 Tab 切换、会话列表） |
| `ConversationList`     | 业务 | `features/sidebar/` | 会话列表数据展示                |
| `BranchTree`           | 业务 | `features/sidebar/` | 分支树状图                      |
| `AppHeader`            | 业务 | `features/header/`  | 面包屑、用户头像、菜单          |
| `ChatMessageList`      | 业务 | `features/chat/`    | 消息列表                        |
| `ChatInput`            | 业务 | `features/chat/`    | 输入框                          |
| `BranchSuggestionCard` | 业务 | `features/branch/`  | 分支建议卡片                    |
| `MergeDialog`          | 业务 | `features/branch/`  | 合并对话框                      |

---

## 设计决策记录

### Q1: 为什么不需要 AppShell？

MVP 阶段，布局需求简单（固定侧边栏 + 主区域），只需：

- 一个 `Layout` 组件处理上中下布局
- 一个 flex 容器处理左右分栏
- Sidebar 折叠状态用 `useState` 管理

AppShell 适用于需要多种布局模式切换或跨项目复用的场景，对于当前项目属于过度设计。

### Q2: Sidebar 和 Header 为什么是业务组件？

- **Sidebar**：需要调用会话 API、管理分支切换逻辑、处理 Tab 状态
- **Header**：需要显示当前位置面包屑、用户菜单、触发 Sidebar 折叠

这些都是业务逻辑，不适合放在布局组件中。

### Q3: PRD 中的「右侧简报区」如何实现？

MVP 建议将简报作为特殊消息类型嵌入消息流中渲染，后续可扩展为可折叠的第三列。
