# 无限滚动分页列表技术设计文档

> 本文档描述项目中无限滚动分页列表的整体设计方案，包括现有的向下加载组件，以及待实现的向上加载组件（用于消息历史），并说明两者的职责边界与集成方式。
>
> **硬性约束**：`MessageList` 的分区渲染逻辑（祖先消息 / 分叉点 / 当前分支）必须完整保留。`UpwardInfiniteList` 通过 **children 模式**包裹 `MessageList`，不承担任何消息渲染职责。

---

## 1. 整体架构

项目维护两个**并行**的通用滚动组件，职责严格分离，不合并：

```
src/components/layout/
  ├── infinite-scroll-list.tsx      ← 向下加载（已实现）
  └── upward-infinite-list.tsx      ← 向上加载（待实现）
```

| 组件                 | 滚动方向     | 典型场景           | Sentinel 位置 |
| -------------------- | ------------ | ------------------ | ------------- |
| `InfiniteScrollList` | 向下触底加载 | 会话列表、搜索结果 | 列表**底部**  |
| `UpwardInfiniteList` | 向上触顶加载 | 聊天消息历史       | 列表**顶部**  |

> [!IMPORTANT]
> 两个组件不合并为一个带 `direction` 参数的组件。方向不同导致内部逻辑（Sentinel 位置、滚动位置保持）存在结构性差异，合并只会增加复杂度。

---

## 2. 现有组件：`InfiniteScrollList`（向下加载）

### 2.1 核心设计

- **分页状态内聚**：`cursor`、`hasMore`、`isLoadingMore` 全部由组件内部管理，外部无需感知。
- **数据写入 Store 由外部负责**：组件只接收 `items`（来自 Store）和 `fetchMore` 回调；`fetchMore` 由 Hook 层提供，负责调用 API 并写入 Store，仅返回分页元数据 `{ nextCursor, hasMore }`。
- **IntersectionObserver**：底部哨兵元素进入视口时触发加载，性能优于 scroll 事件监听。

### 2.2 Props 接口

```typescript
export interface LoadMoreResult {
  nextCursor?: string;
  hasMore: boolean;
}

export interface InfiniteScrollListProps<T> {
  /** 外部传入的列表数据（来自 Store） */
  items: T[];
  /** 加载更多回调，由 Hook 层提供。负责获取数据并写入 Store，仅返回分页元数据 */
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  sx?: SxProps<Theme>;
}
```

### 2.3 状态职责表

| 状态                                   | 归属          | 说明                      |
| -------------------------------------- | ------------- | ------------------------- |
| `cursor` / `hasMore` / `isLoadingMore` | 组件内部      | 分页元数据，外部无需感知  |
| `isInitialLoading`                     | 组件内部      | 首次加载状态              |
| 列表数据（`items`）                    | Store → Props | 通过 Props 传入，组件只读 |

### 2.4 使用示例

```tsx
// src/pages/chat/components/chat-session-list.tsx
import { InfiniteScrollList } from "@/components/layout/infinite-scroll-list";
import { useChatSession } from "@/hooks/use-chat-session";

function ChatSessionList() {
  const { sessions, fetchMore } = useChatSession();

  return (
    <InfiniteScrollList
      items={sessions}
      fetchMore={fetchMore}
      renderItem={(session) => <ChatSessionItem session={session} />}
      renderLoading={() => <ChatSessionSkeleton />}
      renderEmpty={() => <ChatSessionEmpty />}
    />
  );
}
```

---

## 3. 待实现组件：`UpwardInfiniteList`（向上加载）

### 3.1 应用场景

消息列表的历史记录加载：进入聊天页时展示最新一页消息，用户向上滚动时加载更旧的消息。

### 3.2 核心挑战

**滚动位置跳变（Content Shift）**：在顶部插入新内容后，浏览器会将所有内容向下推，导致当前阅读位置跳变。必须在加载前后通过 `scrollHeight` 差值修正 `scrollTop`：

```typescript
const prevScrollHeight = container.scrollHeight;
await fetchMore(); // 等待 DOM 更新
// React 更新是异步的，需在下一个 tick 修正
requestAnimationFrame(() => {
  container.scrollTop += container.scrollHeight - prevScrollHeight;
});
```

### 3.3 Props 接口设计

采用 **children 模式**：组件本身只负责滚动容器和分页机制，内容渲染完全交给 children。

```typescript
export interface UpwardInfiniteListProps {
  /** 分页驱动信息：仅用于判断 hasMore / 传递 cursor，不参与渲染 */
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  /** 子节点（如 MessageList），由外部完全控制渲染 */
  children: React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  /** 是否无数据（用于判断空状态） */
  isEmpty?: boolean;
  /** 暴露命令式方法，供父组件调用 scrollToBottom */
  ref?: React.Ref<UpwardInfiniteListHandle>;
  sx?: SxProps<Theme>;
}

export interface UpwardInfiniteListHandle {
  /** 滚动到底部（新消息追加后由父组件调用） */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}
```

> [!NOTE]
> 不再暴露 `renderItem`。内容由 children 提供，`UpwardInfiniteList` 对内容结构完全透明。

