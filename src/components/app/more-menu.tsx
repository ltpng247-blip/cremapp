"use client";

import * as React from "react";
import { BottomSheet } from "./overlay";
import { useApp } from "./app-provider";
import { InitialsAvatar } from "./primitives";
import {
  LayoutGrid,
  Stamp,
  FileText,
  Receipt,
  Wallet,
  Landmark,
  Bell,
  PieChart,
  ScrollText,
  UserRound,
  Settings,
  LogOut,
} from "lucide-react";

type Item = {
  label: string;
  icon: any;
  tone?: string;
  go: (api: ReturnType<typeof useApp>) => void;
};

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Approvals",
    items: [
      { label: "Dashboard", icon: LayoutGrid, go: (a) => a.setTab("dashboard") },
      { label: "Pending", icon: Stamp, go: (a) => a.setTab("approvals") },
      { label: "FF3 Requisitions", icon: FileText, go: (a) => a.nav("approvals", { seg: "FF3" }) },
      { label: "FF4 Payments", icon: Receipt, go: (a) => a.nav("approvals", { seg: "FF4" }) },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Budget Summary", icon: Wallet, go: (a) => a.nav("budget") },
      { label: "Commitments", icon: Landmark, go: (a) => a.nav("commitments") },
      { label: "Audit Trail", icon: ScrollText, go: (a) => a.nav("audit") },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Notifications", icon: Bell, go: (a) => a.setTab("notifications") },
      { label: "Reports", icon: PieChart, go: (a) => a.setTab("reports") },
      { label: "Profile", icon: UserRound, go: (a) => a.nav("profile") },
      { label: "Settings", icon: Settings, go: (a) => a.nav("settings") },
    ],
  },
];

export function MoreMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const api = useApp();
  const handle = (item: Item) => {
    item.go(api);
    onOpenChange(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-7">
          {/* profile header */}
          <button
            onClick={() => handle({ label: "", icon: UserRound, go: (a) => a.nav("profile") })}
            className="mb-5 mt-1 flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-3 text-left transition active:scale-[0.99]"
          >
            <InitialsAvatar name={api.registrar?.name ?? "Registrar"} className="size-12 text-base" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[17px] text-foreground">{api.registrar?.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">{api.registrar?.position} · {api.registrar?.email}</p>
            </div>
          </button>

          <div className="space-y-5">
            {SECTIONS.map((sec) => (
              <div key={sec.title}>
                <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{sec.title}</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {sec.items.map((it) => (
                    <button
                      key={it.label}
                      onClick={() => handle(it)}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/50 bg-background/50 px-1 py-3 text-center transition active:scale-95 hover:bg-accent"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                        <it.icon className="size-[18px]" />
                      </span>
                      <span className="text-[10.5px] font-medium leading-tight text-foreground/80">{it.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { onOpenChange(false); api.signOut(); }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/8 py-3.5 text-sm font-semibold text-destructive transition active:scale-[0.99]"
          >
            <LogOut className="size-4" /> Sign out
          </button>
      </div>
    </BottomSheet>
  );
}
