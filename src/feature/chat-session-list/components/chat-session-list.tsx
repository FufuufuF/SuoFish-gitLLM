import { useNavigate } from "react-router-dom";
import { InfiniteScrollList } from "@/components/layout";
import type { ChatSession } from "@/types";
import { ChatSessionItem } from "./chat-session-item";
import { ChatSessionListHeader } from "./chat-session-list-header";
import { ChatSessionListEmpty } from "./chat-session-list-empty";
import { ChatSessionListSkeleton } from "./chat-session-list-skeleton";
import { useChatSession } from "@/hooks";

// ===== 组件实现 =====

export function ChatSessionList() {
  const navigate = useNavigate();
  const {
    // 状态
    sessions,
    activeSessionId,
    isTitleGenerating,

    // 方法
    fetchSessionsForPagination, // 供 InfiniteScrollList 使用
    startNewSession, // 清空 activeSessionId
  } = useChatSession();

  /** 切换到已有会话（路由导航） */
  const handleSwitchSession = (chatSessionId: string | number) => {
    navigate(`/chat/${chatSessionId}`);
  };

  /** 创建新会话（路由导航 + 清空激活状态） */
  const handleCreateSession = () => {
    startNewSession(); // setActiveSessionId(null)
    navigate("/chat");
  };

  return (
    <>
      {/* 列表头部 */}
      <ChatSessionListHeader onCreateSession={handleCreateSession} />

      {/* 无限滚动列表 */}
      <InfiniteScrollList<ChatSession>
        items={sessions}
        fetchMore={fetchSessionsForPagination}
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
              onClick={handleSwitchSession}
            />
          );
        }}
        renderLoading={() => <ChatSessionListSkeleton count={4} />}
        renderEmpty={() => <ChatSessionListEmpty />}
      />
    </>
  );
}
