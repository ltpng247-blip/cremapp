"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { AppHeader } from "@/components/app/app-header";
import { Money, SectionLabel } from "@/components/app/primitives";
import { isApprovedToday, sumValue } from "@/lib/filters";
import type { PendingItem } from "@/lib/types";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarRange,
  Clock,
  Gem,
  PieChart,
  Receipt,
  ShieldAlert,
} from "lucide-react";

const REPORTS = [
  { type: "daily", title: "Daily approvals", icon: CalendarDays, tone: "primary" },
  { type: "weekly", title: "Weekly financial", icon: CalendarRange, tone: "info" },
  { type: "department", title: "Dept expenditure", icon: Building2, tone: "gold" },
  { type: "highvalue", title: "High-value", icon: Gem, tone: "gold" },
  { type: "ageing", title: "Pending ageing", icon: Clock, tone: "warning" },
  { type: "budget", title: "Budget utilisation", icon: PieChart, tone: "success" },
  { type: "payment", title: "Payment status", icon: Receipt, tone: "info" },
  { type: "audit", title: "Audit exceptions", icon: ShieldAlert, tone: "destructive" },
];

const TONE: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/12 text-info",
  gold: "bg-gold/15 text-gold",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/12 text-success",
  destructive: "bg-destructive/12 text-destructive",
};

export function ReportsScreen() {
  const { pendingFF3, pendingFF4, recentFF3, recentFF4, nav, back, canGoBack } = useApp();

  const pending: PendingItem[] = React.useMemo(() => [...pendingFF3, ...pendingFF4], [pendingFF3, pendingFF4]);
  const decided: PendingItem[] = React.useMemo(() => [...recentFF3, ...recentFF4], [recentFF3, recentFF4]);

  const approvedToday = decided.filter((d) => d.status === "APPROVED" && isApprovedToday((d as any).approved_date));
  const week = React.useMemo(() => buildWeek(decided), [decided]);
  const maxWeek = Math.max(1, ...week.map((w) => w.count));

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Reports"
        subtitle="Executive summaries"
        onBack={canGoBack ? back : undefined}
        leading={!canGoBack ? <div className="grid size-10 place-items-center"><PieChart className="size-5 text-primary" /></div> : undefined}
      />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 pt-3">
        {/* weekly chart */}
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="size-3.5" /> Approvals this week
            </span>
            <span className="text-[12px] font-semibold text-foreground">{week.reduce((s, w) => s + w.count, 0)} total</span>
          </div>
          <div className="mt-4 flex h-28 items-end justify-between gap-2">
            {week.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn("w-full rounded-t-md transition-all duration-700", w.today ? "bg-gold" : "bg-primary/70")}
                    style={{ height: `${(w.count / maxWeek) * 100}%`, minHeight: w.count ? 6 : 2 }}
                  />
                </div>
                <span className={cn("text-[10px]", w.today ? "font-bold text-foreground" : "text-muted-foreground")}>{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* today summary */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-border/70 bg-card p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Approved today</p>
            <p className="font-display text-2xl text-success">{approvedToday.length}</p>
            <Money value={sumValue(approvedToday)} compact className="text-[12px] text-muted-foreground" />
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Still pending</p>
            <p className="font-display text-2xl text-warning">{pending.length}</p>
            <Money value={sumValue(pending)} compact className="text-[12px] text-muted-foreground" />
          </div>
        </div>

        <SectionLabel className="mt-6 px-1">All reports</SectionLabel>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {REPORTS.map((r) => (
            <button
              key={r.type}
              onClick={() => nav("report", { type: r.type, title: r.title })}
              className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3 text-left transition active:scale-[0.98]"
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", TONE[r.tone])}>
                <r.icon className="size-[18px]" />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-foreground">{r.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildWeek(decided: PendingItem[]) {
  const days: { label: string; count: number; today: boolean }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const label = d.toLocaleDateString("en-GB", { weekday: "short" })[0];
    const count = decided.filter((x) => {
      const ad = (x as any).approved_date;
      if (!ad || x.status !== "APPROVED") return false;
      const a = new Date(ad);
      return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth() && a.getDate() === d.getDate();
    }).length;
    days.push({ label, count, today: i === 0 });
  }
  return days;
}
