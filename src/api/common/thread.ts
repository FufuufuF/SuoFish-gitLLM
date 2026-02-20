import { apiClient } from "../core/client";

export interface ThreadIn {
  id: number;
  chat_session_id: number;
  parent_thread_id: number;
  thread_type: number;
  status: number;
  title: string;
  fork_from_message_id: number;
  create_at: string;
}

// ========= fork 接口 =========

export interface ForkThreadRequest {
  chat_session_id: number;
  parent_thread_id: number;
  title: string | null;
}

export interface ForkThreadResponse {
  thread: ThreadIn;
}

export async function forkThread(request: ForkThreadRequest) {
  return apiClient.post<ForkThreadResponse, ForkThreadRequest>(
    "/threads/fork",
    request,
  );
}
