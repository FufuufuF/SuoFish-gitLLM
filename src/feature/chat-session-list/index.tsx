import { useNavigate } from "react-router-dom";
import { InfiniteScrollList } from "@/components/layout";
import type { ChatSession } from "@/types";
import { ChatSessionItem } from "./components/chat-session-item";
import { ChatSessionListHeader } from "./components/chat-session-list-header";
import { ChatSessionListEmpty } from "./components/chat-session-list-empty";
import { ChatSessionListSkeleton } from "./components/chat-session-list-skeleton";
import { useChatSession } from "@/hooks";
import { useToastStore } from "@/stores/toast-store";

const DEFAULT_DELETE_ERROR_MESSAGE = "删除会话失败，请稍后重试";

function resolveDeleteErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return DEFAULT_DELETE_ERROR_MESSAGE;
}

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
    deleteSession,
  } = useChatSession();
  const showToast = useToastStore((s) => s.showToast);

  /** 切换到已有会话（路由导航） */
  const handleSwitchSession = (chatSessionId: string | number) => {
    navigate(`/chat/${chatSessionId}`);
  };

  /** 创建新会话（路由导航 + 清空激活状态） */
  const handleCreateSession = () => {
    startNewSession(); // setActiveSessionId(null)
    navigate("/chat");
  };

  /** 删除会话（调用 API + toast 提示） */
  const handleDeleteSession = async (chatSessionId: string | number) => {
    if (typeof chatSessionId !== "number" || chatSessionId <= 0) {
      showToast(DEFAULT_DELETE_ERROR_MESSAGE, "error");
      return;
    }

    const isDeletingActiveSession = activeSessionId === chatSessionId;

    try {
      await deleteSession(chatSessionId);
      showToast("删除会话成功", "success");

      if (isDeletingActiveSession) {
        startNewSession();
        navigate("/chat");
      }
    } catch (error) {
      showToast(resolveDeleteErrorMessage(error), "error");
    }
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
              onDelete={handleDeleteSession}
            />
          );
        }}
        renderLoading={() => <ChatSessionListSkeleton count={4} />}
        renderEmpty={() => <ChatSessionListEmpty />}
      />
    </>
  );
}
