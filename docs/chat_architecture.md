# 前端聊天架构设计指南：乐观更新与流式传输

本文档旨在解决聊天应用中两个核心问题：

1. **乐观 UI (Optimistic UI)**：让用户发送体验流畅，无需等待后端确认。
2. **流式传输 (Streaming)**：实现打字机效果，同时解决会话切换导致的数据丢失或错乱问题。

## 1. 核心原则

为了实现稳健的聊天系统，必须遵循以下原则：

- **单一数据源 (Single Source of Truth)**：所有的消息状态（发送中、成功、正在接收流）都应存储在全局 Store（如 Zustand/Redux）中，而不是组件内部状态。
- **ID 统一化**：前端生成的临时 ID (`tempId`) 是整个生命周期的关键索引，直到被后端真实 ID 替换或关联。

## 2. 数据模型设计

为了支持乐观更新和流式状态，消息模型需要扩展。

### 2.1 消息状态定义

```typescript
// src/types/message.ts

export type MessageStatus = "sending" | "success" | "error" | "streaming";

export interface Message {
  id: number | string; // 兼容后端 ID (number) 和 前端临时 ID (string UUID)
  content: string;
  role: 0 | 1; // 0: User, 1: AI
  status?: MessageStatus; // 新增状态字段
  tempId?: string; // 用于关联的临时 ID (可选，如果 id 直接复用可不存)
}
```

### 2.2 Store 结构改造（关键：支持多会话）

为了解决 **"用户切换会话后流式输出依然正常"** 的问题，Store 必须按会话 ID 索引数据，而不是只存一个当前列表。

```typescript
interface MessageStore {
  // 按 session_id 索引的消息列表
  // Key: session_id, Value: Message[]
  sessions: Record<number, Message[]>;

  // 当前激活的会话 ID
  activeSessionId: number | null;

  actions: {
    addMessage: (chatSessionId: number, message: Message) => void;
    updateMessageContent: (
      chatSessionId: number,
      messageId: number | string,
      content: string,
    ) => void;
    updateMessageStatus: (
      chatSessionId: number,
      messageId: number | string,
      status: MessageStatus,
    ) => void;
    replaceMessageId: (
      chatSessionId: number,
      tempId: string,
      realId: number,
    ) => void;
  };
}
```

---

## 3. 乐观更新实现方案 (Optimistic Updates)

针对你提出的方案 1 和 2，建议采用 **方案 2 的变体（ID 替换/合并策略）**。

### 为什么方案 1 (忽略 ID 更新) 不够好？

虽然简单，但如果用户需要对刚发送的消息进行 **撤回**、**重新编辑** 或 **引用** 操作，如果没有后端的真实 ID，这些操作将无法进行。

### 推荐流程

1. **用户发送**：
   - 生成 `tempId` (UUID)。
   - 立即推入 Store，状态设为 `sending`。
2. **API 请求**：
   - 调用后端接口，发送消息内容。
   - **关键点**：如果可能，建议后端接口支持 `client_msg_id` 参数，将前端的 `tempId` 透传回来，这样对应关系最稳健。
3. **后端响应**：
   - 后端返回包含 `id` (真实 ID) 的 UserMessage 和 AIMessage。
   - **Frontend Action**: 在 Store 中找到 `tempId` 对应的消息，将其 `id` 更新为真实 `id`，状态设为 `success`。
   - 同时将 AIMessage 加入 Store。

---

## 4. 流式传输与会话切换 (Streaming + Switching)

这是最复杂的场景。核心难点在于：**当流还在传输时，用户切到了别的会话，如何保证数据写对了位置？**

### 解决方案：基于 Store 的后台更新

只要数据写入逻辑是针对 **特定 Session ID** 的，UI 即使切走了也无所谓。

### 4.1 流程设计

1. **发起请求**：
   - 用户在会话 A (`chatSessionId: 1`) 发送消息。
   - 创建空的 AI 消息占位符，生成 `aiTempId`，推入 Store (`sessions[1]`)，状态 `streaming`。

2. **建立流连接**：
   - 接收流数据块 (Chunk)。
   - **重要**：流的处理函数必须闭包捕获当前的 `chatSessionId` (即 1)，或者流数据中包含 `session_id`。

3. **数据写入 (即使 UI 此时在会话 B)**：
   - 流回调触发：调用 `store.updateMessageContent(1, aiTempId, newContent)`。
   - Store 内部更新 `sessions[1]` 的数据。
   - 用户如果你此刻看着会话 B，界面毫无影响。
   - 用户切回会话 A，发现消息已经在那儿了（或者正在打字），因为数据一直在 Store 里更新。

### 4.2 代码伪逻辑 (Hook 实现)

```typescript
const sendMessage = async (content: string) => {
  const currentSessionId = store.activeSessionId; // 捕获发送时的 ID
  const userTempId = uuid();
  const aiTempId = uuid();

  // 1. 乐观更新用户消息
  store.addMessage(currentSessionId, {
    id: userTempId,
    role: 0,
    content,
    status: "sending",
  });

  // 2. 预先占位 AI 消息 (用于流式展示)
  store.addMessage(currentSessionId, {
    id: aiTempId,
    role: 1,
    content: "",
    status: "streaming",
  });

  try {
    // 3. 发起流式请求
    await streamApi.chat({
      content,
      onToken: (token) => {
        // 核心：无论当前 activeSessionId 是多少，都更新 currentSessionId 的数据
        store.appendMessageContent(currentSessionId, aiTempId, token);
      },
      onSuccess: (finalData) => {
        // 4. (可选) 替换 ID
        // 如果后端在流结束时返回了真实 ID
        store.replaceMessageId(
          currentSessionId,
          userTempId,
          finalData.userMsgId,
        );
        store.replaceMessageId(currentSessionId, aiTempId, finalData.aiMsgId);
        store.updateMessageStatus(
          currentSessionId,
          finalData.aiMsgId,
          "success",
        );
      },
    });
  } catch (err) {
    store.updateMessageStatus(currentSessionId, userTempId, "error");
  }
};
```

## 5. 总结

为了支持你在 LLM 场景下的需求，**必须放弃简单的单列表 Store，转向按 SessionID 索引的 Store 结构**。

- **乐观更新**：先用 `tempId` 占位，后端返回后利用 `replaceMessageId` 修正数据一致性。
- **流式维持**：流处理器必须绑定 `chatSessionId`，独立于 UI 组件的挂载/卸载周期，直接操作 Store。

这样，无论用户如何切换会话，后台的流式接收都不会中断，数据也不会错乱。
