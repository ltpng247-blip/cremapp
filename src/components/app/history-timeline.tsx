"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";
import {
  Check,
  Ban,
  CornerUpLeft,
  PauseCircle,
  FileSignature,
  Send,
  Stamp,
} from "lucide-react";

const MAP: Record<string, { label: string; tone: string; icon: any }> = {
  CREATED: { label: "Created", tone: "muted", icon: FileSignature },
  RAISED: { label: "Voucher raised", tone: "muted", icon: FileSignature },
  SUBMITTED: { label: "Submitted", tone: "info", icon: Send },
  ENDORSED: { label: "Endorsed", tone: "info", icon: Check },
  APPROVED: { label: "Approved", tone: "success", icon: Check },
  REJECTED: { label: "Rejected", tone: "destructive", icon: Ban },
  RETURNED: { label: "Returned", tone: "gold", icon: CornerUpLeft },
  ON_HOLD: { label: "On hold", tone: "warning", icon: PauseCircle },
};

const TONE: Record<string, string> = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  gold: "bg-gold/15 text-gold",
  warning: "bg-warning/15 text-warning",
};

export function HistoryTimeline({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) {
    return <p className="px-1 py-4 text-center text-[13px] text-muted-foreground">No history recorded yet.</p>;
  }
  return (
    <div className="relative pl-2">
      {entries.map((e, i) => {
        const m = MAP[(e.action ?? "").toUpperCase()] ?? { label: e.action || "Activity", tone: "muted", icon: Stamp };
        const last = i === entries.length - 1;
        return (
          <div key={e.id} className="relative flex gap-3 pb-4">
            {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" />}
            <span className={cn("z-10 grid size-8 shrink-0 place-items-center rounded-full", TONE[m.tone])}>
              <m.icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-semibold text-foreground">{m.label}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(e.created_at)}</span>
              </div>
              <p className="text-[12px] text-muted-foreground">
                {e.user_name || e.stage || "System"}
                <span className="text-muted-foreground/60"> · {formatDateTime(e.created_at)}</span>
              </p>
              {e.comment && (
                <p className="mt-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[12.5px] italic text-foreground/80">
                  “{e.comment}”
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
