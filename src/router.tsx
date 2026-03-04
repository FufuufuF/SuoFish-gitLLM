import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { FullPageSkeleton } from "@/components/skeletons";
import { ChatPageSkeleton } from "@/components/skeletons";

// 路由级代码分割：将大型页面组件懒加载，降低主 bundle 体积
const RootLayout = lazy(() =>
  import("@/pages/root-layout").then((m) => ({ default: m.RootLayout })),
);
const ChatPage = lazy(() =>
  import("@/pages/chat").then((m) => ({ default: m.ChatPage })),
);

export const router: RouteObject[] = [
  {
    path: "/",
    element: (
      <Suspense fallback={<FullPageSkeleton />}>
        <RootLayout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/chat" replace />,
      },
      {
        path: "chat/:chatSessionId?",
        element: (
          <Suspense fallback={<ChatPageSkeleton />}>
            <ChatPage />
          </Suspense>
        ),
      },
    ],
  },
];
