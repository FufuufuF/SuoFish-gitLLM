import type { AlertColor } from "@mui/material/Alert";
import { create } from "zustand";

interface ToastState {
  id: number;
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface ToastStore {
  toast: ToastState | null;
  showToast: (message: string, severity?: AlertColor) => void;
  showError: (message: string) => void;
  closeToast: () => void;
}

let toastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toast: null,

  showToast: (message, severity = "info") =>
    set({
      toast: {
        id: ++toastId,
        open: true,
        message,
        severity,
      },
    }),

  showError: (message) =>
    set({
      toast: {
        id: ++toastId,
        open: true,
        message,
        severity: "error",
      },
    }),

  closeToast: () =>
    set((state) => ({
      toast: state.toast ? { ...state.toast, open: false } : null,
    })),
}));