### 3.4 内部渲染结构

```
<Box ref={containerRef} sx={{ overflowY: 'auto', height: '100%' }}>
  {/* 顶部哨兵：进入视口时触发加载旧消息 */}
  <div ref={topSentinelRef} style={{ minHeight: 1 }} />

  {/* 加载中指示器（显示在顶部） */}
  {isLoadingMore && renderLoading?.()}

  {/* children：由外部完全控制，组件不关心内容结构 */}
  {children}

  {/* 底部锚点：用于 scrollToBottom */}
  <div ref={bottomAnchorRef} />
</Box>
```

> [!IMPORTANT]
> `UpwardInfiniteList` 是唯一的 scroll container（`overflow: auto`）。其 children（`MessageList`）**不能**设置自己的 `overflowY`，否则 IntersectionObserver 无法正确检测顶部哨兵。

### 3.5 初始化行为

与向下加载不同，向上加载组件在初始化后需要**自动滚动到底部**，展示最新消息：

```typescript
// 初始数据加载完成后
useEffect(() => {
  if (!isInitialLoading) {
    scrollToBottom("instant"); // 首次渲染不需要动画
  }
}, [isInitialLoading]);
```

### 3.6 完整实现草稿

```typescript
// src/components/layout/upward-infinite-list.tsx

import {
  useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef
} from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import type { LoadMoreResult } from "./infinite-scroll-list";

export interface UpwardInfiniteListHandle {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export interface UpwardInfiniteListProps {
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  children: React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  isEmpty?: boolean;
  sx?: SxProps<Theme>;
}

export const UpwardInfiniteList = forwardRef<UpwardInfiniteListHandle, UpwardInfiniteListProps>(
  function UpwardInfiniteList(
    { fetchMore, children, renderLoading, renderEmpty, isEmpty, sx },
    ref,
  ) {
    const [cursor, setCursor] = useState<string | undefined>();
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const bottomAnchorRef = useRef<HTMLDivElement>(null);
    const fetchMoreRef = useRef(fetchMore);

    useEffect(() => { fetchMoreRef.current = fetchMore; }, [fetchMore]);

    useImperativeHandle(ref, () => ({
      scrollToBottom: (behavior: ScrollBehavior = "smooth") => {
        bottomAnchorRef.current?.scrollIntoView({ behavior });
      },
    }));

    const loadMore = useCallback(async () => {
      if (isLoadingMore || !hasMore) return;

      const container = containerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;

      setIsLoadingMore(true);
      try {
        const result = await fetchMoreRef.current(cursor);
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);

        // 修正滚动位置，防止顶部插入内容导致跳变
        if (container && !isInitialLoading) {
          requestAnimationFrame(() => {
            container.scrollTop += container.scrollHeight - prevScrollHeight;
          });
        }
      } catch (error) {
        console.error("UpwardInfiniteList: failed to load more", error);
      } finally {
        setIsLoadingMore(false);
        setIsInitialLoading(false);
      }
    }, [cursor, hasMore, isLoadingMore, isInitialLoading]);

    // 初始加载
    useEffect(() => {
      loadMore();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 初始加载完成后滚动到底部，展示最新消息
    useEffect(() => {
      if (!isInitialLoading) {
        bottomAnchorRef.current?.scrollIntoView({ behavior: "instant" });
      }
    }, [isInitialLoading]);

    // 顶部 IntersectionObserver
    useEffect(() => {
      const sentinel = topSentinelRef.current;
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
        { threshold: 0 },
      );

      observer.observe(sentinel);
      return () => observer.disconnect();
    }, [loadMore]);

    if (isInitialLoading) {
      return <Box sx={{ height: "100%", ...sx }}>{renderLoading?.() ?? null}</Box>;
    }

    if (isEmpty && !hasMore) {
      return <Box sx={{ height: "100%", ...sx }}>{renderEmpty?.() ?? null}</Box>;
    }

    return (
      <Box ref={containerRef} sx={{ overflowY: "auto", height: "100%", ...sx }}>
        {/* 顶部哨兵 */}
        <Box ref={topSentinelRef} sx={{ minHeight: 1 }}>
          {isLoadingMore && (renderLoading?.() ?? null)}
        </Box>

        {/* children 由外部完全控制，组件不关心内容结构 */}
        {children}

        {/* 底部锚点 */}
        <div ref={bottomAnchorRef} />
      </Box>
    );
  }
);
```

---

## 4. 集成 `MessageList`

### 4.1 职责边界

`UpwardInfiniteList` 与 `MessageList` 是**组合关系**，职责严格分离：

| 职责                                     | 组件                 |
| ---------------------------------------- | -------------------- |
| scroll container（`overflow: auto`）     | `UpwardInfiniteList` |
| 顶部 sentinel + IntersectionObserver     | `UpwardInfiniteList` |
| 加载时滚动位置保持                       | `UpwardInfiniteList` |
| `scrollToBottom` 命令式 API              | `UpwardInfiniteList` |
| 消息分区逻辑（祖先 / 分叉点 / 当前分支） | `MessageList`        |
| 单条消息渲染                             | `MessageItem`        |

