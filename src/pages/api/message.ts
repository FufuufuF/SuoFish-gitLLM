import { apiClient } from "@/api";

export interface ChatMessage {
  id: number;
  content: string;
  create_at: Date;
  role: number;
}

export interface MessageRequest {
  chat_session_id: number;
  thread_id: number;
  page: number;
  page_size: number;
}

export interface MessageResponse {
  messages: ChatMessage[];
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
}

export const getMessage = async (request: MessageRequest) => {
  const response = await apiClient.post<MessageResponse, MessageRequest>(
    "/message/",
    request,
  );
  return response;
};
