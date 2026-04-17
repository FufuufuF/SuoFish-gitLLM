import { Toaster } from "sonner";
import { useThemeMode } from "@/theme";

export function GlobalToast() {
  const { mode } = useThemeMode();

  return (
    <Toaster
      theme={mode}
      position="top-center"
      richColors
      toastOptions={{
        style: {
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}
