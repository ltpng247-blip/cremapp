"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { AppHeader } from "@/components/app/app-header";
import { InitialsAvatar, SectionLabel } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLocalState } from "@/lib/use-local-state";
import { INSTITUTION } from "@/lib/supabase/constants";
import {
  BadgeCheck,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserCog,
} from "lucide-react";

interface Delegation {
  active: boolean;
  delegate: string;
  start: string;
  end: string;
  ff3: boolean;
  ff4: boolean;
  max: string;
}
const DEFAULT_DELEGATION: Delegation = {
  active: false,
  delegate: "Daniel Achebe (Deputy Registrar)",
  start: "",
  end: "",
  ff3: true,
  ff4: false,
  max: "20000",
};

export function ProfileScreen() {
  const { registrar, back, signOut } = useApp();
  const [del, setDel] = useLocalState<Delegation>("njss.delegation", DEFAULT_DELEGATION);

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Profile" subtitle="Identity & delegation" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8 pt-3">
        {/* identity */}
        <div className="grain relative overflow-hidden rounded-2xl bg-[hsl(224_58%_15%)] p-5 text-white">
          <div className="flex items-center gap-4">
            <InitialsAvatar name={registrar?.name ?? "R"} className="size-16 text-xl ring-2 ring-white/15" />
            <div className="min-w-0">
              <p className="font-display text-xl">{registrar?.name}</p>
              <p className="text-[13px] text-white/65">{registrar?.position}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                <BadgeCheck className="size-3" /> Verified approver
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-[12.5px] text-white/75">
            <p className="flex items-center gap-2"><Mail className="size-3.5 text-white/50" /> {registrar?.email}</p>
            <p className="flex items-center gap-2"><Phone className="size-3.5 text-white/50" /> +675 — — —</p>
            <p className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-white/50" /> {INSTITUTION}</p>
          </div>
        </div>

        {/* roles */}
        {registrar && registrar.roles.length > 0 && (
          <div className="mt-3">
            <SectionLabel className="px-1">Assigned roles</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {registrar.roles.map((r) => (
                <span key={r} className="rounded-full border border-border bg-card px-3 py-1 text-[12px] font-medium text-foreground/80">{r}</span>
              ))}
            </div>
          </div>
        )}

        {/* delegation */}
        <div className="mt-5">
          <SectionLabel className="px-1">Approval delegation</SectionLabel>
          <div className="mt-2 rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><UserCog className="size-4" /></span>
                <div>
                  <p className="text-[13.5px] font-semibold text-foreground">Delegate authority</p>
                  <p className="text-[12px] text-muted-foreground">{del.active ? "Active while you're away" : "Currently disabled"}</p>
                </div>
              </div>
              <Switch checked={del.active} onCheckedChange={(v) => setDel((d) => ({ ...d, active: v }))} />
            </div>

            {del.active && (
              <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                <LabeledInput label="Delegate to" value={del.delegate} onChange={(v) => setDel((d) => ({ ...d, delegate: v }))} />
                <div className="grid grid-cols-2 gap-3">
                  <LabeledInput type="date" label="From" value={del.start} onChange={(v) => setDel((d) => ({ ...d, start: v }))} />
                  <LabeledInput type="date" label="To" value={del.end} onChange={(v) => setDel((d) => ({ ...d, end: v }))} />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Scope</p>
                  <div className="flex gap-2">
                    <ScopeChip active={del.ff3} onClick={() => setDel((d) => ({ ...d, ff3: !d.ff3 }))}>FF3 requisitions</ScopeChip>
                    <ScopeChip active={del.ff4} onClick={() => setDel((d) => ({ ...d, ff4: !d.ff4 }))}>FF4 payments</ScopeChip>
                  </div>
                </div>
                <LabeledInput type="number" label="Maximum amount (K)" value={del.max} onChange={(v) => setDel((d) => ({ ...d, max: v }))} />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => { setDel(DEFAULT_DELEGATION); toast.success("Delegation revoked"); }}>Revoke</Button>
                  <Button className="flex-1" onClick={() => toast.success("Delegation saved", { description: `${del.delegate} can approve while you're away.` })}>Save</Button>
                </div>
              </div>
            )}
          </div>
          {del.active && (
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">Delegated approvals will appear in the delegate's queue and remain auditable under your authority.</p>
          )}
        </div>

        {/* actions */}
        <div className="mt-5 space-y-2">
          <button onClick={() => toast.info("Password reset link sent", { description: registrar?.email })} className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-left transition active:scale-[0.99]">
            <KeyRound className="size-4 text-muted-foreground" />
            <span className="flex-1 text-[14px] font-medium text-foreground">Change password</span>
          </button>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/6 px-4 py-3 text-left text-destructive transition active:scale-[0.99]">
            <LogOut className="size-4" />
            <span className="flex-1 text-[14px] font-semibold">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[14px] text-foreground focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function ScopeChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex-1 rounded-xl border px-3 py-2 text-[12px] font-medium transition active:scale-95", active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground")}>
      {children}
    </button>
  );
}
