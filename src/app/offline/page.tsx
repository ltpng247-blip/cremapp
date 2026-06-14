"use client";

import * as React from "react";
import { CloudOff, RefreshCw, FileText } from "lucide-react";

export default function OfflinePage() {
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    const onOnline = () => { window.location.replace("/"); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const retry = () => {
    setRetrying(true);
    window.location.replace("/");
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[hsl(224_55%_9%)] px-8 text-center text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(120% 70% at 50% -10%, hsl(224 55% 20% / 0.85), transparent 60%)" }}
      />
      <div className="relative z-10 flex max-w-sm flex-col items-center">
        <div className="mb-6 grid size-20 place-items-center rounded-3xl border border-white/15 bg-white/5 backdrop-blur">
          <CloudOff className="size-9 text-gold" />
        </div>
        <h1 className="font-display text-3xl">You are currently offline</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/65">
          Some approval actions require an internet connection. Previously loaded
          approvals may still be viewed. Please reconnect to continue submitting
          approvals.
        </p>

        <button
          onClick={retry}
          disabled={retrying}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gold px-6 py-3.5 text-[15px] font-semibold text-gold-foreground transition active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={retrying ? "size-4 animate-spin" : "size-4"} />
          {retrying ? "Reconnecting…" : "Try again"}
        </button>

        <div className="mt-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] text-white/55">
          <FileText className="size-3.5" /> CREMAPP · Court Registry & Expense Monitoring
        </div>
      </div>
    </main>
  );
}
