import { useState } from "react";
import { MessageSquare, Network } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChatSessionList } from "@/feature/chat-session-list";
import { ThreadTreePanel } from "@/feature/thread-branch-graph";
import { useChatSessionStore } from "@/stores/chat-session-store";

type SidebarTab = "sessions" | "branches";

export function AppSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("sessions");

  const activeSessionId = useChatSessionStore((state) => state.activeSessionId);

  return (
    <div className="flex h-full flex-col border-r border-divider bg-bg-default/80 backdrop-blur-xl">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SidebarTab)}>
        <TabsList className="shrink-0">
          <TabsTrigger value="sessions" className="flex-1 justify-center">
            <MessageSquare size={16} />
            会话
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex-1 justify-center">
            <Network size={16} />
            分支树
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-1 flex-col overflow-hidden">
          <TabsContent value="sessions" className="flex flex-col overflow-hidden" forceMount style={{ display: activeTab === "sessions" ? "flex" : "none" }}>
            <ChatSessionList />
          </TabsContent>

          <TabsContent value="branches" forceMount={false}>
            {typeof activeSessionId === "number" ? (
              <div className="flex-1 overflow-auto">
                <ThreadTreePanel chatSessionId={activeSessionId} />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <span className="text-xs text-text-disabled">请先选择一个会话</span>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
