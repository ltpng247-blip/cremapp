"use client";

import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { DEMO_PIN, DEMO_PASSWORD, REGISTRAR_EMAIL } from "@/lib/supabase/constants";

// Auto-login for preview screenshot verification only. Keep false in production.
const PREVIEW_AUTO_LOGIN = false;
import {
  fetchNotifications,
  fetchPendingFF3,
  fetchPendingFF4,
  fetchRecentFF3,
  fetchRecentFF4,
  loadRegistrarSession,
} from "@/lib/supabase/queries";
import { decideFF3, decideFF4, markAllNotificationsRead, markNotificationRead, clearNotification } from "@/lib/supabase/mutations";
import type {
  AppNotification,
  Decision,
  FF3Detail,
  FF3Summary,
  FF4Detail,
  FF4Summary,
  RegistrarSession,
} from "@/lib/types";

export type ScreenName =
  | "dashboard"
  | "approvals"
  | "ff3"
  | "ff4"
  | "budget"
  | "commitments"
  | "notifications"
  | "reports"
  | "report"
  | "audit"
  | "profile"
  | "settings";

export type TabName = "dashboard" | "approvals" | "notifications" | "reports";

export interface Route {
  screen: ScreenName;
  params?: Record<string, string>;
}

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AppState {
  authStatus: AuthStatus;
  registrar: RegistrarSession | null;
  locked: boolean;
  authError: string | null;
  signingIn: boolean;

  online: boolean;

  route: Route;
  canGoBack: boolean;
  activeTab: TabName;

  pendingFF3: FF3Summary[];
  pendingFF4: FF4Summary[];
  recentFF3: FF3Summary[];
  recentFF4: FF4Summary[];
  notifications: AppNotification[];
  dataLoading: boolean;
  lastSync: number | null;

  // actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  lock: () => void;
  unlock: (pin: string) => boolean;
  unlockBiometric: () => void;

  nav: (screen: ScreenName, params?: Record<string, string>) => void;
  back: () => void;
  setTab: (tab: TabName) => void;
  openRef: (refType: string | null, refId: string | null) => void;

  refreshAll: () => Promise<void>;
  submitFF3Decision: (d: FF3Detail, decision: Decision, comment: string) => Promise<boolean>;
  submitFF4Decision: (d: FF4Detail, decision: Decision, comment: string) => Promise<boolean>;
  readNotification: (id: string) => void;
  readAllNotifications: () => void;
  removeNotification: (id: string) => void;

  unreadCount: number;
  pendingCount: number;
}

