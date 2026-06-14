"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "./app-provider";
import { INSTITUTION } from "@/lib/supabase/constants";
import { BatteryMedium, Signal, Wifi, WifiOff, ShieldCheck, Zap, ScrollText } from "lucide-react";
import { Logo } from "./logo";

export function StatusBar({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { online } = useApp();
  const [time, setTime] = React.useState("");
  React.useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 10000);
    return () => clearInterval(id);
  }, []);
  const light = tone === "light";
  return (
    <div
      className={cn(
        "relative z-30 flex h-11 shrink-0 items-center justify-between px-6 pt-1 text-[13px] font-semibold",
        light ? "text-white/90" : "text-foreground",
      )}
    >
      <span className="tnum">{time || "09:41"}</span>
      <div className="absolute left-1/2 top-[7px] hidden h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-black/95 sm:block" />
      <div className="flex items-center gap-1.5">
        <Signal className="size-[15px]" />
        {online ? <Wifi className="size-[15px]" /> : <WifiOff className="size-[15px] text-warning" />}
        <BatteryMedium className="size-[18px]" />
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="hidden max-w-sm xl:block">
      <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur">
        <Logo className="size-4 text-gold" /> {INSTITUTION}
      </div>
      <h1 className="font-display text-5xl leading-[1.05] text-white">
        Approvals,
        <br />
        <span className="text-gold">in your pocket.</span>
      </h1>
      <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-white/65">
        Review FF3 requisitions and FF4 payments, check budget and commitment
        impact, and authorise with confidence — anywhere, in under a minute.
      </p>
      <ul className="mt-8 space-y-3.5">
        {[
          { icon: Zap, text: "Approve or reject in a single tap" },
          { icon: ShieldCheck, text: "Commitment & budget guards built in" },
          { icon: ScrollText, text: "Every decision audited in real time" },
        ].map((f) => (
          <li key={f.text} className="flex items-center gap-3 text-[15px] text-white/80">
            <span className="grid size-9 place-items-center rounded-xl bg-gold/15 text-gold">
              <f.icon className="size-4" />
            </span>
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

const PortalContext = React.createContext<HTMLElement | null>(null);
export const usePortalHost = () => React.useContext(PortalContext);

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center justify-center gap-16 px-0 sm:px-6 sm:py-8">
        <BrandPanel />
        <div className="device-frame w-full max-w-[420px] shrink-0">
          <div
            ref={setHost}
            className="device-screen grain relative flex h-[100dvh] flex-col overflow-hidden bg-background sm:h-[860px] sm:max-h-[90vh]"
          >
            <PortalContext.Provider value={host}>{children}</PortalContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
