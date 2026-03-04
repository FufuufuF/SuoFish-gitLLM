/**
 * 骨架屏组件统一出口
 *
 * - FullPageSkeleton  → 用于 RootLayout 懒加载时的 Suspense fallback（包含 Sidebar + 聊天区）
 * - ChatPageSkeleton  → 用于 ChatPage 懒加载时的 Suspense fallback（仅含消息列表 + 输入框）
 */
export { FullPageSkeleton } from "./full-page-skeleton";
export { ChatPageSkeleton } from "./chat-page-skeleton";
