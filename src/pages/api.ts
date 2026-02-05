import { apiClient } from "@/api";

export interface ChatRequest {
  chat_session_id: number;
  thread_id: number;
  content: string;
}

export interface ChatResponse {
  human_message_id: number;
  ai_message_id: number;
  chat_session_id: number;
  thread_id: number;
  human_message: string;
  ai_message: string;
}

export const chat = async (request: ChatRequest) => {
  const response = await apiClient.post<ChatResponse, ChatRequest>(
    "/chat",
    request,
  );
  return response;
};
