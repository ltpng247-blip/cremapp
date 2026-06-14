"use client";

import * as React from "react";
import { usePwa } from "./pwa-provider";
import { useLocalState } from "@/lib/use-local-state";
import { ArrowDownToLine, RefreshCw, Share, X, Plus } from "lucide-react";

export function PwaBanners() {
  const { canInstall, isStandalone, isIos, updateReady, promptInstall, applyUpdate } = usePwa();
  const [installDismissed, setInstallDismissed] = useLocalState("njss.installDismissed", false);
  const [iosHintDismissed, setIosHintDismissed] = useLocalState("njss.iosHintDismissed", false);

  if (updateReady) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-gold/30 bg-gold/12 px-4 py-2 text-[12.5px] text-foreground">
        <RefreshCw className="size-3.5 text-gold" />
        <span className="flex-1 font-medium">A new version is available.</span>
        <button onClick={applyUpdate} className="rounded-full bg-gold px-3 py-1 text-[12px] font-bold text-gold-foreground">
          Refresh
        </button>
      </div>
    );
  }

  if (canInstall && !isStandalone && !installDismissed) {
    return (
      <div className="flex shrink-0 items-center gap-2.5 border-b border-primary/20 bg-primary/[0.06] px-4 py-2">
        <ArrowDownToLine className="size-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-tight text-foreground">Install CREMAPP</p>
          <p className="truncate text-[11px] text-muted-foreground">Add to your home screen for full-screen access.</p>
        </div>
        <button
          onClick={async () => { const ok = await promptInstall(); if (!ok) setInstallDismissed(true); }}
          className="rounded-full bg-primary px-3 py-1 text-[12px] font-bold text-primary-foreground"
        >
          Install
        </button>
        <button onClick={() => setInstallDismissed(true)} className="text-muted-foreground" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  // iOS Safari can't fire beforeinstallprompt — show a manual hint once.
  if (isIos && !isStandalone && !iosHintDismissed) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b border-primary/20 bg-primary/[0.06] px-4 py-2 text-[12px] text-foreground">
        <span className="flex-1">
          Install: tap <Share className="mx-0.5 inline size-3.5 align-text-bottom text-primary" /> then{" "}
          <span className="inline-flex items-center gap-0.5 font-semibold"><Plus className="size-3" /> Add to Home Screen</span>
        </span>
        <button onClick={() => setIosHintDismissed(true)} className="text-muted-foreground" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return null;
}
