// ==================枚举==================

// 线程类型
export enum ThreadType {
  /** 主线 */
  MAIN_LINE = 1,
  /** 支线 */
  SUB_LINE = 2,
}

// 线程状态
export enum ThreadStatus {
  NORMAL = 1,
  MERGED = 2,
}

// ==================业务数据模型==================
export interface Thread {
  id: number;
  chatSessionId: number;
  parentThreadId: number | null;
  threadType: ThreadType;
  status: ThreadStatus;
  title: string;
  forkFromMessageId: number | null;
  createAt: Date;
}
