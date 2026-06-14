"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { AppHeader } from "@/components/app/app-header";
import { Money, Meter, EmptyState } from "@/components/app/primitives";
import { fetchBudgetLines } from "@/lib/supabase/queries";
import { kina } from "@/lib/format";
import type { BudgetLineView } from "@/lib/types";
import { TriangleAlert, Wallet, CheckCircle2 } from "lucide-react";

export function BudgetScreen() {
  const { back } = useApp();
  const [lines, setLines] = React.useState<BudgetLineView[] | null>(null);

  React.useEffect(() => {
    let active = true;
    fetchBudgetLines().then((l) => active && setLines(l)).catch(() => active && setLines([]));
    return () => { active = false; };
  }, []);

  const totals = React.useMemo(() => {
    const l = lines ?? [];
    return {
      released: l.reduce((s, x) => s + x.released_amount, 0),
      committed: l.reduce((s, x) => s + x.committed_amount, 0),
      actual: l.reduce((s, x) => s + x.actual_expenditure, 0),
      available: l.reduce((s, x) => s + x.available, 0),
    };
  }, [lines]);

  const sorted = React.useMemo(() => [...(lines ?? [])].sort((a, b) => b.utilization - a.utilization), [lines]);

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Budget Summary" subtitle="Quarterly release position" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 pt-3">
        {/* summary */}
        <div className="grain relative overflow-hidden rounded-2xl bg-[hsl(156_52%_14%)] p-4 text-white">
          <p className="text-[11px] uppercase tracking-wider text-white/55">Available across all lines</p>
          <Money value={totals.available} className="font-display text-3xl text-gold" />
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
            <SumTile label="Released" value={kina(totals.released)} />
            <SumTile label="Committed" value={kina(totals.committed)} />
            <SumTile label="Actual" value={kina(totals.actual)} />
          </div>
        </div>

        {lines === null ? (
          <div className="mt-3 space-y-2.5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState icon={Wallet} title="No budget lines" body="Budget data is not available for this period." />
        ) : (
          <div className="mt-3 space-y-2.5">
            {sorted.map((b) => {
              const exceeded = b.available < 0;
              const low = !exceeded && b.available <= b.released_amount * 0.15;
              return (
                <div key={b.expense_code_registry_id} className="rounded-2xl border border-border/70 bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-foreground">{b.cost_centre_name ?? b.department_name ?? "Expense line"}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{b.full_expense_code}</p>
                    </div>
                    {exceeded ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5 text-[10px] font-bold text-destructive"><TriangleAlert className="size-3" /> Over</span>
                    ) : low ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning"><TriangleAlert className="size-3" /> Low</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-bold text-success"><CheckCircle2 className="size-3" /> OK</span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <Meter value={b.utilization} tone={exceeded ? "destructive" : low ? "warning" : "success"} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">Available</span>
                    <Money value={b.available} className={cn("font-semibold", exceeded ? "text-destructive" : "text-foreground")} />
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Released {kina(b.released_amount)}</span>
                    <span>{Math.round(b.utilization)}% used</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SumTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-white tnum">{value}</p>
    </div>
  );
}
