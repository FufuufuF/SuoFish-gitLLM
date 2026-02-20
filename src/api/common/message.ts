import { apiClient } from "../core/client";
import type { PageRequest, PageResponse } from "../core/types";

export interface MessageIn {
  id: number;
  role: number;
  type: number;
  content: string;
  thread_id: number;
  create_at: Date;
}

export interface MessageRequest extends PageRequest {
  thread_id: number;
}

export interface MessageResponse extends PageResponse {
  messages: MessageIn[];
}

export const getMessageList = (params: MessageRequest) => {
  return apiClient.get<MessageResponse>(
    `/threads/${params.thread_id}/context-messages`,
    { params },
  );
};
