export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export enum PageDirection {
  BEFORE = "before",
  AFTER = "after",
}

// 分页请求查询参数
export interface PageRequest {
  direction: PageDirection;
  limit: number;
  cursor?: string;
}

export interface PageResponse {
  next_cursor: string;
  has_more: boolean;
}

// SSE类型
export interface SseEvent<T> {
  type: string;
  data: T;
}

export interface PostSseOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
}
