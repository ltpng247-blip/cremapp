"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { usePwa } from "@/components/app/pwa-provider";
import { AppHeader } from "@/components/app/app-header";
import { SectionLabel } from "@/components/app/primitives";
import { Switch } from "@/components/ui/switch";
import { useLocalState } from "@/lib/use-local-state";
import {
  ArrowDownToLine,
  BellRing,
  Bell,
  CheckCircle2,
  Fingerprint,
  Info,
  Lock,
  LogOut,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Timer,
} from "lucide-react";

interface Prefs {
  biometric: boolean;
  twoFactor: boolean;
  autoLock: number;
  mobileAlerts: boolean;
  ff3: boolean;
  ff4: boolean;
  urgent: boolean;
  budget: boolean;
  payments: boolean;
  reminders: boolean;
}
const DEFAULT: Prefs = {
  biometric: true, twoFactor: true, autoLock: 5,
  mobileAlerts: true, ff3: true, ff4: true, urgent: true, budget: true, payments: true, reminders: true,
};

export function SettingsScreen() {
  const { back, lock, signOut } = useApp();
  const { canInstall, isStandalone, isIos, updateReady, notificationsEnabled, notificationsSupported, promptInstall, applyUpdate, enableNotifications } = usePwa();
  const [p, setP] = useLocalState<Prefs>("njss.prefs", DEFAULT);
  const toggle = (k: keyof Prefs) => setP((s) => ({ ...s, [k]: !s[k] }));

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Settings" subtitle="Security & preferences" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8 pt-3">
        {/* App / PWA */}
        <SectionLabel className="px-1">App</SectionLabel>
        <div className="mt-2 divide-y divide-border/50 rounded-2xl border border-border/70 bg-card">
          {isStandalone ? (
            <Row icon={CheckCircle2} title="Installed" desc="Running as an installed app">
              <span className="rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-bold text-success">Standalone</span>
            </Row>
          ) : (
            <button
              onClick={async () => { if (canInstall) { await promptInstall(); } else { toast.info(isIos ? "On iPhone/iPad: tap Share, then Add to Home Screen" : "Open the browser menu and choose Install / Add to Home Screen"); } }}
              className="flex w-full items-center gap-3 p-4 text-left transition active:bg-accent"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><ArrowDownToLine className="size-4" /></span>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground">Install CREMAPP</p>
                <p className="text-[12px] text-muted-foreground">Add to home screen · launch full-screen</p>
              </div>
            </button>
          )}
          <button
            onClick={async () => { const ok = await enableNotifications(); toast[ok ? "success" : "error"](ok ? "Notifications enabled" : "Notifications blocked", { description: ok ? "You'll receive approval alerts here." : "Allow notifications in your browser settings." }); }}
            className="flex w-full items-center gap-3 p-4 text-left transition active:bg-accent"
            disabled={!notificationsSupported}
          >
            <span className="grid size-9 place-items-center rounded-xl bg-gold/12 text-gold"><BellRing className="size-4" /></span>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-foreground">Push notifications</p>
              <p className="text-[12px] text-muted-foreground">{!notificationsSupported ? "Not supported on this device" : notificationsEnabled ? "Enabled on this device" : "Enable approval alerts"}</p>
            </div>
            {notificationsEnabled && <CheckCircle2 className="size-4 text-success" />}
          </button>
          {updateReady && (
            <button onClick={applyUpdate} className="flex w-full items-center gap-3 p-4 text-left transition active:bg-accent">
              <span className="grid size-9 place-items-center rounded-xl bg-info/12 text-info"><RefreshCw className="size-4" /></span>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground">Update available</p>
                <p className="text-[12px] text-muted-foreground">Refresh to the latest version</p>
              </div>
            </button>
          )}
        </div>

        {/* Security */}
        <SectionLabel className="mt-5 px-1">Security</SectionLabel>
        <div className="mt-2 divide-y divide-border/50 rounded-2xl border border-border/70 bg-card">
          <Row icon={Fingerprint} title="Biometric unlock" desc="Use Face ID / fingerprint">
            <Switch checked={p.biometric} onCheckedChange={() => toggle("biometric")} />
          </Row>
          <Row icon={ShieldCheck} title="Two-factor authentication" desc="Required for sign-in">
            <Switch checked={p.twoFactor} onCheckedChange={() => toggle("twoFactor")} />
          </Row>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Timer className="size-4" /></span>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground">Auto-lock</p>
                <p className="text-[12px] text-muted-foreground">Lock after inactivity</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {[1, 5, 15].map((m) => (
                <button key={m} onClick={() => setP((s) => ({ ...s, autoLock: m }))} className={cn("flex-1 rounded-xl border py-2 text-[12px] font-semibold transition", p.autoLock === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground")}>
                  {m} min
                </button>
              ))}
            </div>
          </div>
          <button onClick={lock} className="flex w-full items-center gap-3 p-4 text-left transition active:bg-accent">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Lock className="size-4" /></span>
            <span className="flex-1 text-[14px] font-medium text-foreground">Lock now</span>
          </button>
        </div>

        {/* Devices */}
        <SectionLabel className="mt-5 px-1">Registered devices</SectionLabel>
        <div className="mt-2 divide-y divide-border/50 rounded-2xl border border-border/70 bg-card">
          {[
            { name: "iPhone 15 Pro · Registrar", active: "Active now", current: true },
            { name: "iPad Air · Chambers", active: "2 days ago", current: false },
          ].map((d) => (
            <div key={d.name} className="flex items-center gap-3 p-4">
              <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Smartphone className="size-4" /></span>
              <div className="flex-1">
                <p className="text-[13.5px] font-medium text-foreground">{d.name}</p>
                <p className="text-[12px] text-muted-foreground">{d.active}</p>
              </div>
              {d.current ? (
                <span className="rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-bold text-success">This device</span>
              ) : (
                <button onClick={() => toast.success("Device removed")} className="text-[12px] font-semibold text-destructive">Remove</button>
              )}
            </div>
          ))}
        </div>

        {/* Notifications */}
        <SectionLabel className="mt-5 px-1">Notification preferences</SectionLabel>
        <div className="mt-2 divide-y divide-border/50 rounded-2xl border border-border/70 bg-card">
          <Row icon={Bell} title="Mobile alerts" desc="Master push toggle">
            <Switch checked={p.mobileAlerts} onCheckedChange={() => toggle("mobileAlerts")} />
          </Row>
          {([
            ["ff3", "FF3 approvals"],
            ["ff4", "FF4 payment approvals"],
            ["urgent", "Urgent & escalations"],
            ["budget", "Budget warnings"],
            ["payments", "Payment processed"],
            ["reminders", "Pending reminders"],
          ] as [keyof Prefs, string][]).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between px-4 py-3">
              <span className={cn("text-[13.5px]", p.mobileAlerts ? "text-foreground" : "text-muted-foreground/60")}>{label}</span>
              <Switch checked={p[k] as boolean} disabled={!p.mobileAlerts} onCheckedChange={() => toggle(k)} />
            </div>
          ))}
        </div>

        {/* About */}
        <SectionLabel className="mt-5 px-1">About</SectionLabel>
        <div className="mt-2 rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Info className="size-4" /></span>
            <div className="flex-1">
              <p className="text-[13.5px] font-medium text-foreground">NJSSCREMAPP</p>
              <p className="text-[12px] text-muted-foreground">Court Registry Requisition & Expense Monitoring · v1.0</p>
            </div>
          </div>
        </div>

        <button onClick={signOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/6 py-3.5 text-sm font-semibold text-destructive transition active:scale-[0.99]">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function Row({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="size-4" /></span>
      <div className="flex-1">
        <p className="text-[14px] font-medium text-foreground">{title}</p>
        <p className="text-[12px] text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}
