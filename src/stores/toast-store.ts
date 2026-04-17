import { create } from "zustand";
import { toast } from "sonner";

type ToastSeverity = "success" | "error" | "warning" | "info";

interface ToastStore {
  showToast: (message: string, severity?: ToastSeverity) => void;
  showError: (message: string) => void;
}

export const useToastStore = create<ToastStore>(() => ({
  showToast: (message, severity = "info") => {
    switch (severity) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "warning":
        toast.warning(message);
        break;
      case "info":
        toast.info(message);
        break;
    }
  },

  showError: (message) => {
    toast.error(message);
  },
}));
