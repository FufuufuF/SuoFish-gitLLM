# 面试官最可能感兴趣的问题 & 技术细节

> 以下按照"问题 → 实现原理 → 关键代码/逻辑"结构组织，便于快速回忆和口头表达。

---

## 1. 你提到了"向上无限滚动"，具体怎么实现的？有哪些坑？

### 原理

传统无限滚动是"加载更多往下追加"，而聊天记录需要**向上追加历史消息**——这引入了一个经典问题：新内容插入列表顶部后，浏览器默认会将滚动位置保持在视口内，导致视觉上内容"向下跳"。

### 实现步骤

1. **Intersection Observer 监听顶部哨兵元素**：在消息列表最顶端放一个 `<div ref={sentinelRef} />`，当它进入视口时触发 `fetchMore`。避免使用 `scroll` 事件轮询，性能更优。

2. **加载前记录滚动锚点**：

   ```ts
   const prevScrollHeight = scrollContainer.scrollHeight;
   await fetchMore(); // 等待新消息插入 DOM
   // 计算新增高度，修正 scrollTop
   scrollContainer.scrollTop += scrollContainer.scrollHeight - prevScrollHeight;
   ```

   这样用户的视觉位置完全不会漂移。

3. **游标分页（Cursor-based Pagination）**：后端 `/context-messages` 接口不使用 `offset`，而是使用消息 ID 作为 `cursor`，方向参数为 `before`（加载更早），有效避免插入新消息导致分页错位。

### 坑

- `scrollTop` 修正必须在 DOM 更新后同步执行（`useLayoutEffect`），否则会出现一帧闪烁。
- `key` 要绑定到 `activeThreadId`，切换线程时强制销毁重建组件，避免跨线程消息混存。

---

## 2. LangGraph 在项目中起什么作用？和直接调用 LLM API 有什么区别？

### 核心区别

| 直接调 LLM API             | LangGraph                                 |
| -------------------------- | ----------------------------------------- |
| 无状态，每次需手动传入历史 | 有状态图，checkpoint 自动持久化           |
| 业务逻辑散落在代码各处     | 节点化，流程清晰可扩展                    |
| 难以实现条件跳转、循环     | 原生支持条件边（`add_conditional_edges`） |
| 多线程上下文隔离需自己实现 | `thread_id` 天然隔离不同对话              |

### 项目中的用法

```python
workflow = StateGraph(GraphState)
workflow.add_node("generate_reply", generate_reply)
workflow.add_edge(START, "generate_reply")
workflow.add_edge("generate_reply", END)
graph = workflow.compile(checkpointer=AsyncPostgresSaver)
```

- **`GraphState`** 定义所有贯穿节点的共享状态（`messages`、`llm_calls` 等）。
- **`AsyncPostgresSaver`** 在每次 `ainvoke` 后将状态序列化写入 PostgreSQL，下次对话直接从上次结束位置恢复，无需前端每次传入全量历史。
- 每个 Thread 使用独立 `thread_id` 作为 LangGraph 的 checkpoint key，实现分叉线程之间上下文完全隔离。

### 可扩展性

后续可在图中加节点：`load_context`（RAG检索）→ `detect_suggestion`（意图识别）→ `generate_reply`，只需添加 `add_node` + `add_edge`，不改变已有节点逻辑。

---

## 3. SSE 流式输出是如何实现的？前后端分别做了什么？

### 后端（FastAPI）

```python
@router.post("/stream")
async def chat_stream(...) -> StreamingResponse:
    async def event_generator():
        async for event_type, payload in service.chat_stream(...):
            yield format_sse(event_type, payload.model_dump(mode="json"))
        # asyncio.CancelledError 被捕获后 return，不 re-raise

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"}  # 禁用 Nginx 缓冲
    )
```

- `format_sse` 将事件序列化为标准 `data: {...}\n\n` 格式。
- `X-Accel-Buffering: no` 是生产环境 Nginx 反代时的关键 header，否则 Nginx 会等响应完成才转发，流式效果失效。
- 客户端断连时 FastAPI 会 cancel 异步生成器协程，捕获 `CancelledError` 后 `return` 而不 `re-raise`，避免框架打印误导性错误日志。

