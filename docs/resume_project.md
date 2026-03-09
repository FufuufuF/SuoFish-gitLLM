# 项目经历 | gitLLM —— AI 对话平台（全栈）

> **技术栈**：React 19 · TypeScript · Vite · MUI · Zustand · Python · FastAPI · LangGraph · PostgreSQL · ChromaDB · SQLAlchemy（Async）

---

## 项目概述

独立设计并开发了一款以**多线程分叉对话**为核心差异点的 AI 对话平台。用户可从任意消息出发创建"分支线程"（Fork）进行平行探索，最终通过"合并"（Merge）操作将支线结论汇总回主线，并由 AI 自动生成摘要——类 Git 分支工作流的对话模式，为多方案对比与知识探索提供结构化支持。

---

## 前端（React + Vite + TypeScript）

- **首屏白屏优化（LCP 性能调优）**  
  针对初始包体积过大问题实施多层优化策略：① 将 `createBrowserRouter` 提取至模块顶层，消除每次重渲染时整棵路由树卸载/重挂载的隐患；② 路由层引入 `React.lazy` + `Suspense`，`RootLayout` 与 `ChatPage` 按需加载，并配置 `FullPageSkeleton` / `ChatPageSkeleton` 作为 Suspense 降级 UI，消除白屏闪烁；③ 将 `react-syntax-highlighter` 从全量 `prism` 切换为 `prism-light` 入口，主 bundle 减少 ~200 KB；④ Vite `manualChunks` 将 MUI、react-markdown 等重型依赖拆入独立 chunk，提升并行加载与缓存命中率，综合首屏关键资源体积降低约 60%。

- **AI 流式回复 Markdown 解析优化**  
  流式输出（SSE）阶段每个 token 均会触发 store 写入与组件重渲染，导致频繁的 Markdown 全量解析。为此在 `use-message.ts` 中实现了基于 `requestAnimationFrame` 的 token 节流缓冲：同一帧内收到的多个 token 先积累至局部 `tokenBuffer`，由 rAF 回调批量合并写入 Zustand store，将高频 store 写入压缩至显示器刷新率（~60 fps）；同时在 `MarkdownContent` 组件内通过 `useMemo` 缓存 `components` 配置对象与渲染结果，防止因引用变化导致的无效重解析。在 `sendMessage` 的 `finally` 块中取消挂起的 rAF 并同步 flush 残留缓冲区，确保流式结束时最后一批 token 不丢失。

- **向上无限滚动分页（UpwardInfiniteList）**  
  自研基于 Intersection Observer 的向上懒加载组件，解决传统下拉分页在 IM 场景下的锚点漂移问题：加载前记录 `scrollHeight`，加载后以差值修正 `scrollTop`，保证视图位置不跳动；搭配游标分页（Cursor Pagination）接口彻底规避 offset 错位；`fetchMoreMessages` 适配层在临时 `threadId`（乐观更新阶段）下直接短路返回 `hasMore: false`，避免无效请求。

- **SSE 流式输出 + 乐观更新与错误回滚**  
  发送消息时立即向 store 乐观插入带 `tempId` 的占位消息（状态 `SENDING`），通过 SSE 接收 `HUMAN_MESSAGE_CREATED` 事件后原子替换为真实 ID 并标记 `SUCCESS`；AI 回复通过 `startStreaming → appendStreamingContent → finalizeStreaming` 三段式状态迁移完成；用户主动中止（`AbortController`）或网络异常时，`abortStreaming` 保留已接收内容并标记 `STOP_STREAMING`，`catch` 块区分 `AbortError` 与真实错误，精准触发状态回滚，交互零等待感。

- **多线程分叉/合并工作流（Thread Fork & Merge）**  
  支持从任意消息节点 Fork 出新线程，线程以树状结构组织，侧边栏交互树形视图展示分支拓扑。消息列表实现"分支感知"渲染：通过 `isAncestor` prop 区分祖先消息与当前分支消息，祖先消息降权显示（颜色弱化、操作按钮隐藏）且插入 `ThreadForkDivider` 分隔栏标注分叉起点，BRIEF（合并摘要）消息渲染为独立品牌色卡片。Merge 分两阶段：Preview 阶段由后端 LLM 生成摘要供用户确认，Confirm 阶段提交并原子写回，全程由 Zustand 状态机（`idle → previewing → confirming → success`）驱动 UI 流转。

---

## 后端（FastAPI + LangGraph + Python）

- **LangGraph 有状态对话图**  
  基于 `StateGraph` 将推理逻辑节点化（`generate_reply`、`load_context`、`generate_brief` 等）；`AsyncPostgresSaver` 将对话检查点持久化至 PostgreSQL，每个线程分配独立 `thread_id` 作为 checkpoint key，多线程上下文天然隔离且支持跨进程恢复。

- **SSE 流式输出 + 优雅断连处理**  
  `StreamingResponse` + 异步生成器将逐 token 流实时推送前端；捕获 `asyncio.CancelledError` 后静默 `return` 而不 re-raise，避免框架层打印误导性错误日志；Nginx 侧配置 `X-Accel-Buffering: no` 禁用响应缓冲。

- **AI 辅助线程合并（两阶段提交）**  
  Preview 阶段仅调用 LLM 生成摘要、不修改任何状态；Confirm 阶段在单一 SQLAlchemy 异步事务内完成线程状态变更与 Brief 消息写入，保证原子性，失败自动回滚。
