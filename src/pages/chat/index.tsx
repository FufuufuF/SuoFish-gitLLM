import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { ChatInput, MessageItem, ThreadForkDivider } from "./components";
import {
  UpwardInfiniteList,
  type UpwardInfiniteListHandle,
} from "@/components/layout/pagination";
import { VirtualList, type VirtualListHandle } from "@/components/layout/virtual-list";
import { ThreadForkDialog } from "@/components/common/thread-fork-dialog";
import { ThreadMergeDrawer } from "@/feature/thread-branch-graph/components/thread-merge-drawer";
import { useMessage } from "../../hooks/use-message";
import { useChatOrchestrator } from "./hooks/use-chat-orchestrator";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useMergeStore } from "@/stores/merge-store";
import { useThread } from "@/hooks/use-thread";
import { useThreadStore } from "@/stores/thread-store";
import type { Message } from "@/types";

export function ChatPage() {
  const { chatSessionId: urlSessionId } = useParams<{
    chatSessionId?: string;
  }>();
  const {
    sendFirstMessage,
    cancelStreaming: cancelFirstMessageStreaming,
    isStreaming: isFirstMessageStreaming,
  } = useChatOrchestrator();

  // ----- Session 状态 -----
  const parsedUrlSessionId = urlSessionId ? Number(urlSessionId) : null;
  const isValidUrlSession =
    parsedUrlSessionId !== null && Number.isFinite(parsedUrlSessionId);

  // 精确订阅：只在 activeSessionId 或 匹配的 session 自身变化时才重渲染
  const activeSessionId = useChatSessionStore((s) => s.activeSessionId);
  const setActiveSessionId = useChatSessionStore.getState().setActiveSessionId;

  const sessionKey = isValidUrlSession ? parsedUrlSessionId : activeSessionId;
  const isNewSessionMode = !sessionKey;

  const {
    activeThreadId,
    isForkDisabled,
    isMergeDisabled,
    isThreadStatusNormal,
    forkThread,
    previewMerge,
    confirmMerge,
  } = useThread();

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
  const {
    messages,
    sendMessage,
    fetchMoreMessages,
    cancelStreaming,
    isStreaming,
  } = useMessage(activeThreadId);
  const listRef = useRef<UpwardInfiniteListHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualListRef = useRef<VirtualListHandle>(null);
  const isAnyStreaming = isStreaming || isFirstMessageStreaming;

  const handleStopGeneration = () => {
    cancelStreaming();
    cancelFirstMessageStreaming();
  };

  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [mergeDrawerOpen, setMergeDrawerOpen] = useState(false);

  // ----- Merge 流程状态 -----
  const mergePhase = useMergeStore((s) => s.mergePhase);
  const isMerging = mergePhase !== "idle" && mergePhase !== "success";

  // 自动弹出：进入 previewing 阶段时打开 Drawer
  useEffect(() => {
    if (mergePhase === "previewing") {
      setMergeDrawerOpen(true);
    }
  }, [mergePhase]);

  // 自动关闭：成功后关闭 Drawer 并重置
  useEffect(() => {
    if (mergePhase === "success") {
      setMergeDrawerOpen(false);
      useMergeStore.getState().reset();
    }
  }, [mergePhase]);

  // ----- 同步 URL chatSessionId → store（用于侧边栏高亮） -----
  useLayoutEffect(() => {
    if (isValidUrlSession) {
      setActiveSessionId(parsedUrlSessionId);
    }
  }, [isValidUrlSession, parsedUrlSessionId, setActiveSessionId]);

  // ----- 分叉点分隔栏逻辑（从 MessageList 迁入）-----
  const firstCurrentIdx = useMemo(() => {
    if (activeThreadId === null || messages.length === 0) return -1;
    return messages.findIndex(
      (msg) => msg.threadId !== null && msg.threadId === activeThreadId,
    );
  }, [messages, activeThreadId]);

  const isAllAncestor = activeThreadId !== null && firstCurrentIdx === -1;
  const showDivider = isAllAncestor || firstCurrentIdx > 0;

  // ----- 消息发送 -----
  const handleSend = async (content: string) => {
    if (isNewSessionMode) {
      await sendFirstMessage(content);
    } else {
      await sendMessage(content, activeSessionId as number);
    }
    listRef.current?.scrollToBottom("smooth");
  };

  // ----- Fork 确认 -----
  const handleForkConfirm = async (title: string) => {
    await forkThread(title);
  };

  // ----- Merge -----
  const handleMerge = async () => {
    await previewMerge();
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* 左侧：聊天主区域 */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: 4,
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        <UpwardInfiniteList
          ref={listRef}
          containerRef={scrollRef}
          key={activeThreadId ?? "new"}
          fetchMore={fetchMoreMessages}
          isEmpty={messages.length === 0}
          manageScroll={false}
          sx={{ flex: 1, minHeight: 0, width: "100%" }}
        >
          <VirtualList
            ref={virtualListRef}
            scrollContainerRef={scrollRef}
            items={messages}
            getItemKey={(msg: Message) => msg.id}
            estimatedItemHeight={120}
            overscan={5}
            initialAnchor="end"
            sx={{ py: 2 }}
            renderItem={(message: Message, index: number) => {
            //   console.log("Rendering message:", message);
              const isAncestor =
                isAllAncestor || (firstCurrentIdx > 0 && index < firstCurrentIdx);
              return (
                <>
                  {showDivider && !isAllAncestor && index === firstCurrentIdx && (
                    <ThreadForkDivider parentThreadTitle={parentThreadTitle} />
                  )}
                  <MessageItem message={message} isAncestor={isAncestor} />
                  {showDivider && isAllAncestor && index === messages.length - 1 && (
                    <ThreadForkDivider parentThreadTitle={parentThreadTitle} />
                  )}
                </>
              );
            }}
          />
        </UpwardInfiniteList>
        <Box sx={{ width: "80%", flexShrink: 0 }}>
          <ChatInput
            onSend={handleSend}
            onStopGeneration={handleStopGeneration}
            onFork={() => setForkDialogOpen(true)}
            onMerge={handleMerge}
            forkDisabled={isForkDisabled}
            mergeDisabled={isMergeDisabled}
            isMerging={isMerging}
            isMerged={!isThreadStatusNormal}
            isStreaming={isAnyStreaming}
          />
        </Box>
      </Box>

      {/* 右侧：合并 Drawer */}
      <ThreadMergeDrawer
        open={mergeDrawerOpen}
        onClose={() => {
          setMergeDrawerOpen(false);
          useMergeStore.getState().reset();
        }}
        onConfirm={confirmMerge}
      />

      <ThreadForkDialog
        open={forkDialogOpen}
        onClose={() => setForkDialogOpen(false)}
        onConfirm={handleForkConfirm}
      />
    </Box>
  );
}
