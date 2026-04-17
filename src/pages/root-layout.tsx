import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { AppSidebar } from "@/components/common/app-sidebar";
import { AppHeader } from "@/components/common/app-header";

export function RootLayout() {
  const [sidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      <div
        className="shrink-0 overflow-hidden transition-[width] duration-200"
        style={{ width: sidebarCollapsed ? 0 : 480 }}
      >
        <AppSidebar />
      </div>

      <Layout header={<AppHeader />} main={<Outlet />} />
    </div>
  );
}
