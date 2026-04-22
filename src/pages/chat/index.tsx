import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { ChatInput, MessageItem, ThreadForkDivider } from "./components";
import {
  InfiniteVirtualList,
  type InfiniteVirtualListHandle,
} from "@/components/layout/infinite-virtual-list";
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

  const parsedUrlSessionId = urlSessionId ? Number(urlSessionId) : null;
  const isValidUrlSession =
    parsedUrlSessionId !== null && Number.isFinite(parsedUrlSessionId);

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

  const {
    messages,
    sendMessage,
    fetchMoreMessages,
    cancelStreaming,
    isStreaming,
  } = useMessage(activeThreadId);
  const listRef = useRef<InfiniteVirtualListHandle>(null);
  const isAnyStreaming = isStreaming || isFirstMessageStreaming;

  const handleStopGeneration = () => {
    cancelStreaming();
    cancelFirstMessageStreaming();
  };

  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [mergeDrawerOpen, setMergeDrawerOpen] = useState(false);

  const mergePhase = useMergeStore((s) => s.mergePhase);
  const isMerging = mergePhase !== "idle" && mergePhase !== "success";

  useEffect(() => {
    if (mergePhase === "previewing") {
      setMergeDrawerOpen(true);
    }
  }, [mergePhase]);

  useEffect(() => {
    if (mergePhase === "success") {
      setMergeDrawerOpen(false);
      useMergeStore.getState().reset();
    }
  }, [mergePhase]);

  useLayoutEffect(() => {
    if (isValidUrlSession) {
      setActiveSessionId(parsedUrlSessionId);
    }
  }, [isValidUrlSession, parsedUrlSessionId, setActiveSessionId]);

  const firstCurrentIdx = useMemo(() => {
    if (activeThreadId === null || messages.length === 0) return -1;
    return messages.findIndex(
      (msg) => msg.threadId !== null && msg.threadId === activeThreadId,
    );
  }, [messages, activeThreadId]);

  const isAllAncestor = activeThreadId !== null && firstCurrentIdx === -1;
  const showDivider = isAllAncestor || firstCurrentIdx > 0;

  const handleSend = async (content: string) => {
    if (isNewSessionMode) {
      await sendFirstMessage(content);
    } else {
      await sendMessage(content, activeSessionId as number);
    }
    listRef.current?.scrollToBottom("smooth");
  };

  const handleForkConfirm = async (title: string) => {
    await forkThread(title);
  };

  const handleMerge = async () => {
    await previewMerge();
  };

  return (
    <div className="flex h-full w-full flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col items-center p-8 transition-all duration-300 ease-in-out">
        <InfiniteVirtualList
          ref={listRef}
          key={activeThreadId ?? "new"}
          items={messages}
          getItemKey={(msg: Message) => msg.id}
          fetchMore={fetchMoreMessages}
          estimateSize={120}
          overscan={5}
          direction="up"
          initialAnchor="end"
          isEmpty={messages.length === 0}
          className="min-h-0 w-full flex-1"
          listClassName="py-4"
          renderItem={(message: Message, index: number) => {
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
        <div className="w-4/5 shrink-0">
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
        </div>
      </div>

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
    </div>
  );
}
