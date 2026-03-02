# LCP 性能优化方案

> 基于项目全量代码审查，按影响程度从高到低排列。

---

## 一、🔴 关键阻塞项（预计 LCP 改善最大）

### 1. `react-markdown` + `react-syntax-highlighter` 同步导入 — 主 bundle 膨胀 ~400-500KB

**文件：** `src/pages/chat/components/markdown-content.tsx`

这两个重量级库在顶层同步 import，**即使用户还没发消息就已加载**：

```tsx
// ❌ 当前：全部进入主 bundle
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
```

**修复方案：** 使用 `React.lazy` + `Suspense` 懒加载 `MarkdownContent`，或至少懒加载 `SyntaxHighlighter`：

```tsx
// ✅ 方案 A：整个 MarkdownContent 懒加载
const MarkdownContent = React.lazy(() => import("./markdown-content"));

// ✅ 方案 B：仅 SyntaxHighlighter 懒加载（推荐）
const SyntaxHighlighter = React.lazy(() =>
  import("react-syntax-highlighter/dist/esm/prism-light").then(mod => ({
    default: mod.default
  }))
);
```

同时建议将 Prism 换为 **`prism-light`** 并只注册项目需要的语言，可以再减少 ~200KB。

---

### 2. `App.tsx` 中 `createBrowserRouter` 在渲染函数内创建 — 导致全树重挂载

**文件：** `src/App.tsx`

每次 App 重渲染都重建路由器，**触发整棵组件树卸载/重挂载**：

```tsx
// ❌ 当前
function App() {
  const bowserRouter = createBrowserRouter(router); // 每次渲染都创建新实例
  return <RouterProvider router={bowserRouter} />;
}
```

**修复方案：** 移到模块顶层：

```tsx
// ✅ 修复
const bowserRouter = createBrowserRouter(router);

function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={bowserRouter} />
    </ThemeProvider>
  );
}
```

---

### 3. 路由无代码分割 — 所有 feature 打入同一 chunk

**文件：** `src/router.tsx`

`ChatPage`、`RootLayout` 都是同步导入，所有页面及子组件（`ThreadMergeDrawer`、`ThreadForkDialog`、`ThreadTreePanel` 等）都在主 bundle 中。

**修复方案：**

```tsx
import { lazy, Suspense } from "react";

const ChatPage = lazy(() => import("@/pages/chat"));
const RootLayout = lazy(() => import("@/pages/root-layout"));

export const router: RouteObject[] = [
  {
    path: "/",
    element: <Suspense fallback={<FullPageSkeleton />}><RootLayout /></Suspense>,
    children: [
      { path: "chat/:chatSessionId?", element: <Suspense><ChatPage /></Suspense> },
    ],
  },
];
```

---

### 4. MUI Icons 全量引入 — 潜在 60-80KB gzipped

项目中十多处使用命名导入：

```tsx
// ❌ 当前（barrel export，tree-shaking 不可靠）
import { ContentCopy, Check, Refresh } from "@mui/icons-material";

// ✅ 修复（路径导入，确保只打包使用的图标）
import ContentCopy from "@mui/icons-material/ContentCopy";
import Check from "@mui/icons-material/Check";
import Refresh from "@mui/icons-material/Refresh";
```

**涉及文件：**

- `src/pages/chat/components/message-actions.tsx`
- `src/pages/chat/components/chat-input.tsx`
- `src/components/common/app-sidebar.tsx`
- `src/components/common/theme-toggle.tsx`
- `src/pages/chat/components/thread-fork-divider.tsx`
- `src/pages/chat/components/message-item.tsx`
- `src/pages/chat/components/brief-message-item.tsx`

---

## 二、🟡 渲染性能瓶颈（影响交互后 LCP / re-render）

### 5. 流式消息导致频繁全量 Markdown 解析

每个 streaming token 都会改变 `content`，触发 `MarkdownContent` 重新解析整段 markdown。

**修复方案：**

- 流式阶段用纯文本 `<pre>` 展示，流式结束后再渲染 `ReactMarkdown`
- 或用 `requestAnimationFrame` 节流 token 更新频率，攒够一批再 setState

```tsx
// 在 message-store 中
appendStreamingContent(threadId, content) {
  // 用 requestAnimationFrame 合并高频更新
  if (!this._rafId) {
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      set(state => { /* 批量写入 */ });
    });
  }
  this._pendingContent += content;
}
```

---

### 6. Zustand store 过度订阅 — 任何变化 → 全组件树级联重渲染

**文件：** `src/hooks/use-chat-session.ts`

解构了 store 全部 state + actions，导致**任何 session 数据变化都触发所有消费者重渲染**。

**修复方案：** 使用精确 selector：

```tsx
// ❌ 当前
const { sessions, isLoading, ... } = useChatSessionStore();

// ✅ 修复
const sessions = useChatSessionStore(s => s.sessions);
const isLoading = useChatSessionStore(s => s.isLoading);
// actions 直接从 getState() 获取，不触发订阅
const { createSession } = useChatSessionStore.getState();
```

---

### 7. 缺少 `React.memo` — 不必要的子树重渲染

以下组件**未被 memo 包裹**，每次父组件重渲染都会重新执行：

| 组件 | 文件 |
|------|------|
| `MessageList` | `src/pages/chat/components/message-list.tsx` |
| `BriefMessageItem` | `src/pages/chat/components/brief-message-item.tsx` |
| `ChatInput` | `src/pages/chat/components/chat-input.tsx` |
| `MessageActions` | `src/pages/chat/components/message-actions.tsx` |
| `ThreadForkDivider` | `src/pages/chat/components/thread-fork-divider.tsx` |
| `ThreadTreeNode` | `src/feature/thread-branch-graph/components/thread-tree-node.tsx`（递归组件，特别重要） |

