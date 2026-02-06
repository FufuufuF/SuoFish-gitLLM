import { apiClient } from "@/api";
import type { MessageRole, Message } from "@/types";

export interface ChatRequest {
  chat_session_id: number;
  thread_id: number;
  content: string;
}

export interface ChatMessage {
  id: number;
  content: string;
  create_at: Date;
}

export interface ChatResponse {
  chat_session_id: number;
  thread_id: number;
  human_message: ChatMessage;
  ai_message: ChatMessage;
}

const mapChatMessageToMessage = (
  chatMsg: ChatMessage,
  role: MessageRole,
): Message => ({
  id: chatMsg.id,
  role,
  content: chatMsg.content,
  timestamp: chatMsg.create_at,
});

export const chat = async (request: ChatRequest): Promise<Message[]> => {
  const response = await apiClient.post<ChatResponse, ChatRequest>(
    "/chat/",
    request,
  );
  return [
    mapChatMessageToMessage(response.human_message, 0),
    mapChatMessageToMessage(response.ai_message, 1),
  ];
};
