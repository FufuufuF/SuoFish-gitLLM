# 流式回复渲染性能优化最佳实践

> 针对 SuoFish-gitLLM 项目 `ChatPage → MessageList → MessageItem → MarkdownContent` 渲染链路的性能分析与优化方案。

---

## 一、当前问题的根因分析

### 1.1 渲染链路

```
ChatPage
  └─ useMessage(activeThreadId)
       └─ useMessageStore(s => s.messagesByThread[threadId])  ← 订阅整个数组
  └─ <MessageList messages={messages} />
       └─ messages.map → <MessageItem message={msg} />
            └─ <MarkdownContent content={message.content} />
```

### 1.2 每个 token 到来时发生了什么

在 `message-store.ts` 的 `appendStreamingContent` 中：

```typescript
// 每次追加 token，都会产生一个全新的 messagesByThread[threadId] 数组
return {
  messagesByThread: {
    ...state.messagesByThread,
    [threadId]: [
      ...messages.slice(0, -1), // 重新展开前 N-1 条
      { ...lastMessage, content: lastMessage.content + token }, // 新对象
    ],
  },
};
```

这导致的实际重渲染范围如下：

| 位置                 | 是否重渲染      | 原因                                                                                |
| -------------------- | --------------- | ----------------------------------------------------------------------------------- |
| `ChatPage`           | ✅ 每 token     | `messages` 数组是新引用（虽然数组内的元素引用不变）                                 |
| `<MessageList>`      | ✅ 每 token     | 收到新 `messages` prop；`useMemo(firstCurrentIdx)` 因依赖 `messages` 引用而**重算** |
| 历史 `<MessageItem>` | ❌ **不重渲染** | `memo` 有效：`slice` 是浅拷贝，历史 message 对象引用保持不变                        |
| 流式 `<MessageItem>` | ✅ 每 token     | 最后一条是 `{ ...lastMessage, content: ... }` 新对象                                |
| `<MarkdownContent>`  | ✅ 每 token     | `content` 变化，对**增长中的全文**重做 Markdown AST 解析                            |

> **说明**：`...messages.slice(0, -1)` 做的是浅拷贝，历史 message 对象的引用不变，`memo` 对它们完全有效。
>
> **真正的瓶颈有两处**：① `MessageList` 每 token 都触发 `findIndex` 遍历整个列表以重算 `firstCurrentIdx`；② `MarkdownContent` 每 token 对完整 Markdown 字符串做全量 AST 解析，随内容增长代价越来越大。

---

## 二、优化策略

### 策略 A（推荐）：将流式订阅下沉到 `MessageItem`

**思路**：`ChatPage` / `MessageList` 只订阅消息 ID 列表（稳定引用），`MessageItem` 自己根据 `messageId` 从 store 订阅单条消息的内容。

#### Step 1：在 store 中新增一个「只订阅 ID 列表」的 selector

```typescript
// message-store.ts — 新增
/** 返回指定 thread 的消息 ID 列表（稳定：只有增删时才变化） */
export const selectMessageIds =
  (threadId: string | number) => (state: MessageStore) =>
    (state.messagesByThread[threadId] ?? EMPTY_IDS).map((m) => m.id);

const EMPTY_IDS: (string | number)[] = [];
```

#### Step 2：`ChatPage` 改为传递 ID 列表

```tsx
// chat/index.tsx
const messageIds = useMessageStore(selectMessageIds(activeThreadId ?? ""));

// UpwardInfiniteList 的 isEmpty 仍需消息数量，可单独 selector
const messageCount = useMessageStore(
  (s) => (activeThreadId ? (s.messagesByThread[activeThreadId]?.length ?? 0) : 0)
);

<MessageList messageIds={messageIds} activeThreadId={activeThreadId} ... />
```

#### Step 3：`MessageList` 只负责布局，不再持有消息数据

```tsx
// message-list.tsx
interface MessageListProps {
  messageIds: (string | number)[];
  activeThreadId?: number | null;
  parentThreadTitle?: string;
}

export function MessageList({ messageIds, activeThreadId, parentThreadTitle }: MessageListProps) {
  // firstCurrentIdx 需要改为根据 ID 计算，或从 store 读取 threadId 映射
  return (
    <Box ...>
      {messageIds.map((id) => (
        <MessageItem key={id} messageId={id} isAncestor={...} ... />
      ))}
    </Box>
  );
}
```

#### Step 4：`MessageItem` 自己订阅单条消息