---

### 8. `ChatSessionItem` 用 JS 状态管理 hover — 频繁 setState

**文件：** `src/feature/chat-session-list/components/chat-session-item.tsx`

```tsx
// ❌ 当前：鼠标每滑过一个列表项就触发 2 次 setState
const [isHovered, setIsHovered] = useState(false);

// ✅ 修复：改用 CSS :hover
<ListItemButton sx={{ '&:hover .action-buttons': { opacity: 1 } }}>
  <Box className="action-buttons" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>...</Box>
</ListItemButton>
```

---

### 9. `useThread` hook 过度订阅

**文件：** `src/hooks/use-thread.ts`

```tsx
const activeThreadMessages = useMessageStore((state) =>
  activeThreadId ? state.messagesByThread[activeThreadId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES,
);
```

- 每次消息追加（包括流式 token）都会触发 `useThread` 中 `isForkDisabled / isMergeDisabled` 的 `useMemo` 重算，但这些值几乎不需要实时更新。
- `useThread` 同时引入了 `useThreadListLoader`，形成不必要的订阅链路。

---

### 10. Sidebar 始终挂载 + `ChatSessionList` 持续订阅

**文件：** `src/components/common/app-sidebar.tsx`

```tsx
{/* 会话列表：始终挂载，切换时用 display 隐藏 */}
<Box sx={{ display: activeTab === "sessions" ? "flex" : "none" }}>
  <ChatSessionList />
</Box>
```

- `ChatSessionList` 即使不可见时也保持挂载和 store 订阅，持续消耗内存和触发重渲染。
- `ThreadTreePanel` 用了条件渲染 ✅（懒加载），但 `ChatSessionList` 没有。

---

## 三、🟢 构建层面优化

### 11. Vite build 配置 — 缺少分包策略和压缩优化

**文件：** `vite.config.ts`

当前几乎是默认配置，缺少 `build.rollupOptions.output.manualChunks`。

**修复方案：**

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'react-syntax-highlighter'],
        },
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 设置 chunk 大小警告限制
    chunkSizeWarningLimit: 500,
  },
});
```

---

### 12. `index.html` 缺少关键资源预加载提示

```html
<!-- ✅ 添加到 <head> -->
<link rel="preconnect" href="http://localhost:9090" />
<link rel="dns-prefetch" href="http://localhost:9090" />
<!-- 如有 CDN 字体/图标 -->
<link rel="preload" as="style" href="/path/to/critical.css" />
```

---

## 四、📋 文件级汇总

| 文件 | `React.memo` | `React.lazy` | 重量级同步导入 | 阻塞型 Effect | 主要问题 |
|------|:-----------:|:------------:|:-------------:|:-------------:|----------|
| `markdown-content.tsx` | ❌ | ❌ | ✅ react-markdown + prism | ❌ | **最大打包负担** |
| `message-item.tsx` | ✅ | ❌ | MUI icons | ❌ | 图标引入方式 |
| `message-list.tsx` | ❌ | ❌ | ❌ | ❌ | 未 memo |
| `brief-message-item.tsx` | ❌ | ❌ | MUI icons | ❌ | 未 memo，引用 MarkdownContent |
| `chat-input.tsx` | ❌ | ❌ | 6 个 MUI icons | ❌ | 未 memo |
| `message-actions.tsx` | ❌ | ❌ | 5 个 MUI icons | ❌ | 未 memo |
| `thread-fork-divider.tsx` | ❌ | ❌ | 1 MUI icon | ❌ | 未 memo |
| `chat/index.tsx` | ❌ | ❌ | 全量同步导入 | ✅ `useLayoutEffect` | 组件过大，渲染瀑布 |
| `router.tsx` | - | ❌ | 同步路由 | - | 无代码分割 |
| `App.tsx` | - | ❌ | - | - | router 在渲染函数中创建 |
| `app-sidebar.tsx` | ❌ | ❌ | 2 MUI icons | ❌ | SessionList 始终挂载 |
| `thread-tree-node.tsx` | ❌ | ❌ | MUI Chip | ❌ | 递归无 memo |
| `use-chat-session.ts` | - | - | - | ❌ | 全量订阅 store |
| `use-message.ts` | - | - | - | ❌ | 流式数据频繁触发 |
| `use-thread.ts` | - | - | - | ❌ | 过度订阅消息 store |
| `message-store.ts` | - | - | - | - | 流式更新创建大量新引用 |

---

## 五、📊 优先级执行路线图

| 优先级 | 优化项 | 预计 LCP 改善 | 工作量 |
|:---:|--------|:---:|:---:|
| **P0** | MarkdownContent 懒加载 + Prism-light | -400~500KB bundle | 中 |
| **P0** | `createBrowserRouter` 移到模块顶层 | 消除不必要全树重挂载 | 小 |
| **P0** | 路由级 `React.lazy` 代码分割 | -30% 主 bundle | 小 |
| **P1** | MUI Icons 路径导入 | -60~80KB bundle | 中 |
| **P1** | Vite manualChunks 分包 | 并行加载、缓存命中率↑ | 小 |
| **P1** | 流式消息渲染节流 | 减少 90%+ 重渲染 | 中 |
| **P2** | Zustand 精确 selector | 减少级联重渲染 | 中 |
| **P2** | 批量添加 React.memo | 减少子树重渲染 | 小 |
| **P3** | CSS hover 替代 JS hover | 列表场景性能↑ | 小 |
| **P3** | preconnect / dns-prefetch | 减少 API 首请求延迟 | 极小 |

---

> 建议从 **P0 的三项** 开始实施，改动小但对 LCP 影响最大。
