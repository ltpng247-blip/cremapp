"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { IconButton } from "@/components/app/app-header";
import { ApprovalCard } from "@/components/app/approval-card";
import { Money, InitialsAvatar, SectionLabel, EmptyState } from "@/components/app/primitives";
import {
  greeting,
  isApprovedToday,
  isCritical,
  isOverdue,
  isUrgent,
  sumValue,
} from "@/lib/filters";
import { kinaCompact, relativeTime } from "@/lib/format";
import type { PendingItem } from "@/lib/types";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Gem,
  Receipt,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  WifiOff,
} from "lucide-react";

export function DashboardScreen() {
  const {
    registrar, pendingFF3, pendingFF4, recentFF3, recentFF4,
    nav, setTab, refreshAll, dataLoading, lastSync, online, unreadCount,
  } = useApp();

  const pending: PendingItem[] = React.useMemo(
    () => [...pendingFF3, ...pendingFF4].sort(byPriority),
    [pendingFF3, pendingFF4],
  );
  const pendingValue = sumValue(pending);

  const urgentCount = pending.filter((i) => isUrgent(i.urgency_level)).length;
  const highValueCount = pending.filter((i) => i.highValue).length;
  const overdueCount = pending.filter((i) => isOverdue(i.submitted_date)).length;

  const approvedToday = [
    ...recentFF3.filter((f) => f.status === "APPROVED" && isApprovedToday(f.approved_date)),
    ...recentFF4.filter((f) => f.status === "APPROVED" && isApprovedToday(f.approved_date)),
  ];
  const approvedTodayValue = sumValue(approvedToday as PendingItem[]);

  const budgetAlerts = pendingFF3.filter((f) => !f.is_within_budget);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-8">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-muted-foreground">{greeting()}, {dateStr}</p>
            <h1 className="mt-0.5 font-display text-[26px] leading-tight text-foreground">
              {registrar?.name?.split(" ")?.slice(-1)[0] ? `Registrar ${registrar?.name?.split(" ").slice(-1)[0]}` : "Registrar"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <IconButton onClick={() => refreshAll()} label="Sync">
              <RefreshCw className={cn("size-[18px]", dataLoading && "animate-spin")} />
            </IconButton>
            <button onClick={() => nav("profile")} className="ml-1 transition active:scale-90">
              <InitialsAvatar name={registrar?.name ?? "R"} className="size-10 text-sm ring-2 ring-border" />
            </button>
          </div>
        </div>

        {!online && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2 text-[12px] font-medium text-warning">
            <WifiOff className="size-3.5" /> Offline — showing cached approvals. Actions will sync on reconnect.
          </div>
        )}

        {/* Hero */}
        <div className="px-5 pt-4">
          <button
            onClick={() => setTab("approvals")}
            className="grain relative w-full overflow-hidden rounded-3xl bg-[hsl(224_58%_15%)] p-5 text-left text-white shadow-lg transition active:scale-[0.99]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{ backgroundImage: "radial-gradient(90% 120% at 100% 0%, hsl(36 52% 40% / 0.35), transparent 55%)" }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                  <ShieldCheck className="size-3.5 text-gold" /> Awaiting your approval
                </span>
                {overdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-1 text-[10px] font-bold">
                    <TriangleAlert className="size-3" /> {overdueCount} overdue
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-end gap-3">
                <span className="font-display text-6xl leading-none">{pending.length}</span>
                <span className="mb-1.5 text-sm text-white/65">
                  {pendingFF3.length} FF3 · {pendingFF4.length} FF4
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/45">Total pending value</p>
                  <Money value={pendingValue} className="font-display text-xl text-gold" />
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/85">
                  Review now <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2.5 px-5 pt-4">
          <Metric label="FF3" value={pendingFF3.length} icon={FileText} tone="primary" onClick={() => nav("approvals", { seg: "FF3" })} />
          <Metric label="FF4" value={pendingFF4.length} icon={Receipt} tone="info" onClick={() => nav("approvals", { seg: "FF4" })} />
          <Metric label="Urgent" value={urgentCount} icon={TriangleAlert} tone="warning" onClick={() => nav("approvals", { filter: "URGENT" })} />
          <Metric label="High value" value={highValueCount} icon={Gem} tone="gold" onClick={() => nav("approvals", { filter: "HIGH_VALUE" })} />
          <Metric label="Overdue" value={overdueCount} icon={Clock} tone="destructive" onClick={() => nav("approvals", { filter: "OVERDUE" })} />
          <Metric label="Done today" value={approvedToday.length} icon={CheckCircle2} tone="success" onClick={() => nav("reports")} />
        </div>

        {/* Value summary */}
        <div className="mx-5 mt-4 grid grid-cols-2 gap-2.5">
          <ValueTile label="Pending value" value={pendingValue} tone="warning" />
          <ValueTile label="Approved today" value={approvedTodayValue} tone="success" />
        </div>

        {/* Budget alerts */}
        <div className="mt-6 px-5">
          <SectionLabel>Budget warnings</SectionLabel>
          <div className="mt-2 space-y-2">
            {budgetAlerts.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-2xl border border-success/20 bg-success/8 px-4 py-3 text-[13px] font-medium text-success">
                <CheckCircle2 className="size-4" /> All pending requisitions are within budget.
              </div>
            ) : (
              budgetAlerts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => nav("ff3", { id: f.id })}
                  className="flex w-full items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/6 px-4 py-3 text-left transition active:scale-[0.99]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/12 text-destructive">
                    <TriangleAlert className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{f.ff3_number} would exceed budget</p>
                    <p className="truncate text-[12px] text-muted-foreground">{f.departmentName} · {kinaCompact(f.total_estimated_amount)}</p>
                  </div>
                  <ArrowRight className="size-4 text-destructive/70" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Awaiting preview */}
        <div className="mt-6 px-5">
          <SectionLabel
            action={
              <button onClick={() => setTab("approvals")} className="text-[12px] font-semibold text-primary">
                View all
              </button>
            }
          >
            Priority queue
          </SectionLabel>
          <div className="mt-2.5 space-y-2.5">
            {pending.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="All caught up" body="No requisitions or payments are awaiting your approval." />
            ) : (
              pending.slice(0, 4).map((item) => (
                <ApprovalCard
                  key={item.id}
                  item={item}
                  onClick={() => nav(item.kind === "FF3" ? "ff3" : "ff4", { id: item.id })}
                />
              ))
            )}
          </div>
        </div>

      <p className="mt-6 px-5 text-center text-[11px] text-muted-foreground">
        {lastSync ? `Synced ${relativeTime(new Date(lastSync).toISOString())}` : "Syncing…"} · {unreadCount} unread alert{unreadCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function byPriority(a: PendingItem, b: PendingItem): number {
  const score = (i: PendingItem) =>
    (isOverdue(i.submitted_date) ? 100 : 0) +
    (isCritical(i.urgency_level) ? 50 : isUrgent(i.urgency_level) ? 20 : 0) +
    (i.highValue ? 5 : 0);
  const d = score(b) - score(a);
  if (d !== 0) return d;
  const ta = a.submitted_date ? new Date(a.submitted_date).getTime() : Infinity;
  const tb = b.submitted_date ? new Date(b.submitted_date).getTime() : Infinity;
  return ta - tb;
}

const TONES: Record<string, string> = {
  primary: "text-primary bg-primary/10",
  info: "text-info bg-info/12",
  warning: "text-warning bg-warning/15",
  gold: "text-gold bg-gold/15",
  destructive: "text-destructive bg-destructive/12",
  success: "text-success bg-success/12",
};

function Metric({
  label, value, icon: Icon, tone, onClick,
}: {
  label: string; value: number; icon: any; tone: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-[0_1px_2px_rgba(20,40,30,0.04)] transition active:scale-95"
    >
      <span className={cn("grid size-8 place-items-center rounded-lg", TONES[tone])}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="font-display text-2xl leading-none text-foreground">{value}</p>
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
      </div>
    </button>
  );
}

function ValueTile({ label, value, tone }: { label: string; value: number; tone: "warning" | "success" }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <Money value={value} className={cn("font-display text-xl", tone === "warning" ? "text-warning" : "text-success")} />
    </div>
  );
}
