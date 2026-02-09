# Chat Session 数据链路设计指南

> 本文档梳理 Chat Session 在 **API → Store → Hook** 三层之间的数据流转关系，重点解决「新会话延迟创建 + 乐观更新」场景。

## 1. 核心问题

用户点击「创建新会话」时：

1. **不应立即调用 API**：因为后端在用户发送第一条消息前不需要创建 `chat_session`
2. **必须支持乐观更新**：用户发送第一条消息后，Sidebar 必须立即显示新 session item
3. **ID 同步问题**：前端使用 `tempId`，后端返回真实 `id`，需要正确替换

这与 Message 的乐观更新模式类似，但 Chat Session 的生命周期更复杂。

---

## 2. 数据模型设计

### 2.1 ChatSession 类型扩展

```typescript
// src/types/chat-session.ts

export type ChatSessionStatus = "pending" | "creating" | "active" | "error";

export interface ChatSession {
  id?: number; // 后端真实 ID（新建时为空）
  tempId?: string; // 前端临时 ID（用于乐观更新）
  title?: string; // 会话标题（首次对话后由 AI 生成）
  goal?: string;
  status: ChatSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 状态流转说明

```
┌─────────────────────────────────────────────────────────────────┐
│                     ChatSession 状态流转                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [用户点击新建]        [发送第一条消息]          [后端响应]         │
│        │                      │                     │            │
│        ▼                      ▼                     ▼            │
│  ┌─────────────┐       ┌──────────┐         ┌──────────┐       │
│  │ 新会话模式     │       │ creating │         │  active  │       │
│  │ activeId=null │──────▶└──────────┘────────▶└──────────┘       │
│  │ 列表无变化      │       tempId: uuid         id: 后端ID        │
│  └─────────────┘       列表新增占位 item       tempId: 保留       │
│                        isTitleGenerating=true                    │
│                               │                                   │
│                               │ [失败]                            │
│                               ▼                                   │
│                          ┌─────────┐                            │
│                          │  error  │                            │
│                          └─────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 三层架构设计

### 3.1 层级职责划分

```
┌───────────────────────────────────────────────────────────────────┐
│                          视图层 (View)                             │
│  Sidebar / ChatPage 等组件                                         │
│  - 消费 Hook 返回的数据和方法                                        │
│  - 不直接访问 Store 或 API                                          │
└───────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────────┐
│                          Hook 层                                   │
│  use-chat-session.ts                                               │
│  - 封装业务逻辑（创建、切换、删除会话）                                │
│  - 协调 Store 和 API 的交互                                         │
│  - 处理乐观更新和错误回滚                                            │
└───────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│        Store 层              │   │           API 层                 │
│  chat-session-store.ts      │   │  api/common/chat-session.ts     │
│  - 管理 session 列表状态     │   │  - 纯网络请求封装                 │
│  - 提供原子化更新方法         │   │  - 不包含业务逻辑                 │
│  - 管理当前激活 session ID   │   │  - 返回原始后端数据               │
└─────────────────────────────┘   └─────────────────────────────────┘
```

### 3.2 数据流详解

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         完整数据链路图                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Sidebar]                                                               │
│      │                                                                   │
│      │ 1. 调用 startNewSession()                                          │
│      ▼                                                                   │
│  [useChatSession Hook]                                                   │
│      │                                                                   │
│      ├──▶ 2. 设置 activeSessionId = null（进入新会话模式）                 │
│      │       └──▶ UI 显示空白聊天界面，列表无变化                           │
│      │                                                                   │
│      └──▶ 3. isNewSessionMode = true                                      │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  [ChatInput] 用户发送第一条消息                                           │
│      │                                                                   │
│      │ 1. 调用 sendMessage(content)                                       │
│      ▼                                                                   │
│  [useMessage Hook]                                                       │
│      │                                                                   │
│      ├──▶ 2. 检测到 isNewSessionMode = true                               │
│      │                                                                   │
│      ├──▶ 3. 调用 createSession()，**此时才创建 session**                   │
│      │       ├──▶ store.addSession({ tempId, status: 'creating' })        │
│      │       ├──▶ setActiveSessionId(tempId)                              │
│      │       └──▶ setTitleGenerating(true)                                │
│      │                                                                   │
│      ├──▶ 4. 乐观添加 user message (tempMsgId)                            │
│      │                                                                   │
│      ├──▶ 5. 调用 chat API (不传 chat_session_id，让后端创建)               │
│      │       └──▶ [API] POST /chat/ { content }                           │
│      │                                                                   │
│      │       后端响应: { chat_session_id, thread_id, human_message, ... } │
│      │                                                                   │
│      ├──▶ 6. 更新 session store:                                          │
│      │       - confirmSessionCreation(tempId, chat_session_id, title)    │
│      │       - setTitleGenerating(false)                                 │
│      │                                                                   │
│      └──▶ 7. 更新 message store (同现有逻辑)                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 详细实现方案

