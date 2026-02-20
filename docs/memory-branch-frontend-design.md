# 记忆分支 — 前端实现设计文档

> 基于 [memory-branch-api-guide.md](./memory-branch-api-guide.md) 后端接口，设计前端的分层实现方案。  
> 原则：**用户友好但开发可控** — MVP 阶段优先跑通"创建分支 → 分支对话 → 合并回主线"的完整闭环，视觉上让用户清晰感知"我在哪条线上"。

---

## 目录

- [0. 设计决策总览](#0-设计决策总览)
- [1. Types 层 — 新增类型定义](#1-types-层--新增类型定义)
- [2. API 层 — 新增接口封装](#2-api-层--新增接口封装)
- [3. Store 层 — 状态管理改造](#3-store-层--状态管理改造)
- [4. Hooks 层 — 业务逻辑编排](#4-hooks-层--业务逻辑编排)
- [5. Components 层 — UI 组件](#5-components-层--ui-组件)
- [6. 现有文件改造清单](#6-现有文件改造清单)
- [7. 开发顺序建议](#7-开发顺序建议)
- [8. 待确认问题](#8-待确认问题)

---

## 0. 设计决策总览

| 决策项 | 选择 | 理由 |
|---|---|---|
| **线程树位置** | Sidebar 内 Tab 切换（Session列表 / Thread树） | 用户提出；常驻可见，切换成本低 |
| **消息加载接口** | `context-messages` 完全替代旧 `POST /message/` | 统一游标分页 + 跨线程聚合，消除两套分页逻辑 |
| **Fork 触发位置** | Chat 顶部面包屑栏的操作按钮 | 操作区集中，不污染消息列表 |
| **Merge UI 形态** | 右侧 Drawer 面板 | 沉浸式编辑简报，不遮挡主聊天区 |
| **Store 消息键** | 由 `sessionKey` → `threadId` 迁移 | context-messages 以 thread 为粒度返回，thread 是消息的最小展示单元 |

---

## 1. Types 层 — 新增类型定义

### 新建文件: `src/types/thread.ts`

```typescript
// ===== 枚举 =====

/** 线程类型 */
export enum ThreadType {
  /** 主线 */
  MAIN_LINE = 1,
  /** 子线程（分支） */
  SUB_LINE = 2,
}

/** 线程状态 */
export enum ThreadStatus {
  /** 活跃 */
  NORMAL = 1,
  /** 已合并 */
  MERGED = 2,
}

/** 消息类型 */
export enum MessageType {
  /** 普通聊天 */
  CHAT = 1,
  /** 学习简报 */
  BRIEF = 2,
}

// ===== 数据模型 =====

/** 线程（业务层，camelCase） */
export interface Thread {
  id: number;
  chatSessionId: number;
  parentThreadId: number | null;
  threadType: ThreadType;
  status: ThreadStatus;
  title: string | null;
  forkFromMessageId: number | null;
  createdAt: string;
}

/** 线程树节点（GET /thread-tree 返回的扁平节点） */
export interface ThreadTreeNode extends Thread {
  closedAt: string | null;
  messageCount: number;
  childrenCount: number;
}

/** 面包屑条目 */
export interface BreadcrumbItem {
  threadId: number;
  title: string | null;
  threadType: ThreadType;
  status: ThreadStatus;
  forkFromMessageId: number | null;
}

/** 合并预览 */
export interface MergePreview {
  threadId: number;
  targetThreadId: number;
  briefContent: string;
}

/** 合并确认响应 */
export interface MergeConfirmResult {
  mergedThread: Thread;
  targetThread: Thread;
  briefMessage: ContextMessage;
}
```

### 修改文件: `src/types/message.ts`

扩展 `MessageRole` 以支持 `system`(3)，新增 `MessageType`：

```typescript
// 扩展 role 枚举值
export type MessageRole = 1 | 2 | 3; // 1=user, 2=assistant, 3=system

// Message 接口新增 threadId 和 type 字段
export interface Message {
  id: number | string;
  role: MessageRole;
  type?: MessageType;          // 新增：1=CHAT, 2=BRIEF
  content: string;
  status?: MessageStatus;
  tempId?: string;
  timestamp?: Date;
  threadId?: number;           // 新增：消息所属线程，用于视觉分区
}
```

### 新建类型: `ContextMessage`（API 返回的跨线程消息格式）

```typescript
/** context-messages 接口返回的消息格式 */
export interface ContextMessage {
  id: number;
  role: MessageRole;
  type: MessageType;
  content: string;
  threadId: number;
  createdAt: string;
}
```

### 修改文件: `src/types/index.ts`

```typescript
export * from "./thread";       // 新增
export type { ContextMessage } from "./thread"; // 新增
```

---

## 2. API 层 — 新增接口封装

### 2.1 ApiClient 扩展（修改 `src/api/core/client.ts`）

需要新增 `patch` 方法：

```typescript
public patch<T, D>(apiPath: string, data: D): Promise<T> {
  return this.axios.patch(apiPath, data);
}
```

### 2.2 新建文件: `src/pages/api/thread.ts`

统一封装所有线程相关 API：

```typescript
import { apiClient } from "@/api";
import type {
  Thread, ThreadTreeNode, BreadcrumbItem,
  MergePreview, MergeConfirmResult, ContextMessage,
} from "@/types";

// ===== 类型定义（API 层，snake_case → 由 hook 层转换） =====

/** API 返回的原始线程格式 */
interface ApiThread {
  id: number;
  chat_session_id: number;
  parent_thread_id: number | null;
  thread_type: number;
  status: number;
  title: string | null;
  fork_from_message_id: number | null;
  created_at: string;
}

interface ApiThreadTreeNode extends ApiThread {
  closed_at: string | null;
  message_count: number;
  children_count: number;
}

interface ApiBreadcrumbItem {
  thread_id: number;
  title: string | null;
  thread_type: number;
  status: number;
  fork_from_message_id: number | null;
}

interface ApiContextMessage {
  id: number;
  role: number;
  type: number;
  content: string;
  thread_id: number;
  created_at: string;
}

// ===== 请求/响应类型 =====

interface ForkRequest {
  chat_session_id: number;
  parent_thread_id: number;
  title?: string | null;
}

interface ForkResponse {
  thread: ApiThread;
}

interface MergePreviewResponse {
  thread_id: number;
  target_thread_id: number;
  brief_content: string;
}

interface MergeConfirmRequest {
  brief_content: string;
}

interface MergeConfirmResponse {
  merged_thread: ApiThread;
  target_thread: ApiThread;
  brief_message: ApiContextMessage;
}

interface ContextMessagesResponse {
  messages: ApiContextMessage[];
  next_cursor: string | null;
  has_more: boolean;
}

interface ContextMessagesParams {
  direction?: "before" | "after";
  cursor?: string;
  limit?: number;
}

interface BreadcrumbResponse {
  breadcrumb: ApiBreadcrumbItem[];
  current_thread_id: number;
}

interface ThreadTreeResponse {
  session_id: number;
  active_thread_id: number;
  threads: ApiThreadTreeNode[];
}

interface UpdateSessionRequest {
  active_thread_id?: number;
  title?: string;
}

interface UpdateSessionResponse {
  session_id: number;
  title: string;
  active_thread_id: number;
  active_thread: ApiThread;
  updated_at: string;
}

// ===== API 函数 =====

/** 创建分支 */
export const forkThread = (data: ForkRequest) =>
  apiClient.post<ForkResponse, ForkRequest>("/threads/fork", data);

/** 合并预览 */
export const getMergePreview = (threadId: number) =>
  apiClient.post<MergePreviewResponse, undefined>(
    `/threads/${threadId}/merge/preview`, undefined
  );

/** 确认合并 */
export const confirmMerge = (threadId: number, briefContent: string) =>
  apiClient.post<MergeConfirmResponse, MergeConfirmRequest>(
    `/threads/${threadId}/merge/confirm`, { brief_content: briefContent }
  );

/** 获取上下文消息（游标分页） */
export const getContextMessages = (threadId: number, params?: ContextMessagesParams) =>
  apiClient.get<ContextMessagesResponse>(
    `/threads/${threadId}/context-messages`, params
  );

/** 更新会话（切换线程/改标题） */
export const updateChatSession = (sessionId: number, data: UpdateSessionRequest) =>
  apiClient.patch<UpdateSessionResponse, UpdateSessionRequest>(
    `/chat_sessions/${sessionId}`, data
  );

/** 获取面包屑 */
export const getBreadcrumb = (threadId: number) =>
  apiClient.get<BreadcrumbResponse>(`/threads/${threadId}/breadcrumb`);

/** 获取线程树 */
export const getThreadTree = (sessionId: number) =>
  apiClient.get<ThreadTreeResponse>(
    `/chat_sessions/${sessionId}/thread-tree`
  );
```

### 2.3 修改文件: `src/pages/api/index.ts`

```typescript
export * from "./chat";
export * from "./message";
export * from "./thread";    // 新增
```

---

## 3. Store 层 — 状态管理改造

### 3.1 新建文件: `src/stores/thread-store.ts`

管理当前会话的线程树、面包屑、活跃线程等**全局共享状态**。

```typescript
import { create } from "zustand";
import type { ThreadTreeNode, BreadcrumbItem, MergePreview } from "@/types";

interface ThreadStore {
  // ===== 状态 =====

  /** 当前会话的线程树节点（扁平列表） */
  threadTree: ThreadTreeNode[];

  /** 当前活跃线程的面包屑链路 */
  breadcrumb: BreadcrumbItem[];

  /** 当前活跃线程 ID */
  activeThreadId: number | null;

  /** 合并预览数据（Drawer 用） */
  mergePreview: MergePreview | null;

  /** 合并 Drawer 是否打开 */
  isMergeDrawerOpen: boolean;

  /** 线程操作进行中（fork/merge/switch 时的 loading） */
  isThreadOperating: boolean;

  // ===== Actions =====

  setThreadTree: (tree: ThreadTreeNode[]) => void;
  setBreadcrumb: (breadcrumb: BreadcrumbItem[]) => void;
  setActiveThreadId: (id: number | null) => void;

  /** 添加新线程到树（fork 后乐观更新） */
  addThreadToTree: (node: ThreadTreeNode) => void;

  /** 更新树中某个线程的状态（merge 后标记为 MERGED） */
  updateThreadInTree: (threadId: number, updates: Partial<ThreadTreeNode>) => void;

  setMergePreview: (preview: MergePreview | null) => void;
  setMergeDrawerOpen: (open: boolean) => void;
  setThreadOperating: (operating: boolean) => void;

  /** 重置（切换会话时清空） */
  reset: () => void;
}
```

### 3.2 改造 `src/stores/message-store.ts`

**核心变更：消息按 threadId 索引**

```
之前: messagesBySession[sessionId] → Message[]
之后: messagesByThread[threadId]  → Message[]
```

新增字段：

```typescript
interface MessageStore {
  /** 按 threadId 索引的消息列表 */
  messagesByThread: Record<number, Message[]>;

  /** 每个 threadId 的分页游标 */
  cursorsByThread: Record<number, { nextCursor: string | null; hasMore: boolean }>;

  // Actions
  getMessages: (threadId: number) => Message[];
  setMessages: (threadId: number, messages: Message[]) => void;
  prependMessages: (threadId: number, messages: Message[]) => void;  // 滚动加载
  addMessage: (threadId: number, message: Message) => void;
  setCursor: (threadId: number, cursor: string | null, hasMore: boolean) => void;
  getCursor: (threadId: number) => { nextCursor: string | null; hasMore: boolean };

  // 保留原有的 updateMessageStatus, updateMessageId 等，改为 threadId 索引
  clearThreadMessages: (threadId: number) => void;
}
```

> **兼容策略**：`messagesBySession` 保留（用于 `useChatOrchestrator` 新会话流程中 tempId 到真实 threadId 的过渡），在 `confirmSessionCreation` 时做迁移。

### 3.3 修改 `src/stores/index.ts`

```typescript
export { useChatSessionStore } from "./chat-session-store";
export { useMessageStore } from "./message-store";
export { useThreadStore } from "./thread-store";   // 新增
```

---

## 4. Hooks 层 — 业务逻辑编排

### 4.1 新建文件: `src/hooks/use-thread.ts`

**线程操作编排 Hook** — 处理 fork / merge / switch 的全流程（含 store 更新、API 调用、面包屑刷新）。

```typescript
export function useThread(sessionId: number | null, activeThreadId: number | null) {
  // 返回值:
  return {
    // 数据
    breadcrumb,
    threadTree,
    isThreadOperating,
    mergePreview,
    isMergeDrawerOpen,

    // 操作
    forkThread,           // 创建分支: fork → 加载消息 → 更新面包屑
    switchThread,         // 切换分支: PATCH session + 加载消息（并行）+ 更新面包屑
    startMergePreview,    // 打开合并: 获取预览 → 打开 Drawer
    confirmMerge,         // 确认合并: POST confirm → 加载父线程消息 → 更新面包屑
    cancelMerge,          // 取消合并: 关闭 Drawer

    // 数据加载
    fetchThreadTree,      // 加载线程树
    fetchBreadcrumb,      // 加载面包屑
  };
}
```

**核心编排逻辑**：

```
forkThread(title?)
  1. POST /threads/fork → 获得 newThread
  2. addThreadToTree(newThread)
  3. updateActiveThreadId(sessionId, newThread.id)   // chat-session-store
  4. GET /threads/{newThread.id}/context-messages     // 加载消息
  5. GET /threads/{newThread.id}/breadcrumb           // 更新面包屑

switchThread(targetThreadId)
  1. 并行请求:
     - PATCH /chat_sessions/{sessionId}              // 切换 active_thread
     - GET /threads/{targetThreadId}/context-messages // 加载消息
  2. GET /threads/{targetThreadId}/breadcrumb         // 更新面包屑
  3. setActiveThreadId(targetThreadId)

startMergePreview(threadId)
  1. POST /threads/{threadId}/merge/preview → 获得预览
  2. setMergePreview(preview)
  3. setMergeDrawerOpen(true)

confirmMerge(threadId, editedBrief)
  1. POST /threads/{threadId}/merge/confirm → 获得结果
  2. updateThreadInTree(threadId, { status: MERGED })
  3. updateActiveThreadId(sessionId, result.targetThread.id)
  4. GET /threads/{targetThread.id}/context-messages   // 加载父线程消息
  5. GET /threads/{targetThread.id}/breadcrumb          // 更新面包屑
  6. setMergeDrawerOpen(false)
```

### 4.2 改造 `src/pages/chat/hooks/use-message.ts`

**核心变更：使用 context-messages API + 游标分页**

```typescript
export function useMessage(threadId?: number | null) {
  // 消息键从 sessionKey 变为 threadId
  // fetchMessages → 调用 getContextMessages
  // 新增 loadMore → 向上滚动加载更多历史消息（cursor 分页）

  return {
    messages,
    sendMessage,
    fetchMessages,     // 初始加载（不传 cursor）
    loadMore,          // 滚动加载更多
    hasMore,           // 是否还有更多消息
  };
}
```

### 4.3 新建文件: `src/hooks/use-breadcrumb.ts`（可选，如逻辑简单可合并到 use-thread）

如果面包屑只是展示性数据 + 点击切换线程，逻辑足够简单的话可以不单独抽 hook，直接在 `useThread` 中管理。

**建议：不单独新建此 hook，合并到 `useThread` 中管理。**

### 4.4 修改 `src/hooks/index.ts`

```typescript
export { useChatSession } from "./use-chat-session";
export { useThread } from "./use-thread";    // 新增
```

---

## 5. Components 层 — UI 组件

### 5.1 面包屑栏（Chat 顶部）

**新建文件: `src/pages/chat/components/thread-breadcrumb.tsx`**

位于聊天区域顶部，展示 `[主线] > [父线程] > [当前线程]` 的路径导航。

功能：
- 显示面包屑链路（点击某节点 → 切换到该线程）
- 右侧操作按钮：
  - **🔀 创建分支** — 从当前线程 fork
  - **🔙 合并回主线** — 仅在子线程时显示，触发合并 Drawer

```
┌──────────────────────────────────────────────────────────────┐
│  📍 后端部署 > Docker部署探究  │  [🔀 创建分支] [🔙 合并]  │
└──────────────────────────────────────────────────────────────┘
```

UI 技术：MUI `Breadcrumbs` + `Chip` + `IconButton`

### 5.2 合并 Drawer（右侧面板）

**新建文件: `src/pages/chat/components/merge-drawer.tsx`**

功能：
- 展示 LLM 生成的学习简报预览（Markdown 渲染）
- 内置文本编辑器（`textarea` 或轻量 Markdown 编辑器）
- 底部操作按钮：「取消」「确认合并」

```
┌────────────────────────────┐
│  合并到: 后端部署           │
│  ─────────────────────     │
│                            │
│  ## 关键结论               │
│  - Docker 使用 cgroup...   │
│                            │
│  [可编辑区域]              │
│                            │
│  ─────────────────────     │
│  [取消]        [确认合并]  │
└────────────────────────────┘
```

状态：
- **预览模式**：用 `<MarkdownContent>` 渲染简报
- **编辑模式**：切换到 textarea，用户可修改
- Loading 状态（preview 请求中 / confirm 请求中）

UI 技术：MUI `Drawer`（anchor="right"）+ 复用 `<MarkdownContent>`

### 5.3 Sidebar Tab 切换 + 线程树

#### 修改: `src/components/common/app-sidebar.tsx`

增加 Tab 切换逻辑：

```
┌───────────────────────────┐
│  [对话列表] | [分支树]    │  ← MUI Tabs
├───────────────────────────┤
│  Tab 0: <ChatSessionList> │
│  Tab 1: <ThreadTreePanel> │
└───────────────────────────┘
```

- Tab 0（默认）：当前的 `<ChatSessionList />`
- Tab 1：新的 `<ThreadTreePanel />`（仅在有 activeSession 时可用）

#### 新建文件: `src/feature/thread-branch-graph/components/thread-tree-panel.tsx`

线程树面板，展示当前会话下的所有线程结构。

功能：
- 从 `threadTree`（扁平列表）构建树形结构渲染
- 每个节点显示：标题、状态（活跃/已合并）、消息数
- 点击节点 → 切换到该线程
- 当前线程高亮
- 已合并线程灰显 + 标签

```
└── 📋 后端部署 (主线)                    ← 高亮
    ├── 🔀 Docker 部署探究 (6条消息) [已合并]  ← 灰色
    └── 🔀 Nginx 配置 (3条消息)              ← 可点击
        └── 🔀 SSL 证书 (2条消息)            ← 可点击
```

UI 技术：MUI `TreeView` (从 `@mui/x-tree-view`) 或手动用缩进 + `ListItemButton` 实现

#### 新建文件: `src/feature/thread-branch-graph/components/thread-tree-node.tsx`

单个线程树节点组件。

#### 新建文件: `src/feature/thread-branch-graph/index.ts`

```typescript
export { ThreadTreePanel } from "./components/thread-tree-panel";
```

### 5.4 消息列表改造 — 线程分区视觉

#### 修改: `src/pages/chat/components/message-list.tsx`

消息列表现在每条消息带有 `threadId`，需要视觉区分：

- 来自**祖先线程**（继承下来的消息）：淡化显示（降低 opacity 或加浅色背景）
- 来自**当前线程**的消息：正常显示
- **BRIEF 类型消息**（学习简报）：特殊卡片样式（带标签、可折叠）

#### 新建文件: `src/pages/chat/components/brief-message-item.tsx`

学习简报消息的专用渲染组件：

```
┌─────────────────────────────────────┐
│ 📝 学习简报 — Docker 部署探究       │
│ ─────────────────────────────       │
│ ## 关键结论                         │
│ - Docker 使用 cgroup + namespace... │
│ [展开/收起]                         │
└─────────────────────────────────────┘
```

UI：带边框卡片 + 可折叠 + 复用 `<MarkdownContent>`

### 5.5 滚动加载

#### 修改: `src/pages/chat/components/message-list.tsx`

新增向上滚动加载逻辑（`IntersectionObserver` 放在列表顶部）：

- 滚动到顶部 → 调用 `loadMore()` → `prependMessages()` → 保持滚动位置

---

## 6. 现有文件改造清单

| 文件路径 | 改动类型 | 说明 |
|---|---|---|
| `src/api/core/client.ts` | **修改** | 新增 `patch` 方法 |
| `src/types/message.ts` | **修改** | `MessageRole` 增加 `3`(system)，`Message` 增加 `threadId`, `type` 字段 |
| `src/types/index.ts` | **修改** | 导出 thread 相关类型 |
| `src/stores/message-store.ts` | **重构** | 消息索引键从 `sessionKey` → `threadId`，新增游标分页支持 |
| `src/stores/index.ts` | **修改** | 导出 `useThreadStore` |
| `src/pages/chat/hooks/use-message.ts` | **重构** | 切换到 context-messages API，支持游标分页 |
| `src/pages/chat/hooks/use-chat-orchestrator.ts` | **修改** | 新会话创建后，消息迁移逻辑适配 threadId |
| `src/pages/chat/index.tsx` | **修改** | 集成面包屑、合并 Drawer；使用 `useThread` |
| `src/pages/chat/components/message-list.tsx` | **修改** | 支持线程分区视觉 + 向上滚动加载 |
| `src/pages/chat/components/message-item.tsx` | **修改** | 支持继承消息淡化 + BRIEF 类型分流 |
| `src/pages/chat/components/index.tsx` | **修改** | 导出新组件 |
| `src/pages/chat/types.ts` | **修改** | 与 `src/types/message.ts` 对齐 |
| `src/components/common/app-sidebar.tsx` | **修改** | 增加 Tab 切换逻辑 |
| `src/hooks/use-chat-session.ts` | **微调** | 切换会话时联动 `useThreadStore.reset()` |
| `src/hooks/index.ts` | **修改** | 导出 `useThread` |

---

## 7. 新建文件清单

| 文件路径 | 层次 | 说明 |
|---|---|---|
| `src/types/thread.ts` | Types | 线程/面包屑/合并相关类型 |
| `src/pages/api/thread.ts` | API | 7 个线程 API 封装 |
| `src/stores/thread-store.ts` | Store | 线程树 + 面包屑 + 合并状态 |
| `src/hooks/use-thread.ts` | Hook | 线程操作编排（fork/merge/switch） |
| `src/pages/chat/components/thread-breadcrumb.tsx` | Component | 面包屑导航栏 |
| `src/pages/chat/components/merge-drawer.tsx` | Component | 合并简报 Drawer |
| `src/pages/chat/components/brief-message-item.tsx` | Component | 学习简报消息卡片 |
| `src/feature/thread-branch-graph/components/thread-tree-panel.tsx` | Component | 线程树面板 |
| `src/feature/thread-branch-graph/components/thread-tree-node.tsx` | Component | 线程树节点 |
| `src/feature/thread-branch-graph/index.ts` | Export | 导出入口 |

---

## 8. 开发顺序建议

按依赖关系分阶段，每阶段可独立验收：

### Phase 1: 基础设施（~1d）

> 所有后续功能的地基

1. `types/thread.ts` — 类型定义
2. `api/core/client.ts` — 新增 `patch` 方法
3. `pages/api/thread.ts` — API 封装
4. `stores/thread-store.ts` — Thread Store
5. `types/message.ts` + `stores/message-store.ts` — 扩展 Message 类型 + 重构索引键

### Phase 2: 消息加载迁移（~1d）

> 将消息加载切换到 context-messages

6. `pages/chat/hooks/use-message.ts` — 切换到 context-messages + 游标分页
7. `pages/chat/hooks/use-chat-orchestrator.ts` — 适配新消息存储
8. `pages/chat/index.tsx` — 适配新数据流

此阶段完成后，现有功能不退化（单线程会话正常运作）。

### Phase 3: 线程操作核心（~1.5d）

> Fork + Switch + 面包屑

9. `hooks/use-thread.ts` — fork/switch 逻辑
10. `pages/chat/components/thread-breadcrumb.tsx` — 面包屑 UI
11. 修改 `pages/chat/index.tsx` — 集成面包屑
12. 消息列表线程分区视觉

### Phase 4: 合并流程（~1d）

> Merge preview → edit → confirm

13. `pages/chat/components/merge-drawer.tsx` — 合并 Drawer
14. `pages/chat/components/brief-message-item.tsx` — 简报消息卡片
15. `hooks/use-thread.ts` — merge 逻辑

### Phase 5: 线程树 + Sidebar Tab（~1d）

> 侧边栏增强

16. `feature/thread-branch-graph/` — 线程树面板
17. 修改 `app-sidebar.tsx` — Tab 切换

**总估时：~5.5 个工作日**

---

## 9. 待确认问题

### 已确认

| # | 问题 | 结论 |
|---|---|---|
| 1 | 线程树位置 | Sidebar Tab 切换 |
| 2 | 消息 API | context-messages 完全替代 |
| 3 | Fork 触发位置 | 面包屑栏操作按钮 |
| 4 | 合并 UI | 右侧 Drawer |

### 待确认

| # | 问题 | 影响范围 | 建议默认方案 |
|---|---|---|---|
| 1 | 线程树是否需要 `@mui/x-tree-view` 依赖，还是手动用缩进实现？ | 依赖管理 + 组件复杂度 | 手动实现（减少依赖），MVP 够用 |
| 2 | 合并 Drawer 的简报编辑是用纯 `textarea` 还是轻量 Markdown 编辑器？ | 开发量 | MVP 用 `textarea`，后续可升级 |
| 3 | `POST /chat/` 发送消息接口现在是否已携带 `thread_id`？（现有 ChatRequest 已有该字段） | API 适配 | 已有，无需改动 |
| 4 | 创建分支时是否需要弹窗让用户输入分支标题？还是自动生成？ | Fork 交互复杂度 | 可选输入：弹出简单 Dialog 带一个输入框，允许留空 |
| 5 | 继承自父线程的消息（淡化显示）是否允许交互（复制/重新生成）？ | MessageItem 改动量 | 允许复制，不允许重新生成 |
| 6 | 已合并的线程在线程树中点击后要跳转还是仅查看？ | 切换逻辑 | 可以跳转查看（只读），但不能在已合并线程中发消息 |

---

## 数据流总览

```
用户操作                API 调用                  Store 更新                   UI 更新
─────────             ─────────               ──────────                 ──────────

[创建分支]
  │
  ├─→ POST /threads/fork ──────→ threadStore.addThreadToTree()  ──→ 线程树更新
  │                              chatSessionStore.updateActiveThreadId()
  │
  ├─→ GET /context-messages ──→ messageStore.setMessages()     ──→ 消息列表更新
  │
  └─→ GET /breadcrumb ────────→ threadStore.setBreadcrumb()    ──→ 面包屑更新


[切换分支]
  │
  ├─→ PATCH /chat_sessions/{id} ──→ chatSessionStore.updateActiveThreadId()
  │          ↕ 并行
  ├─→ GET /context-messages ──────→ messageStore.setMessages()  ──→ 消息列表更新
  │
  └─→ GET /breadcrumb ───────────→ threadStore.setBreadcrumb()  ──→ 面包屑更新


[合并分支]
  │
  ├─→ POST /merge/preview ────→ threadStore.setMergePreview()   ──→ Drawer 打开
  │
  ├─→ [用户编辑简报]
  │
  ├─→ POST /merge/confirm ────→ threadStore.updateThreadInTree() ──→ 线程树更新
  │                              chatSessionStore.updateActiveThreadId()
  │
  ├─→ GET /context-messages ──→ messageStore.setMessages()       ──→ 消息列表更新
  │
  └─→ GET /breadcrumb ────────→ threadStore.setBreadcrumb()      ──→ 面包屑更新


[滚动加载]
  │
  └─→ GET /context-messages?cursor=xxx → messageStore.prependMessages() ──→ 消息列表向上扩展
```
