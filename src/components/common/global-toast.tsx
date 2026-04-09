import { Alert, Snackbar } from "@mui/material";
import { useToastStore } from "@/stores/toast-store";

export function GlobalToast() {
  const toast = useToastStore((s) => s.toast);
  const closeToast = useToastStore((s) => s.closeToast);

  return (
    <Snackbar
      key={toast?.id ?? 0}
      open={toast?.open ?? false}
      autoHideDuration={4500}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        closeToast();
      }}
    >
      <Alert
        severity={toast?.severity ?? "info"}
        onClose={closeToast}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {toast?.message ?? ""}
      </Alert>
    </Snackbar>
  );
}