# Thread Branch Graph — 设计文档

> 本文档记录 `thread-branch-graph` 组件的设计决策，所有条目均为已达成共识的结论。

---

## 1. 组件定位

`ThreadBranchGraph`（实现为 `ThreadTreePanel`）是一个**业务组件**，位于 Sidebar 的"分支树" Tab 内。

- **不是**纯展示组件，内部直接订阅 Store、调用 Hook
- 与 `ChatSessionList` 的设计模式保持一致

---

## 2. 数据模型

### 2.1 数据来源

后端返回**扁平** `Thread[]`（通过 `GET /chat_sessions/{id}/thread-tree`），前端负责构建树结构。

字段依赖：

- `thread.parentThreadId === null` → 根节点（主线）
- `thread.parentThreadId !== null` → 子节点，挂载到对应父节点下

### 2.2 建树逻辑

抽取为**独立纯函数**，放在 `src/feature/thread-branch-graph/utils.ts`：

```typescript
export interface ThreadTreeNode extends Thread {
  children: ThreadTreeNode[];
}

export function buildThreadTree(threads: Thread[]): ThreadTreeNode[] {
  // 标准 parentId 建树算法
  // 1. 将 Thread[] 转为 Map<id, ThreadTreeNode>
  // 2. 遍历，有 parentId 的挂到父节点的 children 上
  // 3. 返回根节点数组（parentThreadId === null）
}
```

组件内通过 `useMemo` 调用，避免重复计算：

```tsx
const tree = useMemo(() => buildThreadTree(threads), [threads]);
```

---

## 3. Store 订阅策略

### 3.1 组件内部订阅 Store（不通过 Props 传入数据）

```tsx
// ✅ 组件内部订阅，无 prop drilling
function ThreadTreePanel({ sessionId }: { sessionId: number }) {
  const threads = useThreadStore(
    (state) => state.threadsByChatSessionId[sessionId] ?? [],
  );
  const activeThreadId = useChatSessionStore(
    (state) =>
      state.sessions.find((s) => s.id === state.activeSessionId)
        ?.activeThreadId ?? null,
  );
  // ...
}

### 3.2 `activeThreadId` 的来源与修改 — 薄 Store + 厚 Hook 模式

`activeThreadId` 是 session 的属性（后端存在 session 上），**保留在 `chat-session-store`**，不在 `thread-store` 中重复存储。

**分层职责**：

```

chat-session-store（薄，只管数据）
└── sessions[].activeThreadId ← 数据存储
└── updateActiveThreadId(sessionId, threadId) ← 纯同步 mutation（已存在）

useThread Hook（厚，管业务逻辑）
├── 读：activeThreadId = selector(store) ← 响应式派生值
└── 写：switchThread(targetId) = API 调用 + store 更新的编排

````

**读：必须使用响应式订阅（selector），禁止 `getState()` 快照**：

```typescript
// ❌ 错误：getState() 是快照，activeThreadId 变化时组件不会重渲染
const activeThreadId = useChatSessionStore.getState()
  .sessions.find(s => s.id === activeSessionId)?.activeThreadId;

// ✅ 正确：响应式 selector
const activeThreadId = useChatSessionStore(
  state => state.sessions.find(s => s.id === state.activeSessionId)?.activeThreadId ?? null
);
````

**写：`switchThread` 采用乐观更新策略**：

```typescript
// useThread 中的 switchThread 编排（乐观更新）：
const switchThread = async (targetThreadId: number) => {
  // 1. 立即更新 store（乐观），树节点高亮立刻切换
  store.updateActiveThreadId(activeSessionId, targetThreadId);

  // 2. 并行：更新后端 + 拉取消息
  await Promise.all([
    patchChatSession(activeSessionId, { active_thread_id: targetThreadId }),
    fetchContextMessages(targetThreadId), // 有独立 loading 态
  ]);

  // 3. 更新面包屑
  await fetchBreadcrumb(targetThreadId);
  // 注：后端失败时需回滚 store（失败概率极低，MVP 可暂不处理）
};
```

乐观更新的理由：

- 切换线程的后端失败率极低（仅更新一个字段）
- 消息加载本身有 loading 态，树高亮立刻响应体验更流畅
- 与 `ChatSessionList` 的新建会话乐观更新保持风格一致

---

## 4. 数据加载时机

**懒加载**：用户切换到 Sidebar "分支树" Tab 时才请求 `GET /chat_sessions/{id}/thread-tree`。

- 无需在进入会话时预加载
- Tab 切换时若 store 中已有数据则不重复请求（加缓存判断）
- 加载中显示骨架屏

---

## 5. 切换分支的交互设计

### 5.1 业务逻辑归属

切换分支的完整逻辑**封装在 `useThread` Hook 中**，组件只调用暴露的函数：

```typescript
// useThread 中的 switchThread 编排逻辑：
// 1. PATCH /chat_sessions/{sessionId}  ← 更新后端 active_thread
// 2. GET /threads/{targetThreadId}/context-messages  ← 重新拉取消息列表
// 3. GET /threads/{targetThreadId}/breadcrumb  ← 更新面包屑
// 4. setActiveThreadId(targetThreadId)  ← 更新 store
```

组件侧：

```tsx
const { switchThread } = useThread();
// 点击节点时
<TreeNode onClick={() => switchThread(thread.id)} />;
```

### 5.2 已合并分支的点击行为

已合并分支**可以点击查看历史**，但触发的是只读模式（不调用完整的 `switchThread`）。具体行为待定，MVP 可先统一使用 `switchThread`，在消息列表层通过 `thread.status` 决定是否展示输入框。

---

## 6. 展开/折叠状态

- 默认**全部展开**（`defaultExpandedItems` 设为所有节点 ID）
- 不提供折叠功能，MVP 阶段节点数量有限（最大深度 5 层）

---

## 7. 已合并分支的视觉处理

使用 MUI `TreeItem` 的 `label` 接受 ReactNode 的特性，完全在 MUI 体系内实现，无需额外库。

**视觉规则：**

| 状态             | 透明度 | 文字颜色        | 附加标识           |
| ---------------- | ------ | --------------- | ------------------ |
| 当前活跃         | 100%   | `primary.main`  | 蓝色小圆点         |
| 进行中（非当前） | 100%   | `text.primary`  | 无                 |
| 已合并           | 50%    | `text.disabled` | `已合并` Chip 标签 |

**关键实现方式**：

```tsx
<TreeItem
  itemId={String(thread.id)}
  label={
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        opacity: isMerged ? 0.5 : 1,
      }}
    >
      <Typography
        variant="body2"
        noWrap
        sx={{ flex: 1, color: isMerged ? "text.disabled" : "text.primary" }}
      >
        {thread.title ?? "未命名分支"}
      </Typography>
      {isMerged && (
        <Chip label="已合并" size="small" sx={{ height: 16, fontSize: 10 }} />
      )}
      {isActive && (
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: "primary.main",
          }}
        />
      )}
    </Box>
  }
  onClick={() => onNodeClick(thread)}