```tsx
// message-item.tsx
interface MessageItemProps {
  messageId: string | number;
  isAncestor?: boolean;
  // ... callbacks
}

export const MessageItem = memo(function MessageItem({ messageId, isAncestor, ... }: MessageItemProps) {
  // 精确订阅：只有这条消息变化时才重渲染
  const message = useMessageStore(
    useCallback(
      (s) => {
        // 在所有 thread 中查找（或在 ChatPage 传入 threadId）
        for (const msgs of Object.values(s.messagesByThread)) {
          const found = msgs.find((m) => m.id === messageId);
          if (found) return found;
        }
        return null;
      },
      [messageId]
    )
  );

  if (!message) return null;
  // ... 其余渲染逻辑不变
});
```

> **效果**：`ChatPage` 和 `MessageList` 不再因 token 更新而重渲染（ID 列表只在消息增删时变化）；`firstCurrentIdx` 的 `useMemo` 也不再每 token 重算。

---

### 策略 B：store 拆分——消息内容单独存储

**思路**：将消息内容（频繁变化）与消息元数据（稳定）分开存储，减少引用变化的范围。

```typescript
// message-store.ts 变体
interface MessageStore {
  /** 消息元数据：id, role, status, threadId, timestamp */
  messageMetaByThread: Record<string | number, MessageMeta[]>;
  /** 消息内容：按 messageId 索引，仅流式消息频繁更新 */
  messageContentById: Record<string | number, string>;
}

// appendStreamingContent 只更新 content map，不触碰 meta 数组
appendStreamingContent: (threadId, token) =>
  set((state) => {
    const streamingId = getStreamingMessageId(state, threadId);
    if (!streamingId) return state;
    return {
      messageContentById: {
        ...state.messageContentById,
        [streamingId]: (state.messageContentById[streamingId] ?? "") + token,
      },
    };
  }),
```

> **缺点**：需要较大重构，读取消息需要组合两个 selector，增加复杂度。适合消息量极大、性能要求极高的场景。

---

### 策略 C：`MarkdownContent` 的增量渲染优化

无论采用哪种 store 策略，流式阶段的 `MarkdownContent` 都会频繁更新，以下优化可独立应用：

#### C1：流式阶段降级为纯文本，完成后再切换为 Markdown

```tsx
// message-item.tsx
{
  message.status === MessageStatusEnum.STREAMING ? (
    // 流式阶段只做字符串拼接，0 解析成本
    <Box component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
      {message.content}
    </Box>
  ) : (
    // 完成后才进行完整 Markdown 渲染
    <MarkdownContent content={message.content} />
  );
}
```

> 这是**成本最低、收益最高**的单点改动。用户在流式阶段通常专注于内容到来，而非代码高亮格式。

#### C2：对 `MarkdownContent` 内部的 `useMemo` 做正确性确认

当前实现已有：

```typescript
const renderedContent = useMemo(
  () => <ReactMarkdown ...>{processedContent}</ReactMarkdown>,
  [processedContent, components],
);
```

注意：`useMemo` **不阻止** ReactMarkdown 内部的 diff reconciliation，它只避免了 JSX 对象的重新创建。ReactMarkdown 仍然会对整个 AST 做 diff。在流式场景下，每次 `content` 变化，`processedContent` 也变化，`useMemo` 实际上每次都会失效，与不加等价。**这里的 `useMemo` 对流式场景无效**，策略 C1 是正确解法。

#### C3：用 `requestAnimationFrame` 节流 token 更新频率

**为什么用 `rAF` 而不是 `setTimeout(fn, 50)`**：`setTimeout` 独立于浏览器渲染管线，可能和 Paint 错位，甚至在两帧之间触发多次。`requestAnimationFrame` 天然与屏幕刷新率（60Hz → 16.6ms/帧）对齐，每帧最多触发一次更新，是驱动 UI 更新的最优节拍器。

**实现位置**：在 `use-message.ts` 的 TOKEN 事件处理层做缓冲，而不是在 store 层。store 的职责是状态管理，节流逻辑属于「展示层关注点」。

```typescript
// use-message.ts — TOKEN 事件处理（sendMessage 内部）
const tokenBuffer = useRef("");
const rafRef = useRef<number | null>(null);

case ChatStreamEventType.TOKEN: {
  if (!hasStartedStreaming) {
    startStreaming(threadId, { /* placeholder */ });
    hasStartedStreaming = true;
  }
  tokenBuffer.current += event.data.content;
  // 同一帧内的多个 token 只触发一次 store 更新
  if (!rafRef.current) {
    rafRef.current = requestAnimationFrame(() => {
      appendStreamingContent(threadId, tokenBuffer.current);
      tokenBuffer.current = "";
      rafRef.current = null;
    });
  }
  break;
}
```

> 将同一帧（~16ms）内收到的所有 token 批量合并后再写入 store，直接将 store 更新 + 渲染次数从「每 token 一次」降至「每帧至多一次」。在 LLM 高速输出时效果最明显。

#### C4：流式语法自动补全（Streaming Syntax Auto-closing）

