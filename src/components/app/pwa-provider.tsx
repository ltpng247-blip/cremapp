"use client";

import * as React from "react";
import { requestPush, pushSupported } from "@/lib/push";

interface PwaState {
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  updateReady: boolean;
  notificationsEnabled: boolean;
  notificationsSupported: boolean;
  promptInstall: () => Promise<boolean>;
  applyUpdate: () => void;
  enableNotifications: () => Promise<boolean>;
}

const PwaContext = React.createContext<PwaState | null>(null);
export const usePwa = () => {
  const ctx = React.useContext(PwaContext);
  if (!ctx) throw new Error("usePwa must be used within PwaProvider");
  return ctx;
};

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = React.useState<any>(null);
  const [canInstall, setCanInstall] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [isIos, setIsIos] = React.useState(false);
  const [updateReady, setUpdateReady] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);
  const regRef = React.useRef<ServiceWorkerRegistration | null>(null);

  React.useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if (typeof Notification !== "undefined") setNotificationsEnabled(Notification.permission === "granted");

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    };
    const onInstalled = () => { setCanInstall(false); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    // The SW is also registered by an inline <head> script for earliest possible
    // installability detection. register() here is idempotent (same URL+scope)
    // and gives us the registration object for update handling.
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .then((reg) => {
        regRef.current = reg;
        if (reg.waiting) setUpdateReady(true);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      })
      .catch(() => {});
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferred) return false;
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    setCanInstall(false);
    return choice.outcome === "accepted";
  }, [deferred]);

  const applyUpdate = React.useCallback(() => {
    regRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }, []);

  const enableNotifications = React.useCallback(async () => {
    const reg = regRef.current ?? (await navigator.serviceWorker?.ready.catch(() => null)) ?? null;
    const ok = await requestPush(reg);
    setNotificationsEnabled(ok);
    return ok;
  }, []);

  const value: PwaState = {
    canInstall,
    isStandalone,
    isIos,
    updateReady,
    notificationsEnabled,
    notificationsSupported: pushSupported(),
    promptInstall,
    applyUpdate,
    enableNotifications,
  };

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
