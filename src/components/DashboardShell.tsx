"use client";

import { useState } from "react";
import SidebarNav from "@/components/SidebarNav";
import TopBar from "@/components/TopBar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <SidebarNav collapsed={collapsed} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar collapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
