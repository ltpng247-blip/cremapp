"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Money, TypePill, UrgencyBadge, DueChip, StatusBadge } from "./primitives";
import { isCritical, isUrgent } from "@/lib/filters";
import { ChevronRight, TriangleAlert, Building2, User } from "lucide-react";
import type { FF3Summary, FF4Summary, PendingItem } from "@/lib/types";

const PENDING_STATES = ["SUBMITTED", "PENDING", "ENDORSED", "PENDING_APPROVAL", "UNDER_REVIEW", "VERIFIED"];

export function ApprovalCard({ item, onClick }: { item: PendingItem; onClick: () => void }) {
  const isFF3 = item.kind === "FF3";
  const ff3 = item as FF3Summary;
  const ff4 = item as FF4Summary;

  const number = isFF3 ? ff3.ff3_number : ff4.ff4_number;
  const amount = isFF3 ? ff3.total_estimated_amount : ff4.net_amount;
  const title = isFF3 ? ff3.purpose : ff4.payment_description || `Payment to ${ff4.payee_name}`;
  const sub = isFF3
    ? ff3.departmentName
    : ff4.payee_name;
  const sub2 = isFF3 ? ff3.officerName : ff4.ff3_number ? `Ref ${ff4.ff3_number}` : null;
  const decided = !PENDING_STATES.includes((item.status ?? "").toUpperCase());

  const warning = isFF3
    ? !ff3.is_within_budget
      ? "Over budget"
      : null
    : ff4.commitmentExceeded
    ? "Exceeds commitment"
    : null;

  const accent = isCritical(item.urgency_level)
    ? "bg-destructive"
    : isUrgent(item.urgency_level)
    ? "bg-warning"
    : "bg-primary/35";

  return (
    <button
      onClick={onClick}
      className="group relative flex w-full overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-[0_1px_2px_rgba(20,40,30,0.05)] transition active:scale-[0.99]"
    >
      <span className={cn("w-1 shrink-0", accent)} />
      <div className="flex-1 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <TypePill kind={item.kind} />
          <span className="font-mono text-[12px] font-semibold text-foreground/80">{number}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {item.highValue && (
              <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">High value</span>
            )}
            <UrgencyBadge urgency={item.urgency_level} />
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-[14px] font-medium leading-snug text-foreground">{title}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
          {sub && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" /> {sub}
            </span>
          )}
          {sub2 && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" /> {sub2}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div>
            <Money value={amount} className="font-display text-xl text-foreground" />
            <div className="mt-0.5 flex items-center gap-2">
              {decided ? (
                <StatusBadge status={item.status} />
              ) : (
                <DueChip iso={item.submitted_date ? addHours(item.submitted_date, 24) : null} />
              )}
              {!decided && warning && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                  <TriangleAlert className="size-3" /> {warning}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground/60 transition group-active:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}

function addHours(iso: string, h: number): string {
  return new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();
}
