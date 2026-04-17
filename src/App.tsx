import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "@/theme";
import { GlobalToast } from "@/components/common/global-toast";

const browserRouter = createBrowserRouter(router);

function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={browserRouter} />
      <GlobalToast />
    </ThemeProvider>
  );
}

export default App;
