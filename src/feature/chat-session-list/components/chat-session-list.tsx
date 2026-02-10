import { InfiniteScrollList, type LoadMoreResult } from "@/components/layout";
import type { ChatSession } from "@/types";
import { ChatSessionItem } from "./chat-session-item";
import { ChatSessionListHeader } from "./chat-session-list-header";
import { ChatSessionListEmpty } from "./chat-session-list-empty";
import { ChatSessionListSkeleton } from "./chat-session-list-skeleton";

// ===== 类型定义 =====

export interface ChatSessionListProps {
  /** 会话列表数据（来自 Store，含乐观更新数据） */
  sessions: ChatSession[];
  /** 当前激活的会话 ID */
  activeSessionId: string | number | null;
  /** 新会话标题是否正在生成中 */
  isTitleGenerating: boolean;
  /** 加载更多回调，由 Hook 层提供 */
  fetchMore: (cursor?: string) => Promise<LoadMoreResult>;
  /** 点击会话项 */
  onSessionClick: (sessionId: string | number) => void;
  /** 点击新建会话 */
  onCreateSession: () => void;
  /** 点击会话操作菜单 */
  onSessionMenuClick?: (
    sessionId: string | number,
    anchor: HTMLElement,
  ) => void;
}

// ===== 组件实现 =====

export function ChatSessionList({
  sessions,
  activeSessionId,
  isTitleGenerating,
  fetchMore,
  onSessionClick,
  onCreateSession,
  onSessionMenuClick,
}: ChatSessionListProps) {
  return (
    <>
      {/* 列表头部 */}
      <ChatSessionListHeader onCreateSession={onCreateSession} />

      {/* 无限滚动列表 */}
      <InfiniteScrollList<ChatSession>
        items={sessions}
        fetchMore={fetchMore}
        renderItem={(session) => {
          const key = session.id ?? session.tempId ?? "";
          const isActive =
            activeSessionId !== null &&
            (session.id === activeSessionId ||
              session.tempId === activeSessionId);

          // 仅对正在创建中的会话项显示标题生成 Skeleton
          const showTitleGenerating =
            isTitleGenerating && session.status === "creating";

          return (
            <ChatSessionItem
              key={key}
              session={session}
              isActive={isActive}
              isTitleGenerating={showTitleGenerating}
              onClick={onSessionClick}
              onMenuClick={onSessionMenuClick}
            />
          );
        }}
        renderLoading={() => <ChatSessionListSkeleton count={4} />}
        renderEmpty={() => <ChatSessionListEmpty />}
      />
    </>
  );
}
