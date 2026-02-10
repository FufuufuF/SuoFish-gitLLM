export type ChatSessionStatus = "pending" | "creating" | "active" | "error";

export interface ChatSession {
  id?: number; // 后端真实 ID（新建时为空）
  tempId?: string; // 前端临时 ID（用于乐观更新）
  title?: string; // 会话标题（首次对话后由 AI 生成）
  goal?: string;
  status: ChatSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}
