"use client";

import { useState } from "react";
import SidebarNav from "@/components/SidebarNav";
import TopBar from "@/components/TopBar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen overflow-hidden print:h-auto print:overflow-visible bg-slate-50 dark:bg-slate-900 flex">
      <SidebarNav collapsed={collapsed} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:overflow-visible">
        <TopBar collapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-hidden print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
