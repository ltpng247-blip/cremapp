"use client";

import * as React from "react";
import { useApp } from "@/components/app/app-provider";
import { StatusBar } from "@/components/app/phone-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_PASSWORD, INSTITUTION, REGISTRAR_EMAIL } from "@/lib/supabase/constants";
import { Logo } from "@/components/app/logo";
import {
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

export function LoginScreen() {
  const { signIn, signingIn, authError } = useApp();
  const [email, setEmail] = React.useState(REGISTRAR_EMAIL);
  const [password, setPassword] = React.useState(DEMO_PASSWORD);
  const [show, setShow] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
    } catch {
      /* handled in provider (authError) */
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-[hsl(224_55%_9%)] text-white">
      {/* atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 50% -10%, hsl(224 55% 20% / 0.9), transparent 60%), radial-gradient(90% 60% at 110% 20%, hsl(41 58% 40% / 0.28), transparent 55%)",
        }}
      />
      <div className="relative z-10 flex h-full flex-col">
        <StatusBar tone="light" />

        <div className="flex flex-1 flex-col overflow-y-auto px-7 pb-8">
          {/* Brand */}
          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-10 animate-rise">
              <div className="mb-6 grid size-16 place-items-center rounded-2xl border border-white/15 bg-white/5 shadow-lg backdrop-blur">
                <Logo className="size-11 text-gold" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                {INSTITUTION}
              </p>
              <h1 className="mt-2 font-display text-[1.95rem] leading-[1.12]">
                Court Registry &
                <br />
                <span className="text-gold">Expense Monitoring System</span>
              </h1>
              <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-white/55">
                Secure access to FF3 requisitions &amp; FF4 payments.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-3.5 animate-rise" style={{ animationDelay: "0.08s" }}>
              <Field icon={Mail} label="Official email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full bg-transparent text-[15px] text-white placeholder:text-white/30 focus:outline-none"
                  placeholder="name@pngjudiciary.gov.pg"
                />
              </Field>
              <Field icon={Lock} label="Password">
                <div className="flex items-center gap-2">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full bg-transparent text-[15px] text-white placeholder:text-white/30 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} className="text-white/50 hover:text-white">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              {authError && (
                <p className="rounded-lg bg-destructive/20 px-3 py-2 text-[13px] text-red-200">
                  {authError}
                </p>
              )}

              <Button
                type="submit"
                variant="gold"
                size="xl"
                disabled={signingIn}
                className="w-full"
              >
                {signingIn ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
                {signingIn ? "Verifying…" : "Sign in securely"}
              </Button>

              <div className="flex items-center justify-between pt-1 text-[13px] text-white/55">
                <button type="button" className="inline-flex items-center gap-1.5 hover:text-white">
                  <KeyRound className="size-3.5" /> Reset password
                </button>
                <span className="inline-flex items-center gap-1.5">
                  <Smartphone className="size-3.5 text-success" /> Device registered
                </span>
              </div>
            </form>
          </div>

          {/* Biometric + security footer */}
          <div className="mt-8 animate-rise" style={{ animationDelay: "0.16s" }}>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-widest text-white/35">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <button
              type="button"
              onClick={submit}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-semibold text-white/90 backdrop-blur transition active:scale-[0.98]"
            >
              <Fingerprint className="size-5 text-gold" />
              Unlock with biometrics
            </button>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/40">
              <ShieldCheck className="size-3.5" />
              Protected by two-factor authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2.5 backdrop-blur transition focus-within:border-gold/50 focus-within:bg-white/[0.09]">
      <span className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/45">
        <Icon className="size-3" /> {label}
      </span>
      {children}
    </label>
  );
}
