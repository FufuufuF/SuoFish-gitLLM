import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { AppSidebar } from "@/components/common/app-sidebar";
import { AppHeader } from "@/components/common/app-header";

export function RootLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* 左侧：Sidebar（业务组件） */}
      <Box
        sx={{
          width: sidebarCollapsed ? 0 : 480,
          flexShrink: 0,
          transition: "width 0.2s",
          overflow: "hidden",
        }}
      >
        <AppSidebar />
      </Box>

      {/* 右侧：Header + MainContentArea */}
      <Layout header={<AppHeader />} main={<Outlet />} />
    </Box>
  );
}
