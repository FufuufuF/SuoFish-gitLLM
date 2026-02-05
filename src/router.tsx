import type { RouteObject } from "react-router-dom";
import { ChatPage } from "@/pages/chat";
import { RootLayout } from "@/pages/root-layout";

export const router: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <ChatPage />,
      },
    ],
  },
];
