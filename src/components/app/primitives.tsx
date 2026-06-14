"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { kina, kinaCompact, dueLabel } from "@/lib/format";
import {
  AlertTriangle,
  Clock,
  FileText,
  Receipt,
  TriangleAlert,
} from "lucide-react";

/* ---------------------------------------------------------------- money */
export function Money({
  value,
  compact,
  decimals,
  className,
}: {
  value: number | null | undefined;
  compact?: boolean;
  decimals?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("tnum", className)}>
      {compact ? kinaCompact(value) : kina(value, { decimals })}
    </span>
  );
}

/* --------------------------------------------------------- status badge */
const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  SUBMITTED: { label: "Awaiting you", variant: "warning" },
  ENDORSED: { label: "Awaiting you", variant: "warning" },
  PENDING: { label: "Pending", variant: "warning" },
  PENDING_APPROVAL: { label: "Pending", variant: "warning" },
  UNDER_REVIEW: { label: "In review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  RETURNED: { label: "Returned", variant: "gold" },
  ON_HOLD: { label: "On hold", variant: "muted" },
  PAID: { label: "Paid", variant: "info" },
  DRAFT: { label: "Draft", variant: "muted" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS_MAP[status?.toUpperCase()] ?? { label: status, variant: "muted" };
  return (
    <Badge variant={s.variant} className={className}>
      {s.label}
    </Badge>
  );
}

/* -------------------------------------------------------- urgency badge */
const URGENCY_MAP: Record<string, { label: string; variant: any }> = {
  CRITICAL: { label: "Critical", variant: "destructive" },
  URGENT: { label: "Urgent", variant: "warning" },
  HIGH: { label: "Urgent", variant: "warning" },
  MEDIUM: { label: "Routine", variant: "muted" },
  LOW: { label: "Low", variant: "muted" },
};

export function UrgencyBadge({ urgency, className }: { urgency: string; className?: string }) {
  const u = URGENCY_MAP[urgency?.toUpperCase()] ?? { label: urgency, variant: "muted" };
  const showIcon = ["CRITICAL", "URGENT", "HIGH"].includes(urgency?.toUpperCase());
  return (
    <Badge variant={u.variant} className={className}>
      {showIcon && <TriangleAlert className="size-3" />}
      {u.label}
    </Badge>
  );
}

/* ------------------------------------------------------------ type pill */
export function TypePill({ kind, className }: { kind: "FF3" | "FF4"; className?: string }) {
  const isFF3 = kind === "FF3";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider",
        isFF3 ? "bg-primary/10 text-primary" : "bg-info/12 text-info",
        className,
      )}
    >
      {isFF3 ? <FileText className="size-3" /> : <Receipt className="size-3" />}
      {kind}
    </span>
  );
}

/* ------------------------------------------------------------- due chip */
export function DueChip({ iso, className }: { iso: string | null | undefined; className?: string }) {
  const { text, overdue } = dueLabel(iso);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium",
        overdue ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {overdue ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
      {text}
    </span>
  );
}

/* -------------------------------------------------------- section label */
export function SectionLabel({ children, className, action }: { children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("flex items-center justify-between px-1", className)}>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{children}</h3>
      {action}
    </div>
  );
}

/* --------------------------------------------------------- field row */
export function FieldRow({
  label,
  value,
  className,
  emphasize,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2", className)}>
      <span className="shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <span className={cn("text-right text-[13px]", emphasize ? "font-semibold text-foreground" : "text-foreground/90")}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- progress */
export function Meter({
  value,
  className,
  tone = "primary",
  track,
}: {
  value: number; // 0-100
  className?: string;
  tone?: "primary" | "success" | "warning" | "destructive" | "gold" | "info";
  track?: string;
}) {
  const toneClass = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    gold: "bg-gold",
    info: "bg-info",
  }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full", track ?? "bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700", toneClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* --------------------------------------------------------- empty state */
export function EmptyState({ icon: Icon, title, body }: { icon: any; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-muted/70 text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <p className="font-display text-lg text-foreground">{title}</p>
      {body && <p className="mt-1 max-w-[24ch] text-sm text-muted-foreground">{body}</p>}
    </div>
  );
}

/* ------------------------------------------------------- segmented ctrl */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar flex gap-1.5 overflow-x-auto", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted",
            )}
          >
            {o.label}
            {o.count != null && (
              <span
                className={cn(
                  "min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-foreground/70",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------ initials avatar */
export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  const init = name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-display text-primary-foreground",
        className,
      )}
    >
      {init}
    </div>
  );
}

/* ----------------------------------------------------------- card link */
export function Surface({
  children,
  className,
  onClick,
  as,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "div" | "button";
}) {
  const Comp: any = as ?? (onClick ? "button" : "div");
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "block w-full rounded-2xl border border-border/70 bg-card text-left shadow-[0_1px_2px_rgba(20,40,30,0.04)]",
        onClick && "transition-all active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
