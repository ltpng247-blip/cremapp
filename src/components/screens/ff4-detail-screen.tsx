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
import { fetchFF4, fetchAuditTrail } from "@/lib/supabase/queries";
import { kina } from "@/lib/format";
import type { Attachment, AuditEntry, FF4Detail } from "@/lib/types";
import {
  Banknote,
  CheckCircle2,
  FileText,
  Landmark,
  Receipt,
  TriangleAlert,
  Lock,
} from "lucide-react";

const PENDING = ["SUBMITTED", "PENDING", "VERIFIED", "PENDING_APPROVAL", "UNDER_REVIEW"];

export function FF4DetailScreen() {
  const { route, back, nav, submitFF4Decision } = useApp();
  const id = route.params?.id;
  const [d, setD] = React.useState<FF4Detail | null>(null);
  const [history, setHistory] = React.useState<AuditEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reviewed, setReviewed] = React.useState<Set<string>>(new Set());
  const [viewer, setViewer] = React.useState<Attachment | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!id) return;
    setLoading(true);
    fetchFF4(id).then((res) => {
      if (!active) return;
      setD(res);
      setLoading(false);
      if (res) fetchAuditTrail({ entityId: res.id, limit: 30 }).then((h) => active && setHistory(h));
    });
    return () => { active = false; };
  }, [id]);

  if (loading) return <Skeleton onBack={back} />;
  if (!d) return <NotFound onBack={back} />;

  const pending = PENDING.includes((d.status ?? "").toUpperCase());
  const c = d.commitment;
  const blocked = !!c?.exceeds;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={d.ff4_number}
        subtitle={`Payment · ${d.payee_name}`}
        onBack={back}
        trailing={<div className="pr-1.5"><Receipt className="size-5 text-info" /></div>}
      />

      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar px-4 pb-6 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={d.status} />
          <UrgencyBadge urgency={d.urgency_level} />
          {d.highValue && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">High value</span>}
          {pending && <DueChip iso={d.submitted_date ? addHours(d.submitted_date, 24) : null} className="ml-auto" />}
        </div>

        {/* net amount + breakdown */}
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[12px] text-muted-foreground">Net payment amount</p>
          <Money value={d.net_amount} className="font-display text-4xl text-foreground" />
          <p className="mt-1 line-clamp-2 text-[14px] font-medium text-foreground">{d.payment_description}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
            <Mini label="Gross" value={kina(d.gross_amount)} />
            <Mini label="Tax" value={kina(d.tax_amount)} />
            <Mini label="Deductions" value={kina(d.deductions)} />
          </div>
        </div>

        {/* commitment impact */}
        <div className={cn(
          "rounded-2xl border p-4",
          blocked ? "border-destructive/40 bg-destructive/6" : "border-border/70 bg-card",
        )}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Landmark className="size-3.5" /> Commitment balance
            </span>
            {c && <span className="font-mono text-[11px] text-muted-foreground">{c.number}</span>}
          </div>

          {!c ? (
            <p className="mt-2 text-[13px] text-muted-foreground">No commitment linked to this payment.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-x-4">
                <FieldRow label="Original commitment" value={kina(c.committed)} />
                <FieldRow label="Already paid" value={kina(c.paid)} />
                <FieldRow label="Remaining before" value={<span className="font-semibold">{kina(c.remaining)}</span>} />
                <FieldRow label="This payment" value={kina(c.net)} />
              </div>
              <div className="mt-1">
                <Meter value={c.percentPaid} tone={blocked ? "destructive" : "info"} />
                <p className="mt-1 text-[11px] text-muted-foreground">{Math.round(c.percentPaid)}% of commitment paid</p>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-background/70 px-3 py-2.5">
                <div>
                  <p className="text-[11px] text-muted-foreground">Remaining after payment</p>
                  <Money value={c.after} className={cn("font-display text-xl", blocked ? "text-destructive" : c.after === 0 ? "text-info" : "text-success")} />
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  blocked ? "bg-destructive/12 text-destructive" : c.after === 0 ? "bg-info/12 text-info" : "bg-success/12 text-success",
                )}>
                  {blocked ? <TriangleAlert className="size-3" /> : <CheckCircle2 className="size-3" />}
                  {blocked ? "Exceeds balance" : c.after === 0 ? "Fully paid" : "Within balance"}
                </span>
              </div>
              {blocked && (
                <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-destructive/12 px-3 py-2.5 text-[12px] font-medium text-destructive">
                  <Lock className="mt-0.5 size-3.5 shrink-0" />
                  This payment exceeds the remaining commitment by {kina(Math.abs(c.after))}. Approval is blocked until the amount is corrected or the commitment is varied.
                </div>
              )}
            </>
          )}
        </div>

        {/* payee / payment details */}
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <SectionLabel className="px-0">Payment details</SectionLabel>
          <div className="mt-1 divide-y divide-border/50">
            <FieldRow label="Payee" value={<span className="inline-flex items-center gap-1"><Banknote className="size-3 text-muted-foreground" />{d.payee_name}</span>} emphasize />
            <FieldRow label="Payee type" value={titleCaseSafe(d.payee_type)} />
            <FieldRow label="Invoice number" value={d.invoice_number ?? "—"} />
            <FieldRow label="Invoice date" value={fmt(d.invoice_date)} />
            <FieldRow label="Payment method" value={d.payment_method ?? "—"} />
            <FieldRow label="Department" value={d.departmentName ?? "—"} />
          </div>
          {d.ff3_number && (
            <button
              onClick={() => d.ff3_header_id && nav("ff3", { id: d.ff3_header_id })}
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-left transition active:scale-[0.99]"
            >
              <FileText className="size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-muted-foreground">Linked requisition</p>
                <p className="truncate text-[13px] font-semibold text-primary">{d.ff3_number} · {d.ff3_purpose}</p>
              </div>
            </button>
          )}
        </div>

        {/* documents */}
        {d.attachments.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <SectionLabel className="px-0">Invoice & receipts</SectionLabel>
            <div className="mt-2 space-y-2">
              {d.attachments.map((a) => (
                <DocChip key={a.id} attachment={a} reviewed={reviewed.has(a.id)} onOpen={() => setViewer(a)} />
              ))}
            </div>
          </div>
        )}

        {!pending && (
          <div className={cn("rounded-2xl border p-4", d.status === "APPROVED" || d.status === "PAID" ? "border-success/30 bg-success/6" : "border-destructive/30 bg-destructive/6")}>
            <p className="text-[13px] font-semibold text-foreground">This payment was {d.status?.toLowerCase()}.</p>
            {d.rejection_reason && <p className="mt-1 text-[13px] text-muted-foreground">{d.rejection_reason}</p>}
          </div>
        )}

        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <SectionLabel className="px-0">Approval history & audit trail</SectionLabel>
          <div className="mt-3"><HistoryTimeline entries={history} /></div>
        </div>
      </div>

      {pending && (
        <DecisionBar
          kind="FF4"
          number={d.ff4_number}
          approveBlocked={blocked}
          blockedReason={blocked ? "Payment exceeds the commitment balance — approval blocked." : undefined}
          onSubmit={async (decision, comment) => {
            const ok = await submitFF4Decision(d, decision, comment);
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-foreground tnum">{value}</p>
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
function Skeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Loading…" onBack={onBack} />
      <div className="flex-1 space-y-3 px-4 pt-3">
        <div className="h-6 w-40 animate-pulse rounded-full bg-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div className="h-44 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Not found" onBack={onBack} />
      <div className="grid flex-1 place-items-center px-8 text-center">
        <p className="text-sm text-muted-foreground">This payment could not be loaded.</p>
      </div>
    </div>
  );
}
