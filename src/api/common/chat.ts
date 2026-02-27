import { apiClient } from "../core/client";
import type { MessageIn } from "./message";

export interface ChatRequest {
  chat_session_id: number;
  thread_id: number;
  content: string;
}

export interface ChatResponse {
  chat_session_id: number;
  thread_id: number;
  human_message: MessageIn;
  ai_message: MessageIn;
}

/**
 * 发送聊天消息
 * 注意：返回原始 API 响应，数据转换由 hook 层完成
 */
export const chat = async (request: ChatRequest): Promise<ChatResponse> => {
  return apiClient.post<ChatResponse, ChatRequest>("/chat/", request);
};

// ======================== 流式 ==========================
export enum ChatStreamEventType {
  HUMAN_MESSAGE_CREATED = "human_message_created",
  CHAT_SESSION_UPDATED = "chat_session_updated",
  TOKEN = "token",
  AI_MESSAGE_CREATED = "ai_message_created",
  ERROR = "error",
}

export interface HumanMessageCreatedPayload {
  chat_session_id: number;
  thread_id: number;
  message: MessageIn;
}

export interface ChatSessionUpdatedPayload {
  chat_session_id: number;
  title: string | null;
}

export interface AIMessageCreatedPayload {
  chat_session_id: number;
  thread_id: number;
  message: MessageIn;
}

/** 解析后的 SSE 事件联合类型 */
export type ChatStreamEvent =
  | { type: ChatStreamEventType.HUMAN_MESSAGE_CREATED; data: HumanMessageCreatedPayload }
  | { type: ChatStreamEventType.CHAT_SESSION_UPDATED; data: ChatSessionUpdatedPayload }
  | { type: ChatStreamEventType.TOKEN; data: { content: string } }
  | { type: ChatStreamEventType.AI_MESSAGE_CREATED; data: AIMessageCreatedPayload }
  | { type: ChatStreamEventType.ERROR; data: { code: number; message: string } };

export async function* chatStream(request: ChatRequest): AsyncGenerator<ChatStreamEvent, void, unknown> {
    const sseGenerator = apiClient.postSSE<ChatStreamEvent, ChatRequest>("/chat/stream/", request);
    for await (const event of sseGenerator) {
        yield event;
    }
}
