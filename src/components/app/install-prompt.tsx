"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { usePwa } from "./pwa-provider";
import { BottomSheet } from "./overlay";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import {
  ArrowDownToLine,
  CheckCircle2,
  MoreVertical,
  Plus,
  Share,
  Smartphone,
} from "lucide-react";

/**
 * A self-contained "Install app" affordance.
 * - On Android Chrome it fires the native install prompt when available.
 * - Otherwise (iOS Safari, prompt not yet ready) it opens a help sheet with
 *   exact, platform-specific steps so the user is never stuck.
 */
export function InstallButton({
  tone = "gold",
  className,
  label = "Install app",
}: {
  tone?: "gold" | "light";
  className?: string;
  label?: string;
}) {
  const { canInstall, isStandalone, isIos, promptInstall } = usePwa();
  const [helpOpen, setHelpOpen] = React.useState(false);

  if (isStandalone) return null;

  const onClick = async () => {
    if (canInstall) {
      const ok = await promptInstall();
      if (!ok) setHelpOpen(true);
    } else {
      setHelpOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold transition active:scale-[0.98]",
          tone === "gold"
            ? "bg-gold text-gold-foreground shadow-lg shadow-gold/20"
            : "border border-white/15 bg-white/5 text-white/90 backdrop-blur",
          className,
        )}
      >
        <ArrowDownToLine className="size-5" />
        {label}
      </button>
      <InstallHelpSheet
        open={helpOpen}
        onOpenChange={setHelpOpen}
        isIos={isIos}
        canInstall={canInstall}
        onInstall={async () => {
          const ok = await promptInstall();
          if (ok) setHelpOpen(false);
        }}
      />
    </>
  );
}

/** Slim, high-visibility banner used on the login screen. */
export function InstallBanner() {
  const { isStandalone } = usePwa();
  if (isStandalone) return null;
  return (
    <div className="mx-7 mt-3 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-3.5 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
        <Smartphone className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold leading-tight text-white">Install on this device</p>
        <p className="truncate text-[11px] text-white/55">Add CREMAPP to your home screen</p>
      </div>
      <InstallButton tone="gold" label="Install" className="w-auto px-4 py-2 text-[13px]" />
    </div>
  );
}

function InstallHelpSheet({
  open,
  onOpenChange,
  isIos,
  canInstall,
  onInstall,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isIos: boolean;
  canInstall: boolean;
  onInstall: () => void;
}) {
  const androidSteps: { icon: any; text: React.ReactNode }[] = [
    { icon: MoreVertical, text: <>Tap the <b>⋮ menu</b> in the top-right of Chrome</> },
    { icon: ArrowDownToLine, text: <>Tap <b>“Install app”</b> (or <b>“Add to Home screen”</b>)</> },
    { icon: CheckCircle2, text: <>Tap <b>Install</b> to confirm</> },
  ];
  const iosSteps: { icon: any; text: React.ReactNode }[] = [
    { icon: Share, text: <>Tap the <b>Share</b> icon in the Safari toolbar</> },
    { icon: Plus, text: <>Choose <b>“Add to Home Screen”</b></> },
    { icon: CheckCircle2, text: <>Tap <b>Add</b> in the top-right</> },
  ];
  const steps = isIos ? iosSteps : androidSteps;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <div className="mx-auto w-full max-w-[420px] px-5 pb-7 pt-1">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Logo className="size-7 text-primary" />
          </span>
          <div>
            <p className="font-display text-xl leading-tight">Install CREMAPP</p>
            <p className="text-[13px] text-muted-foreground">
              {isIos ? "On iPhone / iPad (Safari)" : "On Android (Chrome)"}
            </p>
          </div>
        </div>

        {canInstall && (
          <Button variant="gold" size="lg" className="mt-4 w-full" onClick={onInstall}>
            <ArrowDownToLine className="size-4" /> Install now
          </Button>
        )}

        <ol className="mt-4 space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/60 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-[18px]" />
              </span>
              <span className="flex-1 text-[13.5px] text-foreground">
                <span className="mr-1.5 font-bold text-muted-foreground">{i + 1}.</span>
                {s.text}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-muted-foreground">
          Make sure you opened the app at{" "}
          <span className="font-semibold text-foreground">njsscremapp.netlify.app</span>.
          The install option does not appear on preview links.
        </p>

        <Button variant="outline" className="mt-3 w-full" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      </div>
    </BottomSheet>
  );
}
