import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "@/theme";

// 移到模块顶层：避免每次 App 重渲染时重建 router 实例，防止整棵组件树卸载/重挂载
const browserRouter = createBrowserRouter(router);

function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={browserRouter} />
    </ThemeProvider>
  );
}

export default App;
