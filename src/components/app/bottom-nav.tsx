"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp, type TabName } from "./app-provider";
import { LayoutGrid, Stamp, Bell, PieChart, Menu } from "lucide-react";

export function BottomNav({ onMore }: { onMore: () => void }) {
  const { activeTab, setTab, pendingCount, unreadCount, route } = useApp();

  const items: { key: TabName; label: string; icon: any; badge?: number }[] = [
    { key: "dashboard", label: "Home", icon: LayoutGrid },
    { key: "approvals", label: "Approvals", icon: Stamp, badge: pendingCount },
    { key: "notifications", label: "Alerts", icon: Bell, badge: unreadCount },
    { key: "reports", label: "Reports", icon: PieChart },
  ];

  return (
    <nav className="relative z-20 shrink-0 border-t border-border/60 bg-card/90 backdrop-blur-xl">
      <div className="flex items-stretch px-1.5 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
        {items.map((it) => {
          const active = activeTab === it.key && route.screen === it.key;
          return (
            <button
              key={it.key}
              onClick={() => setTab(it.key)}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition active:scale-95"
            >
              <span className="relative">
                <it.icon
                  className={cn(
                    "size-[22px] transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.4 : 1.9}
                />
                {!!it.badge && it.badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-card">
                    {it.badge > 9 ? "9+" : it.badge}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-wide transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {it.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onMore}
          className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition active:scale-95"
        >
          <Menu className="size-[22px] text-muted-foreground" strokeWidth={1.9} />
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">More</span>
        </button>
      </div>
    </nav>
  );
}