/>
```

---

## 8. 文件结构

```
src/feature/thread-branch-graph/
├── index.ts                          # 导出入口
├── types.ts                          # ThreadTreeNode 类型
├── utils.ts                          # buildThreadTree 纯函数
├── use-thread-tree.ts                # 组件级 Hook（数据加载、建树、状态管理）
└── components/
    ├── thread-tree-panel.tsx         # 面板容器（调用 Hook、订阅 Store）
    └── thread-tree-node.tsx          # 单节点渲染（纯展示，接收 props）
```

---

## 8.1 组件级 Hook：`useThreadTree`

### 8.1.1 为什么需要这个 Hook

`ThreadTreePanel` 需要同时处理以下职责，若全部堆在组件内则违反关注点分离：

1. 懒加载判断（Store 中已有数据则跳过 API 请求）
2. 调用 `getThreadList` API 并将结果写入 `thread-store`
3. 管理 `isLoading` / `error` 状态
4. 用 `useMemo` 将 `Thread[]` 转换为树结构

但该逻辑**只服务于这一个组件**，不符合提升为全局 Hook 的条件，因此建立一个 **组件作用域 Hook** 是最佳实践。

### 8.1.2 Hook 接口

```typescript
// src/feature/thread-branch-graph/use-thread-tree.ts

interface UseThreadTreeReturn {
  tree: ThreadTreeNode | null; // 已建好的树，null 表示尚无数据
  isLoading: boolean;
  error: Error | null;
}

export function useThreadTree(sessionId: number): UseThreadTreeReturn;
```

### 8.1.3 实现要点

```typescript
export function useThreadTree(sessionId: number): UseThreadTreeReturn {
  // 1. 从 Store 读取扁平列表（响应式）
  const threads = useThreadStore(
    (state) => state.threadsByChatSessionId[sessionId] ?? [],
  );
  const setThreads = useThreadStore((state) => state.setThreads);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 2. 懒加载：已有数据则跳过
    if (threads.length > 0) return;

    setIsLoading(true);
    getThreadList({ chat_session_id: sessionId })
      .then((res) => {
        // 3. 写入 Store（数据转换在 Hook 层完成）
        setThreads(sessionId, res.threads.map(toThread));
      })
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [sessionId]); // sessionId 变化时重新触发

  // 4. 派生树结构（纯计算，结果稳定时不重算）
  const tree = useMemo(
    () => (threads.length > 0 ? buildThreadTree(threads) : null),
    [threads],
  );

  return { tree, isLoading, error };
}
```

### 8.1.4 组件侧使用

```tsx
function ThreadTreePanel({ sessionId }: { sessionId: number }) {
  const { tree, isLoading, error } = useThreadTree(sessionId);

  if (isLoading) return <ThreadTreeSkeleton />;
  if (error) return <ErrorMessage />;
  if (!tree) return null;

  return <TreeView /* ... */ />;
}
```

> **注**：`setThreads` 是 `thread-store` 需要补充的批量写入 action（将 `Thread[]` 覆盖写入 `threadsByChatSessionId[sessionId]`），区别于现有的单条 `addThread`。

---

## 9. 待确认问题

| #   | 问题                                                             | 影响范围               |
| --- | ---------------------------------------------------------------- | ---------------------- |
| 1   | 切换到已合并线程后，输入框是隐藏还是禁用？                       | `ChatInput` 组件改动量 |
| 2   | 切换线程时若目标线程从未加载过消息，loading 态在哪个组件层展示？ | 消息列表 UX            |

回答问题:

1. 禁用输入框
2. 按照最佳实践进行
