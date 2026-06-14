"use client";

import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { useApp } from "./app-provider";
import { PhoneFrame, StatusBar } from "./phone-frame";
import { BottomNav } from "./bottom-nav";
import { MoreMenu } from "./more-menu";
import { PwaBanners } from "./pwa-banners";
import { LoginScreen } from "@/components/screens/login-screen";
import { LockScreen } from "@/components/screens/lock-screen";
import { DashboardScreen } from "@/components/screens/dashboard-screen";
import { ApprovalsScreen } from "@/components/screens/approvals-screen";
import { FF3DetailScreen } from "@/components/screens/ff3-detail-screen";
import { FF4DetailScreen } from "@/components/screens/ff4-detail-screen";
import { BudgetScreen } from "@/components/screens/budget-screen";
import { CommitmentsScreen } from "@/components/screens/commitments-screen";
import { NotificationsScreen } from "@/components/screens/notifications-screen";
import { ReportsScreen } from "@/components/screens/reports-screen";
import { ReportScreen } from "@/components/screens/report-screen";
import { AuditScreen } from "@/components/screens/audit-screen";
import { ProfileScreen } from "@/components/screens/profile-screen";
import { SettingsScreen } from "@/components/screens/settings-screen";
import { Logo } from "./logo";
import { Loader2 } from "lucide-react";

function ScreenRouter({ screen }: { screen: string }) {
  switch (screen) {
    case "approvals": return <ApprovalsScreen />;
    case "ff3": return <FF3DetailScreen />;
    case "ff4": return <FF4DetailScreen />;
    case "budget": return <BudgetScreen />;
    case "commitments": return <CommitmentsScreen />;
    case "notifications": return <NotificationsScreen />;
    case "reports": return <ReportsScreen />;
    case "report": return <ReportScreen />;
    case "audit": return <AuditScreen />;
    case "profile": return <ProfileScreen />;
    case "settings": return <SettingsScreen />;
    default: return <DashboardScreen />;
  }
}

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[hsl(224_55%_9%)] text-white">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl border border-white/15 bg-white/5">
        <Logo className="size-11 text-gold" />
      </div>
      <p className="font-display text-2xl">NJSS · CREMAPP</p>
      <p className="mt-1 text-sm text-white/50">Securing your session…</p>
      <Loader2 className="mt-5 size-5 animate-spin text-gold" />
    </div>
  );
}

function Inner() {
  const { authStatus, locked, route, canGoBack } = useApp();
  const [moreOpen, setMoreOpen] = React.useState(false);

  if (authStatus === "loading") return <Splash />;
  if (authStatus === "unauthenticated") return <LoginScreen />;
  if (locked) return <LockScreen />;

  return (
    <div className="flex h-full flex-col">
      <StatusBar tone="dark" />
      <PwaBanners />
      <main className="relative flex-1 overflow-hidden">
        <div key={route.screen + JSON.stringify(route.params ?? {})} className="animate-screen-in h-full">
          <ScreenRouter screen={route.screen} />
        </div>
      </main>
      {!canGoBack && <BottomNav onMore={() => setMoreOpen(true)} />}
      <MoreMenu open={moreOpen} onOpenChange={setMoreOpen} />
      <Toaster position="top-center" richColors closeButton theme="light" />
    </div>
  );
}

export function AppShell() {
  return (
    <PhoneFrame>
      <Inner />
    </PhoneFrame>
  );
}