### 4.1 API 层

API 层保持简单，仅封装网络请求，不包含业务逻辑。

```typescript
// src/api/common/chat-session.ts

import { apiClient } from "../core/client";

// ===== 请求/响应类型 =====

export interface GetChatSessionListRequest {
  cursor?: string;
  limit?: number;
}

export interface ApiChatSession {
  id: number;
  title?: string;
  goal?: string;
  status: number;
  active_status: number;
  create_at: Date; // ISO 日期字符串
  update_at: Date;
}

export interface GetChatSessionListResponse {
  items: ApiChatSession[];
  next_cursor?: string;
  has_more: boolean;
}

// ===== API 函数 =====

export async function getChatSessionList(request: GetChatSessionListRequest) {
  return apiClient.get<GetChatSessionListResponse>("/api/v1/chat_sessions/", {
    params: request,
  });
}

// 注意：createChatSession 不在此处实现
// 会话创建是 chat API 的副作用，在发送第一条消息时自动完成
```

### 4.2 Store 层

Store 管理 session 列表的状态，提供原子化的更新方法。

> [!IMPORTANT]
> `isTitleGenerating` 用于表示「新会话标题正在生成中」（类似 Gemini 的 loading 占位效果），**不用于分页加载状态**。分页逻辑由独立的通用组件管理。

```typescript
// src/stores/chat-session-store.ts

import { create } from "zustand";
import type { ChatSession, ChatSessionStatus } from "@/types";

export interface ChatSessionStore {
  // ===== 状态 =====
  sessions: ChatSession[];
  activeSessionId: string | number | null; // tempId 或真实 id
  isTitleGenerating: boolean; // 新会话标题是否正在生成（用于 loading 占位）

  // ===== Actions =====
  // 设置整个会话列表（用于初始加载）
  setSessions: (sessions: ChatSession[]) => void;

  // 添加新会话（乐观更新用）
  addSession: (session: ChatSession) => void;

  // 更新会话状态
  updateSessionStatus: (id: string | number, status: ChatSessionStatus) => void;

  // 用真实 ID 替换临时 ID
  replaceSessionId: (tempId: string, realId: number) => void;

  // 更新会话标题
  updateSessionTitle: (id: string | number, title: string) => void;

  // 设置当前激活会话
  setActiveSessionId: (id: string | number | null) => void;

  // 删除会话
  removeSession: (id: string | number) => void;

  // 设置标题生成状态
  setTitleGenerating: (generating: boolean) => void;
}

export const useChatSessionStore = create<ChatSessionStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isTitleGenerating: false,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions], // 新会话置顶
    })),

  updateSessionStatus: (id, status) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id || s.tempId === id ? { ...s, status } : s,
      ),
    })),

  replaceSessionId: (tempId, realId) =>
    set((state) => {
      const newSessions = state.sessions.map((s) =>
        s.tempId === tempId ? { ...s, id: realId } : s,
      );
      // 如果当前激活的是 tempId，也需要更新
      const newActiveId =
        state.activeSessionId === tempId ? realId : state.activeSessionId;
      return { sessions: newSessions, activeSessionId: newActiveId };
    }),

  updateSessionTitle: (id, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id || s.tempId === id ? { ...s, title } : s,
      ),
    })),

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id && s.tempId !== id),
    })),

  setTitleGenerating: (generating) => set({ isTitleGenerating: generating }),
}));
```

### 4.2.1 分页逻辑解耦：通用无限滚动组件

为了将分页逻辑与业务逻辑解耦，推荐实现一个通用的无限滚动组件，将数据请求回调作为参数传入。

