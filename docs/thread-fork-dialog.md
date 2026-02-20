# Thread Fork Dialog — 技术设计文档

## 功能概述

用户在聊天输入框的工具栏中点击「Fork 记忆分支」按钮，弹出一个对话框，填写新分支标题后确认，完成 Thread Fork 操作。

---

## 组件架构

```
ChatInput (chat-input.tsx)
  └── 新增 onFork?: () => void prop
        │
        ▼ 触发
ThreadForkDialog (components/common/thread-fork-dialog.tsx)
        │
        ▼ 调用
useThread().forkThread(title)   (pages/chat/hooks/use-thread.ts)
        │
        ▼ API + Store
forkThreadApi → thread-store.addThread + setActiveThreadId
```

**职责分工：**

- `ThreadForkDialog`：纯 UI，只负责弹窗交互（受控组件，open/onClose/onConfirm 由外部控制）
- `ChatInput`：持有弹窗的 open 状态，触发打开
- `ChatPage` / 调用方：连接 `useThread().forkThread` 与 Dialog 的 `onConfirm`

---

## 禁用条件

Fork 按钮在以下条件下应被禁用：

| 条件                                  | 原因                                                            |
| ------------------------------------- | --------------------------------------------------------------- |
| `activeSessionId === null`            | 当前处于新会话模式，还没有 session                              |
| `activeThreadId === null`             | 没有 thread，即还没有发送过任何消息                             |
| `typeof activeSessionId === "string"` | activeSessionId 是临时 UUID（乐观更新中），session 尚未后端确认 |

判断方式：从 `useChatSessionStore` 取 `activeSessionId`，从 `useThreadStore` 取 `activeThreadId`，由父组件决策，以 `disabled` prop 传入 `ChatInput`。

---

## 接口设计

### ThreadForkDialog Props

```typescript
interface ThreadForkDialogProps {
  open: boolean;
  onClose: () => void;
  /** 确认时传入用户填写的 title */
  onConfirm: (title: string) => Promise<void>;
  /** Fork 目标的父 thread 信息，用于展示上下文提示 */
  parentThreadTitle?: string;
}
```

### ChatInput 新增 Props

```typescript
interface ChatInputProps {
  // 原有 props 不变...

  /** Fork 记忆分支按钮回调，不传则不显示该按钮 */
  onFork?: () => void;
  /** Fork 按钮是否禁用（无活跃 thread 时为 true） */
  forkDisabled?: boolean;
}
```

---

## 弹窗 UI 规范

弹窗使用 MUI `Dialog` 组件，包含：

1. **标题栏**：`Fork 记忆分支`
2. **上下文提示**（Dialog Content 顶部，使用 MUI `Alert severity="info"`）：
   > 创建一条新的记忆分支，将从当前会话的最新节点开始独立演进。
3. **标题输入框**：
   - Label：`分支名称`
   - placeholder：`例：探索方向 A`
   - 最大长度：50 字符
   - 非空校验：为空时 confirm 按钮禁用
4. **操作按钮**：
   - `取消`（outlined）
   - `确定 Fork`（variant="contained"，loading 状态时显示 spinner）

---

## 数据流

```
用户点击工具栏 Fork 按钮
  → ChatInput 调用 onFork()
  → ChatPage 设置 forkDialogOpen = true

用户在弹窗填写标题点击确定
  → ThreadForkDialog 调用 onConfirm(title)
  → ChatPage 调用 useThread().forkThread(title)
      → forkThreadApi({ chat_session_id, parent_thread_id, title })
      → thread-store.addThread(新 thread)
      → thread-store.setActiveThreadId(新 thread.id)
  → onClose() 关闭弹窗
```

---

## 问题说明

### 问题 1：thread-store 的 key 设计与 forkThread 逻辑不一致 ⚠️

`threadByChatSessionId` 的 key 是 `chatSessionId`，但一个 session 可以有**多个** thread（这正是 fork 功能的意义）。

当前 `addThread` 实现会用新 thread 的 `chatSessionId` 覆盖同一 key，导致**同一 session 下只能存最后一条 thread**：

```typescript
// 当前实现（存在问题）
addThread: (thread) => set((state) => ({
  threadByChatSessionId: {
    ...state.threadByChatSessionId,
    [thread.chatSessionId]: thread,  // ← 会覆盖同 session 的旧 thread
  },
})),
```

建议将 key 改为 `threadId`，并将 store 名称对应调整：

```diff
- threadByChatSessionId: Record<number, Thread>
+ threadsById: Record<number, Thread>
```

查询某 session 的所有 thread（`getThreadsByChatSessionId`）改为遍历 `Object.values(threadsById).filter(...)` 即可，`use-thread.ts` 里已有这个写法，存储层改完无需改查询逻辑。

> 在开始 fork 编码之前，建议先修复这个问题，否则 fork 出第二个 thread 时第一个会被覆盖。

### 问题 2：`forkThread` 的禁用条件校验 ⚠️

`use-thread.ts` 中 `forkThread` 在 `activeThreadId` 存在时会尝试查找 `threadByChatSessionId[activeThreadId]`，但 key 是 `chatSessionId` 不是 `threadId`，这个查找永远返回 `undefined`，导致 fork 逻辑提前 return：

```typescript
const thread = threadByChatSessionId[activeThreadId]; // ← key 错了，永远 undefined
if (!thread) return; // ← 因此永远 fork 不了
```

这个 bug 在修复 store key 后会一并消失。

---

## 实现步骤

- [ ] 修复 `thread-store.ts`：将 key 从 `chatSessionId` 改为 `threadId`
- [ ] 在 `ChatInput` 新增 `onFork` / `forkDisabled` props 及工具栏按钮
- [ ] 实现 `ThreadForkDialog` 组件
- [ ] 在 `ChatPage` 中连接状态与回调