> [!IMPORTANT]
> `MessageList` 的分区逻辑**必须完整保留**，`UpwardInfiniteList` 对其内容结构完全透明。`MessageList` 的外层容器**不能**设置 `overflowY: auto`，scroll container 完全由 `UpwardInfiniteList` 托管。

### 4.2 `MessageList` 改造要点

`MessageList` 的 Props 接口**无需变动**。只需将外层容器的 `overflowY` 去掉，使其成为纯渲染层：

```diff
- <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
+ <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
```

> [!NOTE]
> 当前 `MessageList` 的 `<Box>` 本身未设置 `overflowY`，因此可能无需改动。确认后跳过此步骤。

### 4.3 ChatPage 集成示例

```tsx
// src/pages/chat/index.tsx
import { useRef } from "react";
import {
  UpwardInfiniteList,
  type UpwardInfiniteListHandle,
} from "@/components/layout/upward-infinite-list";
import { MessageList } from "./components/message-list";
import { useMessage } from "./hooks/use-message";

function ChatPage() {
  const { messages, fetchMore, activeThreadId, parentThreadTitle } =
    useMessage();
  const listRef = useRef<UpwardInfiniteListHandle>(null);

  const handleAfterSend = () => {
    listRef.current?.scrollToBottom("smooth");
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <UpwardInfiniteList
        ref={listRef}
        fetchMore={fetchMore}
        isEmpty={messages.length === 0}
        renderLoading={() => <MessageSkeletonList />}
      >
        {/* MessageList 的分区逻辑完整保留，UpwardInfiniteList 对此透明 */}
        <MessageList
          messages={messages}
          activeThreadId={activeThreadId}
          parentThreadTitle={parentThreadTitle}
          onCopy={handleCopy}
          onRegenerate={handleRegenerate}
        />
      </UpwardInfiniteList>
      <ChatInput onSend={handleAfterSend} />
    </Box>
  );
}
```

---

## 5. 数据流设计

### 5.1 消息历史分页（`use-message` Hook）

```
UpwardInfiniteList
  │  调用 fetchMore(cursor)
  ▼
use-message Hook
  ├── 调用 GET /api/v1/messages/?thread_id=&cursor=&limit=
  ├── 将结果 prepend 写入 message-store（旧消息插入头部）
  └── 返回 { nextCursor, hasMore }
  ▼
message-store
  └── messages（从旧到新排列）
  ▼
UpwardInfiniteList.items props（触发重新渲染）
```

### 5.2 Store 结构要点

消息列表使用 cursor-based 分页，Store 中的消息按**从旧到新**顺序存储。加载更旧消息时，新数据 **prepend** 到数组头部：

```typescript
// message-store 中的 actions
prependMessages: (newMessages: Message[]) =>
  set((state) => ({
    messages: [...newMessages, ...state.messages],
  })),
```

---

## 6. 关键 Edge Cases

### 6.1 新消息追加时自动滚底

只有当用户当前**已在底部**时，新 AI 消息流式追加才应自动滚到底部；若用户正在向上翻阅历史，则不应强制滚底：

```typescript
const isNearBottom = (container: HTMLElement, threshold = 100) => {
  const { scrollTop, scrollHeight, clientHeight } = container;
  return scrollHeight - scrollTop - clientHeight < threshold;
};

// 新消息追加时
if (isNearBottom(container)) {
  listRef.current?.scrollToBottom("smooth");
}
```

### 6.2 切换 Thread 时重置状态

当 `activeThreadId` / `chatSessionId` 变化时，`UpwardInfiniteList` 需要**重置分页状态**，重新加载第一页并滚到底部。  
推荐通过在 `ChatPage` 中给 `UpwardInfiniteList` 传入 `key={activeThreadId}` 来触发组件完整重建。

```tsx
<UpwardInfiniteList
  key={activeThreadId}   // Thread 切换时完整重置
  ref={listRef}
  ...
/>
```

### 6.3 流式消息与分页共存

AI 回复流式输出期间，不应触发分页加载（防止内容跳动）。可在 `fetchMore` 内部判断：

```typescript
const fetchMore = useCallback(
  async (cursor?: string) => {
    if (isStreaming) return { hasMore, nextCursor: cursor }; // 跳过
    // ... 正常加载
  },
  [isStreaming, hasMore],
);
```

---

## 7. 文件清单

| 文件路径                                         | 状态      | 说明                                  |
| ------------------------------------------------ | --------- | ------------------------------------- |
| `src/components/layout/infinite-scroll-list.tsx` | ✅ 已实现 | 向下加载通用组件                      |
| `src/components/layout/upward-infinite-list.tsx` | 🔲 待实现 | 向上加载通用组件                      |
| `src/pages/chat/components/message-list.tsx`     | 🔲 待改造 | 退化为纯渲染层，移除 scroll container |
| `src/pages/chat/hooks/use-message.ts`            | 🔲 待改造 | 新增 `fetchMore` / `hasMore` 返回值   |
| `src/stores/message-store.ts`                    | 🔲 待改造 | 新增 `prependMessages` action         |