```typescript
// src/components/common/infinite-scroll-list.tsx

import { useState, useCallback, useRef, useEffect } from "react";

export interface FetchResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface InfiniteScrollListProps<T> {
  /** 数据请求回调，由业务层提供 */
  fetchData: (cursor?: string) => Promise<FetchResult<T>>;
  /** 渲染单个列表项 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 渲染加载中状态 */
  renderLoading?: () => React.ReactNode;
  /** 渲染空状态 */
  renderEmpty?: () => React.ReactNode;
  /** 触发加载的距离阈值 (px) */
  threshold?: number;
}

export function InfiniteScrollList<T>({
  fetchData,
  renderItem,
  renderLoading,
  renderEmpty,
  threshold = 100,
}: InfiniteScrollListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // 加载更多数据
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchData(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setIsLoadingMore(false);
      setIsInitialLoading(false);
    }
  }, [fetchData, cursor, hasMore, isLoadingMore]);

  // 初始加载
  useEffect(() => {
    loadMore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 滚动检测
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        loadMore();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [loadMore, threshold]);

  if (isInitialLoading) {
    return renderLoading?.() ?? <div>Loading...</div>;
  }

  if (items.length === 0) {
    return renderEmpty?.() ?? <div>No items</div>;
  }

  return (
    <div ref={containerRef} style={{ overflowY: "auto", height: "100%" }}>
      {items.map((item, index) => renderItem(item, index))}
      {isLoadingMore && (renderLoading?.() ?? <div>Loading more...</div>)}
    </div>
  );
}
```

**使用示例**：

```tsx
// 在 Sidebar 中使用
import { InfiniteScrollList } from "@/components/common/infinite-scroll-list";
import { getChatSessionList } from "@/api/common/chat-session";

function SessionList() {
  const fetchSessions = async (cursor?: string) => {
    const response = await getChatSessionList({ cursor, limit: 20 });
    return {
      items: response.items.map(mapApiSessionToBusinessSession),
      nextCursor: response.next_cursor,
      hasMore: response.has_more,
    };
  };

  return (
    <InfiniteScrollList
      fetchData={fetchSessions}
      renderItem={(session) => (
        <SessionItem key={session.id} session={session} />
      )}
      renderLoading={() => <Skeleton />}
      renderEmpty={() => <EmptyState />}
    />
  );
}
```

**状态职责划分**：

| 状态                                   | 管理位置     | 说明               |
| -------------------------------------- | ------------ | ------------------ |
| `sessions`                             | Store        | 会话列表数据       |
| `activeSessionId`                      | Store        | 当前激活会话       |
| `isTitleGenerating`                    | Store        | 新会话标题加载状态 |
| `isLoadingMore` / `cursor` / `hasMore` | 分页组件内部 | 分页相关状态       |

````

### 4.3 Hook 层

Hook 封装业务逻辑，协调 Store 和 API 的交互。

```typescript
// src/hooks/use-chat-session.ts

import { useCallback, useEffect } from "react";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { getChatSessionList } from "@/api/common/chat-session";
import type { ChatSession } from "@/types";

export function useChatSession() {
  const {
    sessions,
    activeSessionId,
    isTitleGenerating,
    setSessions,
    addSession,
    updateSessionStatus,
    replaceSessionId,
    updateSessionTitle,
    setActiveSessionId,
    removeSession,
    setTitleGenerating,
  } = useChatSessionStore();

  // ===== 数据转换函数（供分页组件使用） =====
  const mapApiSessionToBusinessSession = useCallback(
    (item: ApiChatSession): ChatSession => ({
      id: item.id,
      title: item.title,
      goal: item.goal,
      status: "active" as const,
      createdAt: new Date(item.create_at),
      updatedAt: new Date(item.update_at),
    }),
    [],
  );

  // ===== 创建分页请求回调（传递给 InfiniteScrollList） =====
  const fetchSessionsForPagination = useCallback(
    async (cursor?: string) => {
      const response = await getChatSessionList({ cursor, limit: 20 });
      const mappedSessions = response.items.map(mapApiSessionToBusinessSession);
      // 同步更新 Store（可选，取决于是否需要全局访问）
      setSessions(mappedSessions);
      return {
        items: mappedSessions,
        nextCursor: response.next_cursor,
        hasMore: response.has_more,
      };
    },
    [mapApiSessionToBusinessSession, setSessions],
  );

  // ===== 创建新会话（乐观更新，不调用 API） =====
  const createSession = useCallback((): string => {
    const tempId = crypto.randomUUID();
    const now = new Date();

    const newSession: ChatSession = {
      tempId,
      title: "新会话", // 默认标题，后续由 AI 生成
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    addSession(newSession);
    setActiveSessionId(tempId);

    return tempId;
  }, [addSession, setActiveSessionId]);

  // ===== 切换会话 =====
  const switchSession = useCallback(
    (sessionId: string | number) => {
      setActiveSessionId(sessionId);
    },
    [setActiveSessionId],
  );

  // ===== 获取当前激活的会话对象 =====
  const activeSession = sessions.find(
    (s) => s.id === activeSessionId || s.tempId === activeSessionId,
  );

  // ===== 确认会话创建成功（由 message hook 调用） =====
  const confirmSessionCreation = useCallback(
    (tempId: string, realId: number, title?: string) => {
      replaceSessionId(tempId, realId);
      updateSessionStatus(realId, "active");
      if (title) {
        updateSessionTitle(realId, title);
      }
    },
    [replaceSessionId, updateSessionStatus, updateSessionTitle],
  );

  // ===== 标记会话创建失败 =====
  const markSessionError = useCallback(
    (sessionId: string | number) => {
      updateSessionStatus(sessionId, "error");
    },
    [updateSessionStatus],
  );

  return {
    // 状态
    sessions,
    activeSession,
    activeSessionId,
    isTitleGenerating,

    // 方法
    fetchSessionsForPagination, // 供 InfiniteScrollList 使用
    createSession,
    switchSession,
    confirmSessionCreation,
    markSessionError,
    removeSession,
    setTitleGenerating,
  };
}
````

---

## 5. 跨 Hook 协作

### 5.1 Message Hook 与 Session Hook 的协作

当用户在一个 `pending` 状态的 session 中发送第一条消息时，需要协调两个 Hook。

```typescript
// src/pages/chat/hooks/use-message.ts (修改版)

