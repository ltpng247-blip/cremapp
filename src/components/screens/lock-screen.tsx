"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-provider";
import { StatusBar } from "@/components/app/phone-frame";
import { InitialsAvatar } from "@/components/app/primitives";
import { DEMO_PIN } from "@/lib/supabase/constants";
import { Delete, Fingerprint, Lock } from "lucide-react";

export function LockScreen() {
  const { registrar, unlock, unlockBiometric, signOut } = useApp();
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState(false);

  const press = (d: string) => {
    setError(false);
    setPin((p) => {
      const next = (p + d).slice(0, 4);
      if (next.length === 4) {
        setTimeout(() => {
          const ok = unlock(next);
          if (!ok) {
            setError(true);
            setPin("");
          }
        }, 120);
      }
      return next;
    });
  };
  const del = () => { setError(false); setPin((p) => p.slice(0, -1)); };

  return (
    <div className="relative flex h-full flex-col bg-[hsl(224_55%_9%)] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(120% 70% at 50% -10%, hsl(224 55% 20% / 0.85), transparent 60%)" }}
      />
      <div className="relative z-10 flex h-full flex-col">
        <StatusBar tone="light" />

        <div className="flex flex-col items-center px-8 pt-8">
          <InitialsAvatar name={registrar?.name ?? "Registrar"} className="size-16 text-xl shadow-lg ring-2 ring-white/10" />
          <p className="mt-4 font-display text-2xl">{registrar?.name ?? "Registrar"}</p>
          <p className="text-sm text-white/50">{registrar?.position ?? "Registrar"}</p>

          <div className={cn("mt-8 flex items-center gap-3.5", error && "animate-shake")}>

            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "size-3.5 rounded-full border transition-all",
                  i < pin.length ? "scale-110 border-gold bg-gold" : "border-white/30 bg-transparent",
                  error && "border-destructive",
                )}
              />
            ))}
          </div>
          <p className={cn("mt-3 h-5 text-[13px]", error ? "text-red-300" : "text-white/40")}>
            {error ? "Incorrect PIN — try again" : "Enter your 4-digit PIN"}
          </p>
        </div>

        {/* Keypad */}
        <div className="mt-auto px-10 pb-8">
          <div className="grid grid-cols-3 gap-3.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <Key key={d} onClick={() => press(d)}>{d}</Key>
            ))}
            <button
              onClick={unlockBiometric}
              className="grid h-[68px] place-items-center rounded-2xl text-gold transition active:scale-95"
              aria-label="Biometric unlock"
            >
              <Fingerprint className="size-7" />
            </button>
            <Key onClick={() => press("0")}>0</Key>
            <button
              onClick={del}
              className="grid h-[68px] place-items-center rounded-2xl text-white/70 transition active:scale-95"
              aria-label="Delete"
            >
              <Delete className="size-6" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-[13px] text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5" /> Demo PIN {DEMO_PIN}
            </span>
            <button onClick={signOut} className="font-semibold text-white/70 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Key({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-[68px] place-items-center rounded-2xl border border-white/10 bg-white/[0.06] font-display text-2xl text-white backdrop-blur transition active:scale-95 active:bg-white/15"
    >
      {children}
    </button>
  );
}
