import { apiClient } from "../core/client";
import type { ChatMessage } from "./message";

export interface ChatRequest {
  chat_session_id: number;
  thread_id: number;
  content: string;
}

export interface ChatResponse {
  chat_session_id: number;
  thread_id: number;
  human_message: ChatMessage;
  ai_message: ChatMessage;
}

/**
 * 发送聊天消息
 * 注意：返回原始 API 响应，数据转换由 hook 层完成
 */
export const chat = async (request: ChatRequest): Promise<ChatResponse> => {
  return apiClient.post<ChatResponse, ChatRequest>("/chat/", request);
};