import { useChatSession } from "@/hooks/use-chat-session";

export function useMessage() {
  const { activeSessionId, confirmSessionCreation, markSessionError } =
    useChatSession();

  const sendMessage = async (content: string) => {
    const tempMsgId = crypto.randomUUID();
    const currentSessionId = activeSessionId;

    // 判断是否是新会话的第一条消息
    const isNewSession = typeof currentSessionId === "string";

    // 1. 乐观更新消息
    addMessage({
      id: tempMsgId,
      tempId: tempMsgId,
      role: 1,
      content,
      status: "sending",
      timestamp: new Date(),
    });

    try {
      // 2. 调用 chat API
      // 如果是新会话，不传 chat_session_id，让后端创建
      const response = await chatApi({
        chat_session_id: isNewSession
          ? undefined
          : (currentSessionId as number),
        temp_session_id: isNewSession ? currentSessionId : undefined, // 可选：让后端关联
        content,
      });

      // 3. 如果是新会话，更新 session store
      if (isNewSession && response.chat_session_id) {
        confirmSessionCreation(
          currentSessionId as string,
          response.chat_session_id,
          response.session_title, // 如果后端返回了标题
        );
      }

      // 4. 更新消息 (同现有逻辑)
      // ...
    } catch (error) {
      updateMessageStatus(tempMsgId, "error");
      if (isNewSession) {
        markSessionError(currentSessionId!);
      }
    }
  };

  // ...
}
```

---

## 6. 设计决策与 FAQ

### Q1: 为什么 Chat Session 需要 `tempId`？

与 Message 类似，为了支持乐观更新。用户点击「新建会话」时立即看到新 item，无需等待后端。

### Q2: `pending` 状态的 session 如何处理？

- 用户可以在 `pending` session 中输入消息
- 发送第一条消息时，状态转为 `creating`
- 后端响应后，状态转为 `active`，`tempId` 被替换为真实 `id`

### Q3: 如果用户刷新页面，`pending` session 会丢失吗？

是的。这是预期行为，因为 `pending` session 未持久化到后端。可以考虑使用 localStorage 缓存。

### Q4: Store 中同时存在 `tempId` 和 `id`，如何查找？

所有查找逻辑都应同时匹配：`s.id === id || s.tempId === id`

### Q5: 为什么 API 层不做数据转换？

遵循单一职责原则。API 层只负责网络请求，数据转换由 Hook 层完成。

---

## 7. 文件清单

| 文件路径                              | 职责                              |
| ------------------------------------- | --------------------------------- |
| `src/types/chat-session.ts`           | ChatSession 类型定义              |
| `src/api/common/chat-session.ts`      | API 请求封装                      |
| `src/stores/chat-session-store.ts`    | Zustand Store                     |
| `src/hooks/use-chat-session.ts`       | 业务逻辑 Hook                     |
| `src/pages/chat/hooks/use-message.ts` | 消息 Hook（需修改以协作 session） |
