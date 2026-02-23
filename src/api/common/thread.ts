import { apiClient } from "../core/client";
import type { MessageIn } from "./message";

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

// ========= Thread List 接口 =========

export interface ThreadListRequest {
  chat_session_id: number;
}

export interface ThreadListResponse {
  threads: ThreadIn[];
}

export async function getThreadList(params: ThreadListRequest) {
  return apiClient.get<ThreadListResponse>(
    `/threads/${params.chat_session_id}/list`,
  );
}

// ========= merge 接口 =========

// preview

export interface MergePreviewRequest {
  thread_id: number;
}

export interface MergePreviewResponse {
  thread_id: number;
  target_thread_id: number;
  brief_content: string;
}

export function mergePreview(request: MergePreviewRequest) {
  return apiClient.post<MergePreviewResponse, null>(
    `/threads/${request.thread_id}/merge/preview`,
    null,
  );
}

// confirm

export interface MergeConfirmRequest {
  thread_id: number;
  brief_content: string;
}

export interface MergeConfirmResponse {
  merged_thread: ThreadIn;
  target_thread: ThreadIn;
  brief_message: MessageIn;
}

export function mergeConfirm(request: MergeConfirmRequest) {
  return apiClient.post<MergeConfirmResponse, Partial<MergeConfirmRequest>>(
    `/threads/${request.thread_id}/merge/confirm`,
    {
      brief_content: request.brief_content,
    },
  );
}
