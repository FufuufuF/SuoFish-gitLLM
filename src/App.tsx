import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "@/theme";

function App() {
  const bowserRouter = createBrowserRouter(router);
  return (
    <ThemeProvider>
      <RouterProvider router={bowserRouter} />
    </ThemeProvider>
  );
}

export default App;
