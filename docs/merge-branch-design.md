# 合并分支功能设计文档

> 本文档从 **Store → Hook → API → UI** 数据流视角，设计合并分支（Merge Branch）功能所需新增的全部逻辑。  
> 参考接口：`mergePreview` / `mergeConfirm`（见 `src/api/common/thread.ts`）  
> 参考编排模式：`docs/memory-branch-api-guide.md § 8.3`

---

## 目录

- [1. 功能概述与流程](#1-功能概述与流程)
- [2. 数据流总览](#2-数据流总览)
- [3. Store 层](#3-store-层)
- [4. Hook 层](#4-hook-层)
- [5. API 层](#5-api-层)
- [6. UI 层](#6-ui-层)
- [7. 各层交互时序图](#7-各层交互时序图)
- [8. 设计决策汇总](#8-设计决策汇总)

---

## 1. 功能概述与流程

合并分支是一个**两步串行操作**：

```
[用户在 ChatInput 工具栏点击"合并到父分支"]
       │
       ▼
Step 1: call mergePreview(threadId)
       → 后端生成 brief_content（Markdown 摘要）
       → 展示 Dialog，带可编辑的 TextField
       │
       ▼
Step 2: 用户确认/编辑后 call mergeConfirm(threadId, brief_content)
       → 后端：子线程 status → MERGED，父线程写入 BRIEF 消息，切换 active_thread
       → 前端：更新 Store，复用 fetchMessages 加载父线程消息
```

**涉及约束（来自 API 文档）：**

- 当前线程必须是子线程（非主线，即 `parentThreadId !== null`）
- 当前线程下**不能有未合并的子分支**（逐级合并）
- 当前线程 status 必须为 `NORMAL`(1)

---

## 2. 数据流总览

```
UI (ChatInput 工具栏)
  │  用户点击"合并"按钮（isMergeDisabled === false）
  ▼
useThread (hook)
  │  previewMerge() → API mergePreview → 写入 MergeStore
  │  打开 ThreadMergeDialog（brief 可编辑）
  │
  │  用户确认 → confirmMerge(briefContent)
  ▼
useThread (hook)
  │  API mergeConfirm
  │  → updateThreadStatus(子线程, MERGED)  → ThreadStore
  │  → updateActiveThreadId(父线程)         → ChatSessionStore
  │  → fetchMessages(parentThreadId)        → MessageStore
  │  → setSuccess()                         → MergeStore
  ▼
MessageStore / ThreadStore / ChatSessionStore
  │  状态变更触发订阅组件重渲染
  ▼
UI (ChatPage, ThreadBranchGraph)
  └─ 消息列表切换到父线程，线程树节点标记 MERGED
```

---

## 3. Store 层

### 3.1 新增：`merge-store.ts`（UI 流程瞬态）

合并操作涉及多个步骤，用独立 Store 管理 Dialog 生命周期内的瞬态状态。

```typescript
// src/stores/merge-store.ts

interface MergeStore {
  // ── 流程状态 ──────────────────────────────────────────────
  /** 当前正在合并的分支 ID（null 表示未触发） */
  mergingThreadId: number | null;

  /** 合并流程阶段 */
  mergePhase: "idle" | "previewing" | "confirming" | "success" | "error";

  // ── Preview 数据 ──────────────────────────────────────────
  /** Preview 接口返回的目标父线程 ID */
  targetThreadId: number | null;

  /** LLM 生成的简报内容（用户可编辑） */
  briefContent: string;

  // ── 错误状态 ──────────────────────────────────────────────
  errorMessage: string | null;

  // ── Actions ──────────────────────────────────────────────
  /** 开始预览流程，设置 threadId 并进入 previewing 阶段 */
  startPreview: (threadId: number) => void;

  /** Preview 接口成功后，存入返回数据 */
  setPreviewData: (targetThreadId: number, briefContent: string) => void;

  /** 用户在 Dialog 中编辑简报内容 */
  updateBriefContent: (content: string) => void;

  /** 进入 confirming 阶段（用户点击确认） */
  startConfirm: () => void;

  /** 合并成功，进入 success 阶段 */
  setSuccess: () => void;

  /** 设置错误 */
  setError: (message: string) => void;

  /** 重置所有状态（关闭 Dialog 时调用） */
  reset: () => void;
}
```

> **设计决策**：Merge 流程状态从 `thread-store` 独立出来，因为它是纯 UI 瞬态，不需要持久化，也不需要跨组件大范围共享。

### 3.2 修改：`thread-store.ts`

新增 `updateThreadStatus`，用于 confirm 成功后将子线程标记为 MERGED：

```typescript
// 新增 Action
/** 更新指定线程的 status 字段 */
updateThreadStatus: (chatSessionId: number, threadId: number, status: number) => void;
```

**实现：**

```typescript
updateThreadStatus: (chatSessionId, threadId, status) =>
  set((state) => ({
    threadsByChatSessionId: {
      ...state.threadsByChatSessionId,
      [chatSessionId]: (state.threadsByChatSessionId[chatSessionId] ?? []).map(
        (t) => (t.id === threadId ? { ...t, status } : t),
      ),
    },
  })),
```

### 3.3 `message-store.ts` — 无需修改

现有的 `setMessages` / `prependMessages` 已满足切换父线程后加载消息场景。

### 3.4 `chat-session-store.ts` — 无需修改

现有的 `updateActiveThreadId` 已满足 confirm 成功后更新 active_thread_id 的需求。

---

## 4. Hook 层

### 4.1 修改：`use-thread.ts`（追加 merge 逻辑）

**新增导出的函数和状态：**

```typescript
// 在 useThread() 的返回值中新增：

/** 当前线程是否可以合并 */
isMergeDisabled: boolean;

/** 触发预览：调用 API → 写入 MergeStore（由 UI 监听 mergePhase 打开 Dialog） */
previewMerge: () => Promise<void>;

/** 触发确认合并：调用 API → 批量更新 Store → 加载父线程消息 */
confirmMerge: (briefContent: string) => Promise<void>;
```

---

**`isMergeDisabled` 计算规则：**

```typescript
const isMergeDisabled = (() => {
  if (!activeSessionId || !activeThreadId) return true;
  if (typeof activeSessionId === "string") return true; // 临时 session，尚未持久化

  // ⚠️ threadsByChatSessionId 由 useThreadTree 懒加载写入。
  //    若侧边栏线程树面板未渲染，此处可能为空数组。
  //    当数据为空时保守禁用（与 isForkDisabled 策略一致）。
  const threads =
    useThreadStore.getState().threadsByChatSessionId[activeSessionId] ?? [];
  const currentThread = threads.find((t) => t.id === activeThreadId);

  if (!currentThread) return true; // 数据未加载，保守禁用

  // 主线（MAIN_LINE）不能合并
  if (currentThread.parentThreadId === null) return true;

  // 已合并的线程不可再次合并
  if (currentThread.status === 2 /* MERGED */) return true;

  // 逐级约束：有未合并子分支则禁用
  // /threads/list 返回全量线程，包含 MERGED 节点，可以直接检测
  const hasUnmergedChildren = threads.some(
    (t) => t.parentThreadId === activeThreadId && t.status !== 2,
  );
  if (hasUnmergedChildren) return true;

  return false;
})();
```

> **注意**：`threadsByChatSessionId` 由 `useThreadTree` hook 在挂载时懒加载（通过 `/threads/${chat_session_id}/list` 接口），数据为空时返回 `true`（保守禁用）。
>
> 若需要 `chat-input` 工具栏在线程树面板未打开时也能正确显示合并按钮，需确保线程列表在 `ChatPage` 级别提前加载（与 `activeThreadId` 初始化时机对齐）。

---

**`previewMerge` 实现：**

```typescript
const previewMerge = async () => {
  if (!activeThreadId || typeof activeThreadId !== "number") return;

  useMergeStore.getState().startPreview(activeThreadId);
  try {
    const res = await mergePreview({ thread_id: activeThreadId });
    useMergeStore
      .getState()
      .setPreviewData(res.target_thread_id, res.brief_content);
    // MergeStore.mergePhase 变为 "previewing"（有数据），
    // UI（ChatInput 所在的 ChatPage）监听该状态打开 ThreadMergeDialog
  } catch {
    useMergeStore.getState().setError("预览失败，请重试");
  }
};
```

---

**`confirmMerge` 实现（串行调用链）：**

```typescript
const confirmMerge = async (briefContent: string) => {
  if (!activeThreadId || typeof activeThreadId !== "number") return;
  if (!activeSessionId || typeof activeSessionId !== "number") return;

  useMergeStore.getState().startConfirm();
  try {
    const res = await mergeConfirm({
      thread_id: activeThreadId,
      brief_content: briefContent,
    });

    const parentThreadId = res.target_thread.id;

    // Step 1：标记子线程为 MERGED
    useThreadStore
      .getState()
      .updateThreadStatus(activeSessionId, activeThreadId, 2 /* MERGED */);

    // Step 2：切换 active_thread_id → 父线程
    useChatSessionStore
      .getState()
      .updateActiveThreadId(activeSessionId, parentThreadId);

    // Step 3：加载父线程消息（复用 getMessageList，已包含跨线程聚合）
    // fetchMessages 由 useMessage(parentThreadId) 提供，此处通过以下方式触发：
    // - active_thread_id 已切换 → ChatPage 的 useMessage(activeThreadId) 自动重新请求
    // - 如需立即触发，可 import { getMessageList } 直接调用并 setMessages
    await getMessageList({
      thread_id: parentThreadId,
      direction: "before",
      limit: 50,
    }).then((res) => {
      const msgs = res.messages.map(mapMessageInToMessage);
      useMessageStore.getState().setMessages(parentThreadId, msgs);
    });

    useMergeStore.getState().setSuccess();
  } catch {
    useMergeStore.getState().setError("合并失败，请重试");
  }
};
```

> **设计决策**：非乐观更新——Store 更新全部在 API 成功之后执行，无需回滚逻辑。

---

## 5. API 层

已有接口（`src/api/common/thread.ts`），**无需新增**：

| 函数                  | 说明                                                         |
| --------------------- | ------------------------------------------------------------ |
| `mergePreview(req)`   | 已存在 ✅                                                    |
| `mergeConfirm(req)`   | 已存在 ✅                                                    |
| `getMessageList(req)` | 已存在 ✅，endpoint 已包含跨线程聚合逻辑，confirm 后直接复用 |

---

## 6. UI 层

### 6.1 新增：`ThreadMergeDialog` 组件

**路径**：`src/feature/thread-branch-graph/components/ThreadMergeDialog.tsx`

**组件职责：**

```
ThreadMergeDialog
  ├── 从 useMergeStore 读取 mergePhase / briefContent / errorMessage
  ├── mergePhase === "previewing"（无数据）→ Skeleton Loading
  ├── mergePhase === "previewing"（有数据）→ TextField multiline（可编辑简报）
  ├── mergePhase === "confirming"          → 确认按钮 Loading 态
  ├── mergePhase === "error"               → Alert 错误提示 + 重试按钮
  └── mergePhase === "success"             → 自动关闭 Dialog
```

**Props：**

```typescript
interface ThreadMergeDialogProps {
  open: boolean;
  onClose: () => void;
}
```

- 内部通过 `useMergeStore` 读取状态
- 通过 `useThread().confirmMerge(briefContent)` 触发确认
- 关闭时调用 `useMergeStore.getState().reset()` 清理状态

**简报编辑器**：使用 MUI `TextField` + `multiline`，不引入额外 Markdown 编辑器依赖。

### 6.2 触发入口：`ChatInput` 工具栏

`merge` 和 `fork` 的触发入口**均在 `ChatInput` 工具栏**中（与 Fork 按钮对称）：

```
ChatInput 工具栏
  ├── [Fork 按钮]  isForkDisabled → disabled
  └── [Merge 按钮] isMergeDisabled → disabled
```

- 点击 Merge 按钮 → 调用 `useThread().previewMerge()`
- `MergeStore.mergePhase` 变化 → `ChatPage` 中监听，打开 `ThreadMergeDialog`

### 6.3 `ThreadMergeDialog` 挂载位置

**在 `ChatPage` 级别挂载**（而非 feature 内），因为触发入口在 `ChatInput`，需要与之同处一个上下文：

```tsx
// src/pages/chat/index.tsx (ChatPage)
const { previewMerge, confirmMerge, isMergeDisabled } = useThread();
const mergePhase = useMergeStore((state) => state.mergePhase);
const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

// 监听 previewMerge 完成（数据就绪）→ 打开 Dialog
useEffect(() => {
  if (mergePhase === "previewing") setMergeDialogOpen(true);
  if (mergePhase === "success") setMergeDialogOpen(false);
}, [mergePhase]);

return (
  <>
    {/* ... ChatInput 传入 isMergeDisabled 和 onMerge={previewMerge} */}
    <ThreadMergeDialog
      open={mergeDialogOpen}
      onClose={() => {
        setMergeDialogOpen(false);
        useMergeStore.getState().reset();
      }}
    />
  </>
);
```

### 6.4 `ThreadTreeNode` MERGED 状态显示

合并后线程树节点视觉更新（`threadsByChatSessionId` 中的 status 已被更新）：

- `status === 2 (MERGED)` → 显示灰色 + "已合并" Chip
- 隐藏"合并"操作按钮

---

## 7. 各层交互时序图

```
用户                ChatInput/ChatPage     useThread(Hook)       Store              API
 │                       │                      │                  │                 │
 │──点击"合并"按钮────────▶│                      │                  │                 │
 │                       │──previewMerge()──────▶│                  │                 │
 │                       │                      │──startPreview()─▶│(MergeStore)     │
 │                       │                      │─────────────────────────────────▶ │
 │                       │                      │             mergePreview(threadId) │
 │                       │                      │◀──────────────────────────────── │
 │                       │                      │    {target_thread_id,brief_content}│
 │                       │                      │──setPreviewData()───▶│            │
 │                       │(mergePhase变化，打开Dialog)                 │             │
 │◀──展示 Dialog 可编辑简报─│                      │                  │                 │
 │                       │                      │                  │                 │
 │──编辑后点击确认─────────▶│                      │                  │                 │
 │                       │──confirmMerge()──────▶│                  │                 │
 │                       │   (briefContent)      │──startConfirm()─▶│(MergeStore)     │
 │                       │                      │─────────────────────────────────▶ │
 │                       │                      │        mergeConfirm(threadId,      │
 │                       │                      │                briefContent)       │
 │                       │                      │◀──────────────────────────────── │
 │                       │                      │  {merged_thread, target_thread}    │
 │                       │                      │──updateThreadStatus()──▶│(ThreadStore)
 │                       │                      │──updateActiveThreadId()─▶│(SessionStore)
 │                       │                      │──getMessageList(parentId)────────▶│
 │                       │                      │◀──────────────────────────────── │
 │                       │                      │──setMessages(parentId, msgs)──▶│(MessageStore)
 │                       │                      │──setSuccess()──────▶│(MergeStore)  │
 │◀──Dialog 关闭，界面切换到父线程──────────────── │                  │                 │
```

---

## 8. 设计决策汇总

| 问题                                 | 决策                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| confirm 后如何加载父线程消息         | 复用 `getMessageList`，该 API 已包含跨线程聚合，直接传父线程 ID 调用                                    |
| `isMergeDisabled` 子分支检测数据来源 | 读取 `threadsByChatSessionId`（由 `useThreadTree` 通过 `/threads/list` 懒加载写入），数据为空时保守禁用 |
| 简报编辑器                           | MUI `TextField multiline`，不引入额外依赖                                                               |
| confirm 失败是否回滚                 | 无需回滚，采用非乐观更新（API 成功后才写 Store）                                                        |
| 触发入口位置                         | `ChatInput` 工具栏（与 Fork 按钮对称），`ThreadMergeDialog` 挂载在 `ChatPage`                           |

> ⚠️ **潜在问题**：若用户进入 `ChatPage` 时侧边栏线程树面板未渲染（`useThreadTree` 未挂载），`threadsByChatSessionId` 为空，导致 `isMergeDisabled === true`，合并按钮一直禁用。  
> **建议**：在 `ChatPage` 初始化时（加载 `activeThread` 时同步拉取线程列表），确保 `threadsByChatSessionId` 提前被写入。