const AppContext = React.createContext<AppState | null>(null);
export const useApp = () => {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

const AUTO_LOCK_MS = 5 * 60 * 1000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = React.useState<AuthStatus>("loading");
  const [registrar, setRegistrar] = React.useState<RegistrarSession | null>(null);
  const [locked, setLocked] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);
  const [online, setOnline] = React.useState(true);

  const [stack, setStack] = React.useState<Route[]>([{ screen: "dashboard" }]);
  const [activeTab, setActiveTab] = React.useState<TabName>("dashboard");

  const [pendingFF3, setPendingFF3] = React.useState<FF3Summary[]>([]);
  const [pendingFF4, setPendingFF4] = React.useState<FF4Summary[]>([]);
  const [recentFF3, setRecentFF3] = React.useState<FF3Summary[]>([]);
  const [recentFF4, setRecentFF4] = React.useState<FF4Summary[]>([]);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [lastSync, setLastSync] = React.useState<number | null>(null);

  const route = stack[stack.length - 1];

  /* ----------------------------------------------------- network status */
  React.useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => { setOnline(true); };
    const off = () => { setOnline(false); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  /* ------------------------------------------------------------ session */
  const applySession = React.useCallback(async (authId: string, email?: string | null) => {
    try {
      const reg = await loadRegistrarSession(authId, email);
      setRegistrar(reg);
      setAuthStatus("authenticated");
    } catch (e: any) {
      setAuthError(e?.message ?? "Could not load profile");
      setAuthStatus("authenticated");
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const s = data.session;
      if (s?.user) {
        setLocked(false);
        applySession(s.user.id, s.user.email);
      } else if (PREVIEW_AUTO_LOGIN) {
        // TEMP preview verification — auto sign in
        supabase.auth
          .signInWithPassword({ email: REGISTRAR_EMAIL, password: DEMO_PASSWORD })
          .then(({ data: d }) => {
            if (!active) return;
            if (d?.user) { setLocked(false); applySession(d.user.id, d.user.email); }
            else setAuthStatus("unauthenticated");
          });
      } else {
        setAuthStatus("unauthenticated");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setRegistrar(null);
        setAuthStatus("unauthenticated");
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [applySession]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setAuthError(error.message);
      setSigningIn(false);
      throw error;
    }
    setLocked(false);
    setStack([{ screen: "dashboard" }]);
    setActiveTab("dashboard");
    if (data.user) await applySession(data.user.id, data.user.email);
    setSigningIn(false);
  }, [applySession]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setRegistrar(null);
    setAuthStatus("unauthenticated");
    setLocked(false);
    setPendingFF3([]); setPendingFF4([]); setNotifications([]);
  }, []);

  const lock = React.useCallback(() => setLocked(true), []);
  const unlock = React.useCallback((pin: string) => {
    if (pin === DEMO_PIN) { setLocked(false); return true; }
    return false;
  }, []);
  const unlockBiometric = React.useCallback(() => setLocked(false), []);

  /* -------------------------------------------------- inactivity auto-lock */
  const lastActivity = React.useRef(Date.now());
  React.useEffect(() => {
    if (authStatus !== "authenticated" || locked) return;
    const bump = () => { lastActivity.current = Date.now(); };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump));
    const id = window.setInterval(() => {
      if (Date.now() - lastActivity.current > AUTO_LOCK_MS) setLocked(true);
    }, 15000);
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); window.clearInterval(id); };
  }, [authStatus, locked]);

  /* ------------------------------------------------------------ data */
  const refreshAll = React.useCallback(async () => {
    if (!registrar) return;
    setDataLoading(true);
    try {
      const [p3, p4, r3, r4, notifs] = await Promise.all([
        fetchPendingFF3().catch(() => []),
        fetchPendingFF4().catch(() => []),
        fetchRecentFF3(20).catch(() => []),
        fetchRecentFF4(20).catch(() => []),
        registrar.userId ? fetchNotifications(registrar.userId).catch(() => []) : Promise.resolve([]),
      ]);
      setPendingFF3(p3); setPendingFF4(p4); setRecentFF3(r3); setRecentFF4(r4);
      setNotifications(notifs);
      setLastSync(Date.now());
    } finally {
      setDataLoading(false);
    }
  }, [registrar]);

  React.useEffect(() => {
    if (authStatus === "authenticated" && !locked && registrar) refreshAll();
  }, [authStatus, locked, registrar, refreshAll]);

  // Light background sync for "instant" alerts.
  React.useEffect(() => {
    if (authStatus !== "authenticated" || locked || !online) return;
    const id = window.setInterval(() => { refreshAll(); }, 60000);
    return () => window.clearInterval(id);
  }, [authStatus, locked, online, refreshAll]);

  /* ----------------------------------------------------- navigation */
  const nav = React.useCallback((screen: ScreenName, params?: Record<string, string>) => {
    setStack((s) => [...s, { screen, params }]);
  }, []);
  const back = React.useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);
  const setTab = React.useCallback((tab: TabName) => {
    setActiveTab(tab);
    setStack([{ screen: tab }]);
  }, []);

  // Deep-link from PWA manifest shortcuts: /?tab=approvals
  const shortcutApplied = React.useRef(false);
  React.useEffect(() => {
    if (authStatus !== "authenticated" || locked || shortcutApplied.current) return;
    shortcutApplied.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") || window.location.hash.replace("#", "");
      if (["dashboard", "approvals", "notifications", "reports"].includes(tab)) {
        setTab(tab as TabName);
      }
    } catch {
      /* ignore */
    }
  }, [authStatus, locked, setTab]);
  const openRef = React.useCallback((refType: string | null, refId: string | null) => {
    if (!refType || !refId) return;
    const t = refType.toUpperCase();
    if (t === "FF3") {
      const m = pendingFF3.find((x) => x.ff3_number === refId) || recentFF3.find((x) => x.ff3_number === refId);
      if (m) nav("ff3", { id: m.id });
      else { setActiveTab("approvals"); setStack([{ screen: "approvals" }]); }
    } else if (t === "FF4") {
      const m = pendingFF4.find((x) => x.ff4_number === refId) || recentFF4.find((x) => x.ff4_number === refId);
      if (m) nav("ff4", { id: m.id });
      else { setActiveTab("approvals"); setStack([{ screen: "approvals" }]); }
    }
  }, [pendingFF3, pendingFF4, recentFF3, recentFF4, nav]);

  /* ----------------------------------------------------- decisions */
  const submitFF3Decision = React.useCallback(async (d: FF3Detail, decision: Decision, comment: string) => {
    if (!online) { toast.error("You are offline", { description: "Reconnect to submit this decision." }); return false; }
    try {
      await decideFF3({
        ff3: {
          id: d.id, ff3_number: d.ff3_number, expense_code_registry_id: d.expense_code_registry_id,
          financial_year: d.financial_year, total_estimated_amount: d.total_estimated_amount,
          requesting_officer_id: d.requesting_officer_id,
        },
        decision, comment,
        registrar: { userId: registrar?.userId ?? null, name: registrar?.name ?? "Registrar" },
      });
      const verb = decision === "APPROVED" ? "approved" : decision === "REJECTED" ? "rejected" : "returned";
      toast.success(`${d.ff3_number} ${verb}`, { description: decision === "APPROVED" ? "Commitment raised. The system has been updated." : "The requesting officer has been notified." });
      await refreshAll();
      return true;
    } catch (e: any) {
      toast.error("Could not submit decision", { description: e?.message ?? "Please try again." });
      return false;
    }
  }, [online, registrar, refreshAll]);

  const submitFF4Decision = React.useCallback(async (d: FF4Detail, decision: Decision, comment: string) => {
    if (!online) { toast.error("You are offline", { description: "Reconnect to submit this decision." }); return false; }
    if (decision === "APPROVED" && d.commitment?.exceeds) {
      toast.error("Approval blocked", { description: "Payment exceeds the remaining commitment balance." });
      return false;
    }
    try {
      await decideFF4({
        ff4: { id: d.id, ff4_number: d.ff4_number, net_amount: d.net_amount, payee_name: d.payee_name, commitment: d.commitment, ff3_header_id: d.ff3_header_id },
        decision, comment,
        registrar: { userId: registrar?.userId ?? null, name: registrar?.name ?? "Registrar" },
      });
      const verb = decision === "APPROVED" ? "approved" : decision === "REJECTED" ? "rejected" : "returned";
      toast.success(`${d.ff4_number} ${verb}`, { description: "Payment status updated across the system." });
      await refreshAll();
      return true;
    } catch (e: any) {
      toast.error("Could not submit decision", { description: e?.message ?? "Please try again." });
      return false;
    }
  }, [online, registrar, refreshAll]);

  const readNotification = React.useCallback((id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    markNotificationRead(id);
  }, []);
  const readAllNotifications = React.useCallback(() => {
    if (!registrar?.userId) return;
    setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));
    markAllNotificationsRead(registrar.userId);
  }, [registrar]);
  const removeNotification = React.useCallback((id: string) => {
    setNotifications((ns) => ns.filter((n) => n.id !== id));
    clearNotification(id);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const pendingCount = pendingFF3.length + pendingFF4.length;

  const value: AppState = {
    authStatus, registrar, locked, authError, signingIn, online,
    route, canGoBack: stack.length > 1, activeTab,
    pendingFF3, pendingFF4, recentFF3, recentFF4, notifications, dataLoading, lastSync,
    signIn, signOut, lock, unlock, unlockBiometric,
    nav, back, setTab, openRef,
    refreshAll, submitFF3Decision, submitFF4Decision,
    readNotification, readAllNotifications, removeNotification,
    unreadCount, pendingCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export { REGISTRAR_EMAIL };
