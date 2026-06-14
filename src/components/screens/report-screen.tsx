"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { AppHeader } from "@/components/app/app-header";
import { Money, Meter } from "@/components/app/primitives";
import { fetchBudgetLines } from "@/lib/supabase/queries";
import { amountOf, isApprovedToday, isOverdue, sumValue } from "@/lib/filters";
import { kina, kinaCompact } from "@/lib/format";
import type { BudgetLineView, FF3Summary, FF4Summary, PendingItem } from "@/lib/types";

export function ReportScreen() {
  const { route, back, pendingFF3, pendingFF4, recentFF3, recentFF4 } = useApp();
  const type = route.params?.type ?? "daily";
  const title = route.params?.title ?? "Report";
  const [budget, setBudget] = React.useState<BudgetLineView[] | null>(null);

  React.useEffect(() => {
    if (type === "budget") fetchBudgetLines().then(setBudget).catch(() => setBudget([]));
  }, [type]);

  const pending: PendingItem[] = [...pendingFF3, ...pendingFF4];
  const decided: PendingItem[] = [...recentFF3, ...recentFF4];

  return (
    <div className="flex h-full flex-col">
      <AppHeader title={title} subtitle="Management report" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8 pt-3">
        {type === "daily" && <Daily decided={decided} pending={pending} />}
        {type === "weekly" && <Weekly decided={decided} />}
        {type === "department" && <Department pendingFF3={pendingFF3} recentFF3={recentFF3} />}
        {type === "highvalue" && <HighValue items={[...pending, ...decided]} />}
        {type === "ageing" && <Ageing pending={pending} />}
        {type === "budget" && <Budget lines={budget} />}
        {type === "payment" && <Payment pendingFF4={pendingFF4} recentFF4={recentFF4} />}
        {type === "audit" && <AuditExceptions decided={decided} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */
function StatRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("text-[14px] font-semibold tnum", tone)}>{value}</span>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-2xl border border-border/70 bg-card p-4">
      {title && <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>}
      {children}
    </div>
  );
}

function BarRow({ label, value, max, sub, tone = "bg-primary/70" }: { label: string; value: number; max: number; sub?: string; tone?: string }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="truncate pr-2 text-foreground">{label}</span>
        <span className="shrink-0 font-semibold tnum">{sub ?? kinaCompact(value)}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700", tone)} style={{ width: `${(value / max) * 100}%`, minWidth: value ? 4 : 0 }} />
      </div>
    </div>
  );
}

