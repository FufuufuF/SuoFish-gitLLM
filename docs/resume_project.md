# 项目经历 | gitLLM —— AI 对话平台（全栈）

> **技术栈**：React 19 · TypeScript · Vite · MUI · Zustand · Python · FastAPI · LangGraph · PostgreSQL · ChromaDB · SQLAlchemy（Async）

---

## 项目概述

独立设计并开发了一款以**多线程分叉对话**为核心差异点的 AI 对话平台。用户可从任意消息出发创建"分支线程"（Fork）进行平行探索，最终通过"合并"（Merge）操作将支线结论汇总回主线，并由 AI 自动生成摘要——类 Git 分支工作流的对话模式，为多方案对比与知识探索提供结构化支持。

---

## 前端（React + Vite + TypeScript）

- **多线程分叉/合并工作流（Thread Fork & Merge）**  
  支持从任意消息节点 Fork 出新线程，线程以树状结构组织，侧边栏交互树形视图展示分支拓扑。Merge 分两阶段：Preview 阶段由后端 LLM 生成摘要供用户预览确认，Confirm 阶段提交合并并将摘要消息原子写回目标线程，全程由 Zustand 状态机（`idle → previewing → confirming → success`）驱动 UI 流转。

- **向上无限滚动分页（UpwardInfiniteList）**  
  自研基于 Intersection Observer 的向上懒加载组件；加载前记录 `scrollHeight`，加载后以差值修正 `scrollTop` 保证滚动锚点不漂移；配合游标分页（Cursor Pagination）接口彻底规避 offset 错位问题。

- **SSE 流式输出 + 乐观更新**  
  通过 Server-Sent Events 实时逐 token 渲染 AI 回复；发送时即向 store 乐观插入带 `tempId` 的占位消息，SSE 结束后以真实 ID 替换，出错自动回滚，交互零等待感。

- **性能优化**  
  Vite `manualChunks` 拆分 MUI、语法高亮等大体积依赖 + 路由级 `React.lazy` 懒加载，首屏关键包体积降低约 60%；虚拟列表将长会话的 DOM 节点数稳定控制在固定窗口内，帧率始终流畅。

---

## 后端（FastAPI + LangGraph + Python）

- **LangGraph 有状态对话图**  
  基于 `StateGraph` 将推理逻辑节点化（`generate_reply`、`load_context`、`generate_brief` 等）；`AsyncPostgresSaver` 将对话检查点持久化至 PostgreSQL，每个线程分配独立 `thread_id` 作为 checkpoint key，多线程上下文天然隔离且支持跨进程恢复。

- **SSE 流式输出 + 优雅断连处理**  
  `StreamingResponse` + 异步生成器将逐 token 流实时推送前端；捕获 `asyncio.CancelledError` 后静默 `return` 而不 re-raise，避免框架层打印误导性错误日志；Nginx 侧配置 `X-Accel-Buffering: no` 禁用响应缓冲。

- **AI 辅助线程合并（两阶段提交）**  
  Preview 阶段仅调用 LLM 生成摘要、不修改任何状态；Confirm 阶段在单一 SQLAlchemy 异步事务内完成线程状态变更与 Brief 消息写入，保证原子性，失败自动回滚。