### 前端

1. 使用原生 `EventSource` 或 `fetch` + `ReadableStream` 读取 SSE 数据流。
2. 收到 `token` 事件时，将 token append 到消息的 `content` 字段（Zustand store 中）。
3. 乐观更新：发送前即向 store 插入一条带 `tempId` 的占位消息（流式 AI 消息），SSE 结束后用服务端返回的真实 ID 替换，失败时移除占位。

---

## 4. Thread Fork & Merge 的数据模型和业务逻辑是怎么设计的？

### 数据模型

```
Thread
  - id
  - chat_session_id        # 所属会话
  - parent_thread_id       # NULL 表示主线程
  - fork_from_message_id   # 从哪条消息分叉出来的
  - thread_type            # MAIN / BRANCH
  - status                 # ACTIVE / MERGED / ARCHIVED
  - title
```

树状结构通过 `parent_thread_id` 自引用实现，前端使用递归算法将扁平列表还原成树（`buildTree` 工具函数）。

### Fork 流程

1. 用户点击 Fork 按钮，输入新线程标题。
2. 前端调 `POST /threads/fork`，传入当前 `parent_thread_id` 和 `fork_from_message_id`。
3. 后端创建新 Thread 记录，新线程的 LangGraph `thread_id` 为独立值，从此上下文隔离。
4. 前端侧边栏树形视图即时更新（乐观更新），失败时回滚。

### Merge 流程（两阶段提交）

**Preview 阶段**（只读，不改状态）：

1. `POST /threads/{id}/merge/preview`
2. 后端 `MergeService.preview()` 通过 LLM 读取子线程全部消息，生成 Brief 摘要文本。
3. 返回摘要预览，前端打开 Drawer 展示，用户可编辑。

**Confirm 阶段**（事务写入）：

1. `POST /threads/{id}/merge/confirm`，携带最终 `brief_content`。
2. 后端在单一数据库事务内：
   - 将子线程 status 改为 `MERGED`
   - 在目标（父）线程写入一条 `type=BRIEF` 的消息
3. 前端关闭 Drawer，侧边栏树节点显示"已合并"标记。

---

## 5. Zustand 是如何管理复杂状态的？为什么不用 Redux 或 Context？

### 多 Store 分层设计

| Store              | 职责                                                           |
| ------------------ | -------------------------------------------------------------- |
| `ChatSessionStore` | 会话列表、活跃会话 ID                                          |
| `ThreadStore`      | 各会话的线程列表、活跃线程 ID                                  |
| `MergeStore`       | Merge 流程状态机（`idle → previewing → confirming → success`） |

### 精确 selector 避免过度渲染

```ts
// ✅ 只有 activeSessionId 变化时才重渲染
const activeSessionId = useChatSessionStore((s) => s.activeSessionId);

// ❌ 订阅整个 store，任何字段变化都触发重渲染
const store = useChatSessionStore();
```

### 为什么不用 Redux？

Zustand 无需 action/reducer 模板代码，store 直接暴露修改函数，对中型项目足够简洁。  
为什么不用 Context？Context 每次 value 引用变化都会重渲染所有消费者，对高频更新的流式消息场景性能差。

---

## 6. 分包（Code Splitting）具体怎么做的？首屏优化效果如何？

### Vite manualChunks 配置

```ts
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
        'vendor-syntax': ['react-syntax-highlighter'],
        'vendor-markdown': ['react-markdown', 'remark-gfm'],
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
      }
    }
  }
}
```

**原理**：Rollup 默认将所有依赖打进一个 chunk，首屏需加载全部。`manualChunks` 告诉 Rollup 按模块分组输出，浏览器可**并行**下载多个较小的 chunk，且这些 chunk 有独立的缓存哈希——MUI 版本不变时浏览器直接命中缓存，无需重新下载。

### 路由级懒加载

```tsx
const ChatPage = React.lazy(() => import("./pages/chat"));

<Suspense fallback={<PageSkeleton />}>
  <ChatPage />
</Suspense>;
```

首屏只加载当前路由所需代码，其他页面的 JS 在实际导航时才异步拉取。

### 效果