function ItemList({ items }: { items: PendingItem[] }) {
  if (!items.length) return <p className="py-3 text-center text-[13px] text-muted-foreground">No records.</p>;
  return (
    <div className="divide-y divide-border/40">
      {items.map((i) => (
        <div key={i.id} className="flex items-center justify-between py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">{i.kind === "FF3" ? (i as FF3Summary).ff3_number : (i as FF4Summary).ff4_number}</p>
            <p className="truncate text-[11px] text-muted-foreground">{i.kind === "FF3" ? (i as FF3Summary).purpose : (i as FF4Summary).payee_name}</p>
          </div>
          <Money value={amountOf(i)} className="shrink-0 text-[13px] font-semibold" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- variants */
function Daily({ decided, pending }: { decided: PendingItem[]; pending: PendingItem[] }) {
  const today = decided.filter((d) => isApprovedToday((d as any).approved_date));
  const approved = today.filter((d) => d.status === "APPROVED");
  const rejected = today.filter((d) => d.status === "REJECTED" || d.status === "RETURNED");
  return (
    <>
      <Card title="Today at a glance">
        <StatRow label="Approved" value={`${approved.length} · ${kinaCompact(sumValue(approved))}`} tone="text-success" />
        <StatRow label="Rejected / returned" value={`${rejected.length}`} tone="text-destructive" />
        <StatRow label="Still pending" value={`${pending.length} · ${kinaCompact(sumValue(pending))}`} tone="text-warning" />
      </Card>
      <Card title="Approved today"><ItemList items={approved} /></Card>
    </>
  );
}

function Weekly({ decided }: { decided: PendingItem[] }) {
  const approved = decided.filter((d) => d.status === "APPROVED");
  const ff3 = approved.filter((d) => d.kind === "FF3");
  const ff4 = approved.filter((d) => d.kind === "FF4");
  return (
    <>
      <Card title="Financial summary">
        <StatRow label="FF3 requisitions approved" value={`${ff3.length} · ${kinaCompact(sumValue(ff3))}`} />
        <StatRow label="FF4 payments approved" value={`${ff4.length} · ${kinaCompact(sumValue(ff4))}`} />
        <StatRow label="Total value authorised" value={kina(sumValue(approved))} tone="text-success" />
      </Card>
      <Card title="Recently approved"><ItemList items={approved.slice(0, 12)} /></Card>
    </>
  );
}

function Department({ pendingFF3, recentFF3 }: { pendingFF3: FF3Summary[]; recentFF3: FF3Summary[] }) {
  const all = [...pendingFF3, ...recentFF3];
  const byDept: Record<string, number> = {};
  all.forEach((f) => { const k = f.departmentName ?? "Unspecified"; byDept[k] = (byDept[k] ?? 0) + f.total_estimated_amount; });
  const rows = Object.entries(byDept).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <Card title="Expenditure by department">
      {rows.length === 0 ? <p className="py-3 text-center text-[13px] text-muted-foreground">No data.</p> : rows.map(([d, v]) => <BarRow key={d} label={d} value={v} max={max} tone="bg-gold" />)}
    </Card>
  );
}

function HighValue({ items }: { items: PendingItem[] }) {
  const hv = items.filter((i) => i.highValue).sort((a, b) => amountOf(b) - amountOf(a));
  return (
    <Card title={`High-value transactions (${hv.length})`}>
      <ItemList items={hv} />
    </Card>
  );
}

function Ageing({ pending }: { pending: PendingItem[] }) {
  const now = Date.now();
  const bucket = (min: number, max: number) => pending.filter((p) => {
    if (!p.submitted_date) return false;
    const h = (now - new Date(p.submitted_date).getTime()) / 3_600_000;
    return h >= min && h < max;
  }).length;
  const b1 = bucket(0, 24), b2 = bucket(24, 48), b3 = bucket(48, Infinity);
  const max = Math.max(1, b1, b2, b3);
  const overdue = pending.filter((p) => isOverdue(p.submitted_date));
  return (
    <>
      <Card title="Pending by age">
        <BarRow label="Under 24 hours" value={b1} max={max} sub={`${b1}`} tone="bg-success" />
        <BarRow label="1 – 2 days" value={b2} max={max} sub={`${b2}`} tone="bg-warning" />
        <BarRow label="Over 2 days" value={b3} max={max} sub={`${b3}`} tone="bg-destructive" />
      </Card>
      <Card title={`Overdue items (${overdue.length})`}><ItemList items={overdue} /></Card>
    </>
  );
}

function Budget({ lines }: { lines: BudgetLineView[] | null }) {
  if (lines === null) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  const sorted = [...lines].sort((a, b) => b.utilization - a.utilization).slice(0, 10);
  return (
    <Card title="Budget utilisation (top lines)">
      {sorted.map((b) => (
        <div key={b.expense_code_registry_id} className="py-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="truncate pr-2 font-mono text-foreground">{b.full_expense_code}</span>
            <span className="shrink-0 font-semibold">{Math.round(b.utilization)}%</span>
          </div>
          <div className="mt-1"><Meter value={b.utilization} tone={b.available < 0 ? "destructive" : b.utilization > 85 ? "warning" : "success"} /></div>
        </div>
      ))}
    </Card>
  );
}

function Payment({ pendingFF4, recentFF4 }: { pendingFF4: FF4Summary[]; recentFF4: FF4Summary[] }) {
  const all = [...pendingFF4, ...recentFF4];
  const count = (s: string) => all.filter((f) => f.status === s).length;
  const rows: [string, number, string][] = [
    ["Awaiting approval", pendingFF4.length, "text-warning"],
    ["Approved", count("APPROVED"), "text-success"],
    ["Paid", count("PAID"), "text-info"],
    ["Rejected / returned", count("REJECTED") + count("RETURNED"), "text-destructive"],
  ];
  return (
    <Card title="Payment status breakdown">
      {rows.map((r) => <StatRow key={r[0]} label={r[0]} value={`${r[1]}`} tone={r[2]} />)}
    </Card>
  );
}

function AuditExceptions({ decided }: { decided: PendingItem[] }) {
  const ex = decided.filter((d) => d.status === "REJECTED" || d.status === "RETURNED");
  return (
    <Card title={`Exceptions — rejected & returned (${ex.length})`}>
      <ItemList items={ex} />
    </Card>
  );
}
