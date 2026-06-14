"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { AppHeader, IconButton } from "@/components/app/app-header";
import { ApprovalCard } from "@/components/app/approval-card";
import { Segmented, EmptyState } from "@/components/app/primitives";
import { BottomSheet } from "@/components/app/overlay";
import { Button } from "@/components/ui/button";
import {
  type QueueFilter,
  amountOf,
  isCritical,
  isOverdue,
  isUrgent,
  matchesFilter,
  searchItem,
} from "@/lib/filters";
import type { FF3Summary, PendingItem } from "@/lib/types";
import { Inbox, Search, SlidersHorizontal, Stamp, X } from "lucide-react";

type SortKey = "priority" | "amount" | "oldest" | "newest";

export function ApprovalsScreen() {
  const { pendingFF3, pendingFF4, recentFF3, recentFF4, nav, back, canGoBack, route, pendingCount } = useApp();

  const initFilter = (route.params?.filter as QueueFilter) || (route.params?.seg as QueueFilter) || "ALL";
  const [filter, setFilter] = React.useState<QueueFilter>(initFilter);
  const [mode, setMode] = React.useState<"pending" | "recent">("pending");
  const [query, setQuery] = React.useState("");
  const [dept, setDept] = React.useState<string>("all");
  const [sort, setSort] = React.useState<SortKey>("priority");
  const [filterOpen, setFilterOpen] = React.useState(false);

  const pending: PendingItem[] = React.useMemo(() => [...pendingFF3, ...pendingFF4], [pendingFF3, pendingFF4]);
  const recent: PendingItem[] = React.useMemo(() => [...recentFF3, ...recentFF4], [recentFF3, recentFF4]);
  const source = mode === "pending" ? pending : recent;

  const departments = React.useMemo(() => {
    const set = new Set<string>();
    pendingFF3.forEach((f) => f.departmentName && set.add(f.departmentName));
    recentFF3.forEach((f) => f.departmentName && set.add(f.departmentName));
    return Array.from(set).sort();
  }, [pendingFF3, recentFF3]);

  const counts = React.useMemo(() => {
    const c: Record<QueueFilter, number> = { ALL: 0, FF3: 0, FF4: 0, URGENT: 0, HIGH_VALUE: 0, OVERDUE: 0 };
    (["ALL", "FF3", "FF4", "URGENT", "HIGH_VALUE", "OVERDUE"] as QueueFilter[]).forEach((k) => {
      c[k] = pending.filter((i) => matchesFilter(i, k)).length;
    });
    return c;
  }, [pending]);

  const items = React.useMemo(() => {
    let list = source.filter((i) => matchesFilter(i, filter) && searchItem(i, query));
    if (dept !== "all") list = list.filter((i) => i.kind === "FF3" && (i as FF3Summary).departmentName === dept);
    list = [...list].sort((a, b) => {
      if (mode === "recent") return tOf(b) - tOf(a);
      switch (sort) {
        case "amount": return amountOf(b) - amountOf(a);
        case "oldest": return subTime(a) - subTime(b);
        case "newest": return subTime(b) - subTime(a);
        default: return priority(b) - priority(a) || subTime(a) - subTime(b);
      }
    });
    return list;
  }, [source, filter, query, dept, sort, mode]);

  const activeFilters = (dept !== "all" ? 1 : 0) + (sort !== "priority" ? 1 : 0);

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={mode === "pending" ? "Pending Approvals" : "Recent Decisions"}
        subtitle={mode === "pending" ? `${pendingCount} awaiting your decision` : `${recent.length} recently decided`}
        onBack={canGoBack ? back : undefined}
        leading={!canGoBack ? <div className="grid size-10 place-items-center"><Stamp className="size-5 text-primary" /></div> : undefined}
        trailing={
          <IconButton onClick={() => setFilterOpen(true)} label="Filters" className="relative">
            <SlidersHorizontal className="size-[18px]" />
            {activeFilters > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gold" />}
          </IconButton>
        }
      />

      <div className="shrink-0 space-y-2.5 px-4 pb-2 pt-2">
        {/* search */}
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FF3/FF4, payee, department…"
            className="h-10 w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* mode toggle */}
        <div className="flex rounded-xl bg-muted/70 p-1">
          {(["pending", "recent"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[13px] font-semibold capitalize transition",
                mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {m === "pending" ? "Pending" : "Recent"}
            </button>
          ))}
        </div>

        {/* segmented filters (pending only) */}
        {mode === "pending" && (
          <Segmented<QueueFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: "All", count: counts.ALL },
              { value: "FF3", label: "FF3", count: counts.FF3 },
              { value: "FF4", label: "FF4", count: counts.FF4 },
              { value: "URGENT", label: "Urgent", count: counts.URGENT },
              { value: "HIGH_VALUE", label: "High value", count: counts.HIGH_VALUE },
              { value: "OVERDUE", label: "Overdue", count: counts.OVERDUE },
            ]}
          />
        )}
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 pt-1">
        {items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={mode === "pending" ? "Nothing pending here" : "No recent decisions"}
            body={mode === "pending" ? "There are no items matching this filter awaiting your approval." : "Decisions you make will appear here."}
          />
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <ApprovalCard key={item.id} item={item} onClick={() => nav(item.kind === "FF3" ? "ff3" : "ff4", { id: item.id })} />
            ))}
          </div>
        )}
      </div>

      {/* filter drawer */}
      <BottomSheet open={filterOpen} onOpenChange={setFilterOpen}>
        <div className="mx-auto w-full max-w-[420px] px-5 pb-7 pt-1">
            <p className="mb-3 font-display text-xl">Filter & sort</p>

            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Department</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={dept === "all"} onClick={() => setDept("all")}>All</Chip>
              {departments.map((d) => (
                <Chip key={d} active={dept === d} onClick={() => setDept(d)}>{d}</Chip>
              ))}
            </div>

            <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sort by</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { k: "priority", l: "Priority" },
                { k: "amount", l: "Amount (high)" },
                { k: "oldest", l: "Oldest first" },
                { k: "newest", l: "Newest first" },
              ] as { k: SortKey; l: string }[]).map((s) => (
                <Chip key={s.k} active={sort === s.k} onClick={() => setSort(s.k)} full>{s.l}</Chip>
              ))}
            </div>

            <div className="mt-6 flex gap-2.5">
              <Button variant="outline" className="flex-1" onClick={() => { setDept("all"); setSort("priority"); }}>
                Reset
              </Button>
              <Button className="flex-1" onClick={() => setFilterOpen(false)}>Show results</Button>
            </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function Chip({ children, active, onClick, full }: { children: React.ReactNode; active: boolean; onClick: () => void; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-[13px] font-medium transition active:scale-95",
        full && "w-full",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground/80",
      )}
    >
      {children}
    </button>
  );
}

const subTime = (i: PendingItem) => (i.submitted_date ? new Date(i.submitted_date).getTime() : Infinity);
const tOf = (i: PendingItem) => {
  const d = i.kind === "FF3" ? (i as FF3Summary).approved_date : (i as any).approved_date;
  return d ? new Date(d).getTime() : subTime(i) || 0;
};
const priority = (i: PendingItem) =>
  (isOverdue(i.submitted_date) ? 100 : 0) + (isCritical(i.urgency_level) ? 50 : isUrgent(i.urgency_level) ? 20 : 0) + (i.highValue ? 5 : 0);
