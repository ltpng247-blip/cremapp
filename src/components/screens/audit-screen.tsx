"use client";

import * as React from "react";
import { useApp } from "@/components/app/app-provider";
import { AppHeader } from "@/components/app/app-header";
import { Segmented, EmptyState } from "@/components/app/primitives";
import { HistoryTimeline } from "@/components/app/history-timeline";
import { fetchAuditTrail } from "@/lib/supabase/queries";
import type { AuditEntry } from "@/lib/types";
import { ScrollText } from "lucide-react";

export function AuditScreen() {
  const { back } = useApp();
  const [entries, setEntries] = React.useState<AuditEntry[] | null>(null);
  const [tab, setTab] = React.useState<"ALL" | "FF3" | "FF4">("ALL");

  React.useEffect(() => {
    let active = true;
    fetchAuditTrail({ limit: 100 }).then((e) => active && setEntries(e)).catch(() => active && setEntries([]));
    return () => { active = false; };
  }, []);

  const grouped = React.useMemo(() => {
    const list = (entries ?? []).filter((e) => tab === "ALL" || (e.entity_type ?? "").toUpperCase() === tab);
    // attach reference label into comment-less entries by grouping by day
    const byDay: Record<string, AuditEntry[]> = {};
    for (const e of list) {
      const day = new Date(e.created_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      (byDay[day] ??= []).push({ ...e, user_name: e.entity_reference ? `${e.entity_reference} · ${e.user_name ?? ""}`.trim() : e.user_name });
    }
    return byDay;
  }, [entries, tab]);

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Audit Trail" subtitle="System accountability log" onBack={back} />
      <div className="shrink-0 px-4 py-2">
        <Segmented<"ALL" | "FF3" | "FF4">
          value={tab}
          onChange={setTab}
          options={[
            { value: "ALL", label: "All activity" },
            { value: "FF3", label: "FF3" },
            { value: "FF4", label: "FF4" },
          ]}
        />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
        {entries === null ? (
          <div className="space-y-3 pt-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : Object.keys(grouped).length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit records" body="Approval and system activity will be logged here." />
        ) : (
          <div className="space-y-4 pt-1">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <p className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">{day}</p>
                <div className="pt-2">
                  <HistoryTimeline entries={items} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