**问题**：流式输出时 AI 可能正在打一个代码块，但 ` ``` ` 闭合符尚未到达。Markdown 解析器会把后续所有文本都当成代码，造成整条消息布局突变、滚动条乱跳。

**方案**：在将 `content` 交给 `MarkdownContent` 渲染前，经过一个轻量预处理函数，动态补全未闭合的代码围栏。

````typescript
// utils/markdown-autoclosing.ts

/**
 * 检测并补全未闭合的代码围栏（``` 或 ~~~）
 * 仅用于流式渲染阶段的临时副本，不修改 store 中的真实内容
 */
export function autocompleteMarkdown(content: string): string {
  const lines = content.split("\n");
  let inFence = false;
  let fenceChar = "";

  for (const line of lines) {
    const match = line.match(/^(`{3,}|~{3,})/);
    if (match) {
      if (!inFence) {
        inFence = true;
        fenceChar = match[1][0]; // '`' or '~'
      } else if (line.startsWith(fenceChar.repeat(3))) {
        inFence = false;
      }
    }
  }

  // 未闭合则在末尾追加闭合符
  if (inFence) {
    return content + "\n" + fenceChar.repeat(3);
  }
  return content;
}
````

```tsx
// message-item.tsx — 流式阶段使用预处理后的内容
import { autocompleteMarkdown } from "@/utils/markdown-autoclosing";

// 在 MarkdownContent 降级方案（C1）关闭后，若需要保留实时 Markdown 渲染：
<MarkdownContent
  content={
    message.status === MessageStatusEnum.STREAMING
      ? autocompleteMarkdown(message.content)
      : message.content
  }
/>;
```

> **注意**：此函数只处理代码围栏（最常见的崩溃源）。加粗 `**`、斜体 `*`、数学公式 `$$` 等未闭合语法通常由解析器优雅降级处理，不会造成严重布局问题，可按需扩展。
>
> 若同时采用 C1（流式降级纯文本），则本函数在流式阶段不会被调用，可将其保留作为「切换到 Markdown 渲染前的最后一道保险」。

---

## 三、方案对比与选型建议

| 方案                   | 重构成本    | 性能收益                                 | 推荐度                |
| ---------------------- | ----------- | ---------------------------------------- | --------------------- |
| **C1**：流式降级纯文本 | ⭐ 极低     | ⭐⭐⭐ 高（消除流式期间全量 AST 解析）   | ✅ **立即实施**       |
| **C3**：rAF 节流       | ⭐⭐ 低     | ⭐⭐ 中（渲染次数降至每帧一次）          | ✅ **立即实施**       |
| **C4**：语法自动补全   | ⭐ 极低     | 消除布局闪烁（UX 问题）                  | ✅ **立即实施**       |
| **A**：ID 列表下沉订阅 | ⭐⭐⭐ 中   | ⭐⭐ 中（消除 ChatPage/List 无效重渲染） | ✅ **中期实施**       |
| **B**：store 拆分      | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐ 极高                            | ⚠️ 复杂度过高，不推荐 |

### 推荐落地顺序

```
第一轮（立竿见影，改动共 ~30 行）：
  C1 → 流式阶段纯文本降级（根治 Markdown 性能问题）
  C3 → rAF 节流（渲染降频，与 C1 协同降低 store 写入次数）
  C4 → 语法自动补全（稳定 UX，防止布局闪烁）

第二轮（消除上层无效重渲染）：
  A  → MessageItem 自订阅 messageId
       + store 新增 selectMessageIds selector
       + MessageList 改为传 ID 列表
```

---

## 四、现有代码中已做正确的事

- ✅ `MessageItem` 已包裹 `memo`
- ✅ `use-message.ts` 定义了 `EMPTY_MESSAGES_LIST` 常量以避免空数组每次创建新引用
- ✅ `MarkdownContent` 的 `components` 用 `useMemo([], [])` 稳定引用（避免 ReactMarkdown props 变化触发重渲染）
- ✅ `useMessage` 中通过 `useMessageStore.getState()` 获取 action（非响应式），避免 action 引用变化导致 hook 重运行

---

## 五、关于 `isAncestor` 的补充说明

目前 `isAncestor` 是在 `MessageList` 通过遍历 `messages` 数组计算的，切换到 ID 列表模式后，有两种处理方式：

1. **store 中直接存储 `isAncestor`**：在 `setMessages` / `prependMessages` 时由调用方传入（需要知道 `activeThreadId`）
2. **在 `MessageItem` 内部计算**：`MessageItem` 接收 `activeThreadId`，自己通过 `message.threadId !== activeThreadId` 判断

方式 2 更简洁，且只依赖稳定的 prop，推荐采用。

---

_文档版本：v1.0 | 最后更新：2026-03-08_
