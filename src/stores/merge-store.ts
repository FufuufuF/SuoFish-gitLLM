import { create } from "zustand";

export type MergePhase =
  | "idle"
  | "previewing"
  | "confirming"
  | "success"
  | "error";

export interface MergeStore {
  // ── 流程状态 ──────────────────────────────────────────────
  /** 当前正在合并的分支 ID（null 表示未触发） */
  mergingThreadId: number | null;
  /** 合并流程阶段 */
  mergePhase: MergePhase;

  // ── Preview 数据 ──────────────────────────────────────────
  /** Preview 接口返回的目标父线程 ID */
  targetThreadId: number | null;
  /** LLM 生成的简报内容（用户可编辑） */
  briefContent: string;

  // ── 错误状态 ──────────────────────────────────────────────
  errorMessage: string | null;

  // ── Actions ──────────────────────────────────────────────
  startPreview: (threadId: number) => void;
  setPreviewData: (targetThreadId: number, briefContent: string) => void;
  updateBriefContent: (content: string) => void;
  startConfirm: () => void;
  setSuccess: () => void;
  setError: (message: string) => void;
  reset: () => void;
}

const initialState = {
  mergingThreadId: null,
  mergePhase: "idle" as MergePhase,
  targetThreadId: null,
  briefContent: "",
  errorMessage: null,
};

export const useMergeStore = create<MergeStore>((set) => ({
  ...initialState,

  startPreview: (threadId) =>
    set({
      mergingThreadId: threadId,
      mergePhase: "previewing",
      errorMessage: null,
    }),

  setPreviewData: (targetThreadId, briefContent) =>
    set({ targetThreadId, briefContent }),

  updateBriefContent: (content) => set({ briefContent: content }),

  startConfirm: () => set({ mergePhase: "confirming", errorMessage: null }),

  setSuccess: () => set({ mergePhase: "success" }),

  setError: (message) => set({ mergePhase: "error", errorMessage: message }),

  reset: () => set(initialState),
}));
