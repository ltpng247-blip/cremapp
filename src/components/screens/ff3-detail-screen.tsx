"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { AppHeader } from "@/components/app/app-header";
import { DecisionBar } from "@/components/app/decision-bar";
import { DocChip, DocumentViewer } from "@/components/app/document-viewer";
import { HistoryTimeline } from "@/components/app/history-timeline";
import {
  Money,
  StatusBadge,
  UrgencyBadge,
  DueChip,
  SectionLabel,
  FieldRow,
  Meter,
} from "@/components/app/primitives";
import { fetchFF3, fetchFF3History } from "@/lib/supabase/queries";
import { kina } from "@/lib/format";
import type { Attachment, AuditEntry, FF3Detail } from "@/lib/types";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  Layers,
  Quote,
  TriangleAlert,
  User,
  Wallet,
} from "lucide-react";

const PENDING = ["SUBMITTED", "PENDING", "ENDORSED", "PENDING_APPROVAL", "UNDER_REVIEW"];

export function FF3DetailScreen() {
  const { route, back, submitFF3Decision } = useApp();
  const id = route.params?.id;
  const [d, setD] = React.useState<FF3Detail | null>(null);
  const [history, setHistory] = React.useState<AuditEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reviewed, setReviewed] = React.useState<Set<string>>(new Set());
  const [viewer, setViewer] = React.useState<Attachment | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!id) return;
    setLoading(true);
    fetchFF3(id).then((res) => {
      if (!active) return;
      setD(res);
      setLoading(false);
      if (res) fetchFF3History(res.id, res.ff3_number).then((h) => active && setHistory(h));
    });
    return () => { active = false; };
  }, [id]);

  if (loading) return <DetailSkeleton onBack={back} />;
  if (!d) return <NotFound onBack={back} />;

  const pending = PENDING.includes((d.status ?? "").toUpperCase());
  const b = d.budget;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={d.ff3_number}
        subtitle={`${d.departmentName ?? "Requisition"} · ${d.sectionName ?? ""}`}
        onBack={back}
        trailing={<div className="pr-1.5"><FileText className="size-5 text-primary" /></div>}
      />

      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar px-4 pb-6 pt-3">
        {/* status row */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={d.status} />
          <UrgencyBadge urgency={d.urgency_level} />
          {d.highValue && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">High value</span>}
          {pending && <DueChip iso={d.submitted_date ? addHours(d.submitted_date, 24) : null} className="ml-auto" />}
        </div>

        {/* hero amount */}
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[12px] text-muted-foreground">Total estimated amount</p>
          <Money value={d.total_estimated_amount} className="font-display text-4xl text-foreground" />
          <p className="mt-1 line-clamp-2 text-[14px] font-medium text-foreground">{d.purpose}</p>
        </div>

        {/* budget impact */}
        <div className={cn(
          "rounded-2xl border p-4",
          b?.exceeded ? "border-destructive/30 bg-destructive/5" : b?.low ? "border-warning/30 bg-warning/5" : "border-success/25 bg-success/5",
        )}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Wallet className="size-3.5" /> Budget impact
            </span>
            {b?.code && <span className="font-mono text-[11px] text-muted-foreground">{b.code}</span>}
          </div>

          {!b || !b.found ? (
            <p className="mt-2 text-[13px] text-muted-foreground">No budget line linked to this requisition.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-x-4">
                <FieldRow label="Released" value={kina(b.released)} />
                <FieldRow label="Committed" value={kina(b.committed)} />
                <FieldRow label="Actual spend" value={kina(b.actual)} />
                <FieldRow label="Available" value={<span className="font-semibold">{kina(b.available)}</span>} />
              </div>
              <div className="mt-1">
                <Meter
                  value={b.utilization}
                  tone={b.exceeded ? "destructive" : b.low ? "warning" : "success"}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{Math.round(b.utilization)}% of released budget used</p>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-background/70 px-3 py-2.5">
                <div>
                  <p className="text-[11px] text-muted-foreground">Balance after approval</p>
                  <Money
                    value={b.after}
                    className={cn("font-display text-xl", b.exceeded ? "text-destructive" : b.low ? "text-warning" : "text-success")}
                  />
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  b.exceeded ? "bg-destructive/12 text-destructive" : b.low ? "bg-warning/15 text-warning" : "bg-success/12 text-success",
                )}>
                  {b.exceeded ? <TriangleAlert className="size-3" /> : <CheckCircle2 className="size-3" />}
                  {b.exceeded ? "Exceeds budget" : b.low ? "Low balance" : "Within budget"}
                </span>
              </div>
            </>
          )}
        </div>

        {/* key facts */}
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <SectionLabel className="px-0">Request details</SectionLabel>
          <div className="mt-1 divide-y divide-border/50">
            <FieldRow label="Requesting officer" value={<span className="inline-flex items-center gap-1"><User className="size-3 text-muted-foreground" />{d.officerName ?? "—"}</span>} emphasize />
            <FieldRow label="Position" value={d.officerPosition ?? "—"} />
            <FieldRow label="Department" value={<span className="inline-flex items-center gap-1"><Building2 className="size-3 text-muted-foreground" />{d.departmentName ?? "—"}</span>} />
            <FieldRow label="Section" value={d.sectionName ?? "—"} />
            <FieldRow label="Required by" value={<span className="inline-flex items-center gap-1"><CalendarClock className="size-3 text-muted-foreground" />{fmt(d.required_by_date)}</span>} />
            <FieldRow label="Procurement" value={titleCaseSafe(d.procurement_method)} />
            <FieldRow label="Recommended supplier" value={d.selected_supplier_name ?? "—"} />
          </div>
          {d.justification && (
            <div className="mt-3 rounded-xl bg-muted/50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Justification</p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">{d.justification}</p>
            </div>
          )}
        </div>

        {/* items */}
        {d.items.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <SectionLabel className="px-0"><span className="inline-flex items-center gap-1.5"><Layers className="size-3.5" /> Items ({d.items.length})</span></SectionLabel>
            <div className="mt-2 space-y-1.5">
              {d.items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-1.5 last:border-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{it.item_description}</p>
                    <p className="text-[11px] text-muted-foreground tnum">{it.quantity} {it.unit_of_measure} × {kina(it.estimated_unit_price)}</p>
                  </div>
                  <Money value={it.total_amount} className="shrink-0 text-[13px] font-semibold" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* quotations */}
        {d.quotations.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <SectionLabel className="px-0"><span className="inline-flex items-center gap-1.5"><Quote className="size-3.5" /> Quotations ({d.quotations.length})</span></SectionLabel>
            <div className="mt-2 space-y-2">
              {d.quotations.map((q) => (
                <div key={q.id} className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2",
                  q.is_selected ? "border-success/30 bg-success/6" : "border-border/60 bg-background/60",
                )}>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{q.supplier_name}</p>
                    <p className="text-[11px] text-muted-foreground">{q.quotation_number ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {q.is_selected && <span className="rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-bold text-success">Selected</span>}
                    <Money value={q.quotation_amount} className="text-[13px] font-semibold" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* documents */}
        {d.attachments.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <SectionLabel className="px-0">Supporting documents</SectionLabel>
            <div className="mt-2 space-y-2">
              {d.attachments.map((a) => (
                <DocChip key={a.id} attachment={a} reviewed={reviewed.has(a.id)} onOpen={() => setViewer(a)} />
              ))}
            </div>
          </div>
        )}

        {/* decided banner */}
        {!pending && (
          <div className={cn(
            "rounded-2xl border p-4",
            d.status === "APPROVED" ? "border-success/30 bg-success/6" : "border-destructive/30 bg-destructive/6",
          )}>
            <p className="text-[13px] font-semibold text-foreground">This requisition was {d.status?.toLowerCase()}.</p>
            {d.rejection_reason && <p className="mt-1 text-[13px] text-muted-foreground">{d.rejection_reason}</p>}
          </div>
        )}

        {/* history */}
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <SectionLabel className="px-0">Approval history & audit trail</SectionLabel>
          <div className="mt-3">
            <HistoryTimeline entries={history} />
          </div>
        </div>
      </div>

      {pending && (
        <DecisionBar
          kind="FF3"
          number={d.ff3_number}
          onSubmit={async (decision, comment) => {
            const ok = await submitFF3Decision(d, decision, comment);
            if (ok) back();
            return ok;
          }}
        />
      )}

      <DocumentViewer
        attachment={viewer}
        open={!!viewer}
        onOpenChange={(v) => !v && setViewer(null)}
        reviewed={viewer ? reviewed.has(viewer.id) : false}
        onToggleReviewed={() => {
          if (!viewer) return;
          setReviewed((s) => {
            const n = new Set(s);
            n.has(viewer.id) ? n.delete(viewer.id) : n.add(viewer.id);
            return n;
          });
        }}
      />
    </div>
  );
}

function addHours(iso: string, h: number) {
  return new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();
}
function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function titleCaseSafe(s: string | null) {
  if (!s) return "—";
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Loading…" onBack={onBack} />
      <div className="flex-1 space-y-3 px-4 pt-3">
        <div className="h-6 w-40 animate-pulse rounded-full bg-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Not found" onBack={onBack} />
      <div className="grid flex-1 place-items-center px-8 text-center">
        <p className="text-sm text-muted-foreground">This requisition could not be loaded. It may have been actioned already.</p>
      </div>
    </div>
  );
}