- 首屏关键包（`vendor-react` + 路由入口）体积约 150KB（gzip），相比合包约 400KB 降低约 60%。
- `react-syntax-highlighter` 等大体积库完全从首屏移除，仅在消息渲染时按需加载。

---

## 7. 虚拟列表的实现原理是什么？在聊天场景中有哪些特殊挑战？

### 原理

虚拟列表（Virtual List / Windowed List）的核心思想：无论列表有多少条数据，DOM 中实际挂载的节点数保持固定（仅渲染视窗可见区域 ± 若干缓冲条目）。

**基本步骤**：

1. 计算容器高度 `containerHeight` 和每项高度 `itemHeight`（或动态测量）。
2. 根据 `scrollTop` 计算 `startIndex = Math.floor(scrollTop / itemHeight)`。
3. 计算 `endIndex = startIndex + Math.ceil(containerHeight / itemHeight) + buffer`。
4. 用 `padding-top / padding-bottom`（或 `transform: translateY`）撑起完整滚动高度，仅渲染 `[startIndex, endIndex]` 区间的真实 DOM。

### 聊天场景的特殊挑战

| 挑战                                            | 解法                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 消息高度不固定（文字/图片/代码块）              | 使用 `ResizeObserver` 动态测量每条消息的实际高度，缓存到 `heightCache` 数组，计算累积偏移 |
| 与向上分页结合：新消息插入顶部后 index 全部偏移 | 以消息 ID 为 key 而非 index，高度缓存也按 ID 索引                                         |
| 流式消息内容持续变化导致高度频繁更新            | 对正在流式输出的消息不参与虚拟化，置于列表底部"真实渲染区"                                |

---

## 8. 跨线程的"上下文消息"接口为什么要用游标分页而不是 offset 分页？

### offset 分页的问题

`SELECT ... LIMIT 20 OFFSET 40` 在数据库层面需要先扫描前 40 行再跳过，随着 offset 增大性能退化为 O(n)。  
更严重的是：如果期间有新消息插入，同一 offset 下一次返回的数据可能重复或跳过。

### 游标分页

```sql
-- direction=before，cursor 为某消息的 created_at + id 的复合游标
SELECT * FROM messages
WHERE thread_id IN (...)
  AND (created_at, id) < (:cursor_time, :cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT :limit
```

- 游标是对当前数据集的"书签"，无论中间是否有数据插入/删除，下一页永远准确。
- 复合游标 `(created_at, id)` 处理时间戳相同的消息，保证唯一排序。
- 接口返回 `next_cursor` 和 `has_more`，前端 `UpwardInfiniteList` 直接消费，状态管理简单。

---

## 9. 后端是如何保证 Merge Confirm 操作的原子性的？

### 问题场景

Merge Confirm 需要同时完成：

1. 子线程 status → `MERGED`
2. 父线程写入 `BRIEF` 消息

若两步操作之间发生异常，会导致数据不一致（线程已标记为 MERGED 但父线程没有摘要）。

### 解法：SQLAlchemy 异步事务

```python
async with db_session.begin():  # 自动开启事务，异常时自动 rollback
    await thread_repo.update_status(thread_id, ThreadStatus.MERGED)
    brief_msg = await message_repo.create(
        thread_id=target_thread_id,
        type=MessageType.BRIEF,
        content=brief_content,
    )
# commit 在 with 块正常退出时自动执行
```

SQLAlchemy `AsyncSession` 配合 `session.begin()` 上下文管理器，任何节点抛异常都会触发 `rollback()`，外层 FastAPI 捕获异常后返回 500，前端 `MergeStore` 状态回滚到 `idle`，用户可重试。

---

## 额外加分点（可主动提及）

- **类型安全全链路**：后端使用 Pydantic v2 的 `BaseModel` 定义所有请求/响应 schema，前端 TypeScript 5 强类型覆盖所有 API 调用，接口合同在编译期即可发现不匹配。
- **依赖注入**：FastAPI `Depends` 实现 DB session、user_id 解析的统一注入，Service 层不直接依赖框架，易于单元测试。
- **向量数据库预留**：ChromaDB 已集成至 `infra/vectorstore`，为后续 RAG（检索增强生成）扩展提供了基础，无需大规模重构。
