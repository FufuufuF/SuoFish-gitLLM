import { apiClient } from "../core/client";
import type { ThreadIn } from "./thread";

/**
 * 会话列表接口
 */

// ===== 请求/响应类型 =====

export interface GetChatSessionListRequest {
  cursor?: string;
  limit?: number;
}

/**
 * API 层的 ChatSession 类型（后端返回格式）
 * 注意：与业务层 ChatSession 类型不同，此处使用 snake_case
 */
export interface ChatSession {
  id: number;
  title?: string;
  goal?: string;
  status: number;
  active_thread_id: number;
  create_at: Date;
  update_at: Date;
}

export interface GetChatSessionListResponse {
  items: ChatSession[];
  next_cursor?: string;
  has_more: boolean;
}

// ===== API 函数 =====

/**
 * 获取会话列表
 * 注意：返回原始 API 响应，数据转换由 Hook 层完成
 */
export async function getChatSessionList(request: GetChatSessionListRequest) {
  return apiClient.get<GetChatSessionListResponse>("/chat_sessions/", {
    params: request,
  });
}

// 注意：createChatSession 不在此处实现
// 会话创建是 chat API 的副作用，在发送第一条消息时自动完成

/**
 * 更新会话活跃线程接口
 */

// ===== 请求/响应类型 =====

export interface UpdateChatSessionActiveThreadRequest {
  active_thread_id: number;
}

export interface UpdateChatSessionActiveThreadResponse {
  active_thread: ThreadIn;
}

// ===== API 函数 =====

export async function updateChatSessionActiveThread(
  chat_session_id: number,
  active_thread_id: number,
) {
  return apiClient.patch<
    UpdateChatSessionActiveThreadResponse,
    UpdateChatSessionActiveThreadRequest
  >(`/chat_sessions/${chat_session_id}`, { active_thread_id });
}
