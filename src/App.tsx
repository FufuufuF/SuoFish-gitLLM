import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { router } from "./router";

function App() {
  const bowserRouter = createBrowserRouter(router);
  return <RouterProvider router={bowserRouter} />;
}

export default App;
