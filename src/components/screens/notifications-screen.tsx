"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { AppHeader } from "@/components/app/app-header";
import { Segmented, EmptyState } from "@/components/app/primitives";
import { relativeTime } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import {
  AlarmClock,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  Gem,
  Receipt,
  Wallet,
  X,
} from "lucide-react";

function visual(n: AppNotification): { icon: any; tone: string } {
  const t = n.notification_type.toUpperCase();
  if (t.includes("ESCALATION")) return { icon: AlarmClock, tone: "destructive" };
  if (t.includes("BUDGET")) return { icon: Wallet, tone: "destructive" };
  if (t.includes("HIGH_VALUE")) return { icon: Gem, tone: "gold" };
  if (t.includes("PAYMENT") && t.includes("PROCESS")) return { icon: CheckCircle2, tone: "success" };
  if (t.includes("FF4")) return { icon: Receipt, tone: "info" };
  if (t.includes("FF3")) return { icon: FileText, tone: "primary" };
  if (t.includes("REMINDER")) return { icon: Clock, tone: "muted" };
  return { icon: Bell, tone: "muted" };
}

const TONE: Record<string, string> = {
  destructive: "bg-destructive/12 text-destructive",
  gold: "bg-gold/15 text-gold",
  success: "bg-success/12 text-success",
  info: "bg-info/12 text-info",
  primary: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
};

export function NotificationsScreen() {
  const { notifications, unreadCount, readNotification, readAllNotifications, removeNotification, openRef, back, canGoBack } = useApp();
  const [tab, setTab] = React.useState<"all" | "unread">("all");

  const list = tab === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        onBack={canGoBack ? back : undefined}
        leading={!canGoBack ? <div className="grid size-10 place-items-center"><Bell className="size-5 text-primary" /></div> : undefined}
        trailing={
          <button
            onClick={readAllNotifications}
            disabled={unreadCount === 0}
            className="mr-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-primary disabled:opacity-40"
          >
            <CheckCheck className="size-4" /> Read all
          </button>
        }
      />

      <div className="shrink-0 px-4 py-2">
        <Segmented<"all" | "unread">
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All", count: notifications.length },
            { value: "unread", label: "Unread", count: unreadCount },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
        {list.length === 0 ? (
          <EmptyState icon={BellOff} title="You're all caught up" body="New approval alerts and budget warnings will appear here." />
        ) : (
          <div className="space-y-2">
            {list.map((n) => {
              const v = visual(n);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex gap-3 rounded-2xl border p-3 transition",
                    n.is_read ? "border-border/60 bg-card" : "border-primary/20 bg-primary/[0.04]",
                  )}
                >
                  <button
                    onClick={() => { readNotification(n.id); openRef(n.reference_type, n.reference_id); }}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl", TONE[v.tone])}>
                      <v.icon className="size-[18px]" />
                      {!n.is_read && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-[13.5px]", n.is_read ? "font-medium text-foreground/90" : "font-semibold text-foreground")}>{n.title}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(n.created_at)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{n.message}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeNotification(n.id)}
                    className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full text-muted-foreground/50 opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
                    aria-label="Clear"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
