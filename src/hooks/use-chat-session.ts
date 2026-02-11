import { useCallback } from "react";
import { useChatSessionStore } from "@/stores/chat-session-store";
import {
  getChatSessionList,
  type ChatSession as ApiChatSession,
} from "@/api/common/chat-session";
import type { ChatSession } from "@/types";

export function useChatSession() {
  const {
    sessions,
    activeSessionId,
    isTitleGenerating,
    setSessions,
    addSession,
    updateSessionStatus,
    replaceSessionId,
    updateSessionTitle,
    setActiveSessionId,
    removeSession,
    setTitleGenerating,
    updateActiveThreadId,
  } = useChatSessionStore();

  // ===== 数据转换函数（供分页组件使用） =====
  const mapApiSessionToBusinessSession = useCallback(
    (item: ApiChatSession): ChatSession => ({
      id: item.id,
      activeThreadId: item.active_thread_id,
      title: item.title,
      goal: item.goal,
      status: "active" as const,
      createdAt: new Date(item.create_at),
      updatedAt: new Date(item.update_at),
    }),
    [],
  );

  // ===== 创建分页请求回调（传递给 InfiniteScrollList） =====
  const fetchSessionsForPagination = useCallback(
    async (cursor?: string) => {
      const response = await getChatSessionList({ cursor, limit: 20 });
      const mappedSessions = response.items.map(mapApiSessionToBusinessSession);
      // 同步更新 Store（可选，取决于是否需要全局访问）
      setSessions(mappedSessions);
      return {
        items: mappedSessions,
        nextCursor: response.next_cursor,
        hasMore: response.has_more,
      };
    },
    [mapApiSessionToBusinessSession, setSessions],
  );

  // ===== 进入新会话模式（点击「创建新会话」时调用） =====
  // 注意：此时不创建 session，仅清空当前激活会话，显示空白聊天界面
  const startNewSession = useCallback(() => {
    setActiveSessionId(null);
  }, [setActiveSessionId]);

  // ===== 判断当前是否处于新会话模式 =====
  const isNewSessionMode = activeSessionId === null;

  // ===== 创建新会话（由 useMessage 在发送第一条消息时调用） =====
  const createSession = useCallback((): string => {
    const tempId = crypto.randomUUID();
    const now = new Date();

    const newSession: ChatSession = {
      id: -1,
      tempId,
      title: undefined, // 标题由 AI 生成，初始为空显示 loading
      activeThreadId: -1,
      status: "creating",
      createdAt: now,
      updatedAt: now,
    };

    addSession(newSession);
    setActiveSessionId(tempId);
    setTitleGenerating(true); // 开始标题生成 loading

    return tempId;
  }, [addSession, setActiveSessionId, setTitleGenerating]);

  // ===== 切换会话 =====
  const switchSession = useCallback(
    (sessionId: number) => {
      setActiveSessionId(sessionId);
    },
    [setActiveSessionId],
  );

  // ===== 获取当前激活的会话对象 =====
  const activeSession = sessions.find(
    (s) => s.id === activeSessionId || s.tempId === activeSessionId,
  );

  // ===== 确认会话创建成功（由 orchestrator 调用） =====
  const confirmSessionCreation = useCallback(
    (tempId: string, realId: number, threadId: number, title?: string) => {
      replaceSessionId(tempId, realId);
      updateSessionStatus(realId, "active");
      updateActiveThreadId(realId, threadId);
      if (title) {
        updateSessionTitle(realId, title);
      }
      setTitleGenerating(false); // 结束标题生成 loading
    },
    [
      replaceSessionId,
      updateSessionStatus,
      updateActiveThreadId,
      updateSessionTitle,
      setTitleGenerating,
    ],
  );

  // ===== 标记会话创建失败 =====
  const markSessionError = useCallback(
    (sessionId: string | number) => {
      updateSessionStatus(sessionId, "error");
      setTitleGenerating(false);
    },
    [updateSessionStatus, setTitleGenerating],
  );

  return {
    // 状态
    sessions,
    activeSession,
    activeSessionId,
    isTitleGenerating,
    isNewSessionMode, // 新增：是否处于新会话模式

    // 方法
    fetchSessionsForPagination, // 供 InfiniteScrollList 使用
    startNewSession, // 新增：点击「创建新会话」时调用
    createSession, // 由 useMessage 在发送第一条消息时调用
    switchSession,
    confirmSessionCreation,
    markSessionError,
    removeSession,
    setTitleGenerating,
  };
}
