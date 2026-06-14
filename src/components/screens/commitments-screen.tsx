"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { AppHeader } from "@/components/app/app-header";
import { Money, Meter, EmptyState } from "@/components/app/primitives";
import { fetchCommitments } from "@/lib/supabase/queries";
import { kina } from "@/lib/format";
import type { CommitmentView } from "@/lib/types";
import { Landmark, Search, X } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-info/12 text-info" },
  PARTIALLY_PAID: { label: "Partially paid", cls: "bg-warning/15 text-warning" },
  FULLY_PAID: { label: "Fully paid", cls: "bg-success/12 text-success" },
};

export function CommitmentsScreen() {
  const { back } = useApp();
  const [items, setItems] = React.useState<CommitmentView[] | null>(null);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    let active = true;
    fetchCommitments().then((c) => active && setItems(c)).catch(() => active && setItems([]));
    return () => { active = false; };
  }, []);

  const filtered = (items ?? []).filter((c) =>
    !q.trim() ||
    [c.commitment_number, c.ff3_number, c.purpose].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const totals = React.useMemo(() => {
    const l = items ?? [];
    return {
      committed: l.reduce((s, x) => s + x.committed_amount, 0),
      paid: l.reduce((s, x) => s + x.paid_amount, 0),
      remaining: l.reduce((s, x) => s + x.remaining_balance, 0),
    };
  }, [items]);

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Commitments" subtitle={`${items?.length ?? 0} active`} onBack={back} />

      <div className="shrink-0 px-4 pt-3">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-card p-3 text-center">
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Committed</p><p className="mt-0.5 text-[13px] font-semibold tnum">{kina(totals.committed)}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid</p><p className="mt-0.5 text-[13px] font-semibold tnum text-info">{kina(totals.paid)}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p><p className="mt-0.5 text-[13px] font-semibold tnum text-success">{kina(totals.remaining)}</p></div>
        </div>
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search commitment or FF3…" className="h-10 w-full bg-transparent text-[14px] focus:outline-none" />
          {q && <button onClick={() => setQ("")}><X className="size-4 text-muted-foreground" /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 pt-3">
        {items === null ? (
          <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Landmark} title="No commitments" body="Approved requisitions raise commitments that appear here." />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((c) => {
              const st = STATUS[c.status?.toUpperCase()] ?? { label: c.status, cls: "bg-muted text-muted-foreground" };
              return (
                <div key={c.id} className="rounded-2xl border border-border/70 bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] font-semibold text-foreground">{c.commitment_number}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{c.ff3_number ? `${c.ff3_number} · ` : ""}{c.purpose ?? "—"}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", st.cls)}>{st.label}</span>
                  </div>
                  <div className="mt-3"><Meter value={c.percentPaid} tone={c.percentPaid >= 100 ? "success" : "info"} /></div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Committed</p><Money value={c.committed_amount} className="text-[12.5px] font-semibold" /></div>
                    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid</p><Money value={c.paid_amount} className="text-[12.5px] font-semibold text-info" /></div>
                    <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p><Money value={c.remaining_balance} className="text-[12.5px] font-semibold text-success" /></div>
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
