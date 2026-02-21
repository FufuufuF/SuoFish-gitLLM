import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { ChatInput, MessageList } from "./components";
import { ThreadForkDialog } from "@/components/common/thread-fork-dialog";
import { useMessage } from "../../hooks/use-message";
import { useChatOrchestrator } from "./hooks/use-chat-orchestrator";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useThread } from "@/hooks/use-thread";
import { useThreadStore } from "@/stores/thread-store";

export function ChatPage() {
  const { chatSessionId: urlSessionId } = useParams<{
    chatSessionId?: string;
  }>();
  const { sendFirstMessage } = useChatOrchestrator();

  // ----- Session 状态 -----
  const parsedUrlSessionId = urlSessionId ? Number(urlSessionId) : null;
  const isValidUrlSession =
    parsedUrlSessionId !== null && Number.isFinite(parsedUrlSessionId);

  // 精确订阅：只在 activeSessionId 或 匹配的 session 自身变化时才重渲染
  const activeSessionId = useChatSessionStore((s) => s.activeSessionId);
  const setActiveSessionId = useChatSessionStore.getState().setActiveSessionId;

  const sessionKey = isValidUrlSession ? parsedUrlSessionId : activeSessionId;
  const isNewSessionMode = !sessionKey;

  const { activeThreadId, isForkDisabled, forkThread } = useThread();

  // ----- 父线程标题（用于分叉点分隔栏） -----
  const parentThreadTitle = useMemo(() => {
    if (!activeSessionId || typeof activeSessionId === "string")
      return undefined;
    const threads =
      useThreadStore.getState().threadsByChatSessionId[
        activeSessionId as number
      ] ?? [];
    const currentThread = threads.find((t) => t.id === activeThreadId);
    if (!currentThread?.parentThreadId) return undefined;
    const parentThread = threads.find(
      (t) => t.id === currentThread.parentThreadId,
    );
    return parentThread?.title;
  }, [activeSessionId, activeThreadId]);

  // ----- Message Hook -----
  const { messages, sendMessage, fetchMessages } = useMessage(activeThreadId);

  const [forkDialogOpen, setForkDialogOpen] = useState(false);

  // ----- 同步 URL chatSessionId → store（用于侧边栏高亮） -----
  useLayoutEffect(() => {
    if (isValidUrlSession) {
      setActiveSessionId(parsedUrlSessionId);
    }
  }, [isValidUrlSession, parsedUrlSessionId, setActiveSessionId]);

  // ----- 切换到已有会话时拉取历史消息 -----
  useEffect(() => {
    if (isValidUrlSession && activeThreadId) {
      fetchMessages();
    }
  }, [isValidUrlSession, activeThreadId, fetchMessages]);

  // ----- 消息发送 -----
  const handleSend = async (content: string) => {
    if (isNewSessionMode) {
      await sendFirstMessage(content);
    } else {
      await sendMessage(content, activeSessionId as number);
    }
  };

  // ----- Fork 确认 -----
  const handleForkConfirm = async (title: string) => {
    await forkThread(title);
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: 4,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: 1, width: "100%", overflowY: "auto", minHeight: 0 }}>
        <MessageList
          messages={messages}
          activeThreadId={activeThreadId}
          parentThreadTitle={parentThreadTitle}
        />
      </Box>
      <Box sx={{ width: "80%", flexShrink: 0 }}>
        <ChatInput
          onSend={handleSend}
          onFork={() => setForkDialogOpen(true)}
          forkDisabled={isForkDisabled}
        />
      </Box>

      <ThreadForkDialog
        open={forkDialogOpen}
        onClose={() => setForkDialogOpen(false)}
        onConfirm={handleForkConfirm}
      />
    </Box>
  );
}
