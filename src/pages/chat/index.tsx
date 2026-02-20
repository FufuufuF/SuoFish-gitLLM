import { useEffect, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { ChatInput, MessageList } from "./components";
import { useMessage } from "./hooks/use-message";
import { useChatOrchestrator } from "./hooks/use-chat-orchestrator";
import { useChatSessionStore } from "@/stores/chat-session-store";

export function ChatPage() {
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  const { sendFirstMessage } = useChatOrchestrator();

  // Store 状态
  // TODO: 组件直接消费Store中的数据是否合适? 是否需要通过 Hook 进行封装?
  const activeSessionId = useChatSessionStore((s) => s.activeSessionId);
  const sessions = useChatSessionStore((s) => s.sessions);
  const setActiveSessionId = useChatSessionStore((s) => s.setActiveSessionId);

  // URL sessionId 优先（始终为数字 ID），回退到 store 的 activeSessionId（新会话创建期间为 tempId）
  const parsedUrlSessionId = urlSessionId ? Number(urlSessionId) : null;
  const isValidUrlSession =
    parsedUrlSessionId !== null && Number.isFinite(parsedUrlSessionId);

  const sessionKey = isValidUrlSession ? parsedUrlSessionId : activeSessionId;
  const isNewSessionMode = !sessionKey;

  // 查找当前会话对象（获取 activeThreadId）
  const activeSession = sessionKey
    ? sessions.find((s) => s.id === sessionKey || s.tempId === sessionKey)
    : undefined;

  // 纯消息 Hook — 以 threadId 为最小存储单元
  const activeThreadId = activeSession?.activeThreadId;
  const { messages, sendMessage, fetchMessages } = useMessage(activeThreadId);

  // 同步 URL sessionId → store（用于侧边栏高亮）
  // 仅在 URL 有有效 sessionId 时同步，新会话模式由 sidebar 的 startNewSession 处理
  useLayoutEffect(() => {
    if (isValidUrlSession) {
      setActiveSessionId(parsedUrlSessionId);
    }
  }, [isValidUrlSession, parsedUrlSessionId, setActiveSessionId]);

  // 切换到已有会话时拉取历史消息
  useEffect(() => {
    if (isValidUrlSession && activeThreadId) {
      fetchMessages();
    }
  }, [isValidUrlSession, activeThreadId, fetchMessages]);

  const handleSend = async (content: string) => {
    if (isNewSessionMode) {
      // 新会话首条消息 — 由 orchestrator 编排 session 创建 + 消息发送 + 路由跳转
      await sendFirstMessage(content);
    } else {
      // 已有会话 — 直接发送消息
      await sendMessage(content, Number(activeSession?.id));
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
        width: "100%",
        height: "100%",
      }}
    >
      <Box sx={{ width: "100%" }}>
        <MessageList messages={messages} />
      </Box>
      <Box sx={{ width: "80%" }}>
        <ChatInput onSend={handleSend} />
      </Box>
    </Box>
  );
}
