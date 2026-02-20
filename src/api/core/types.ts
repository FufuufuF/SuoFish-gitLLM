export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export enum PageDirection {
  BEFORE = "BEFORE",
  AFTER = "AFTER",
}

// 分页请求查询参数
export interface PageRequest {
  direction: PageDirection;
  limit: number;
  cursor?: number;
}

export interface PageResponse {
  next_cursor: number;
  has_more: boolean;
}
