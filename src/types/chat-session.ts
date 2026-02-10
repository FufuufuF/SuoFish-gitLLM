export type ChatSessionStatus = "pending" | "creating" | "active" | "error";

export interface ChatSession {
  id: number;
  tempId?: string; // 前端临时 ID（用于乐观更新）
  title?: string; // 会话标题（首次对话后由 AI 生成）
  goal?: string;
  activeThreadId: number;
  status: ChatSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}
