// Push-notification helpers.
// Full server push requires a provider (VAPID/Web-Push, Firebase, OneSignal, or
// a Supabase Edge Function) to STORE subscriptions and SEND messages.
// Set NEXT_PUBLIC_VAPID_PUBLIC_KEY to enable real subscriptions; otherwise this
// enables on-device notifications (used by the in-app alert demo).

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function requestPush(reg: ServiceWorkerRegistration | null): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const registration = reg ?? (await navigator.serviceWorker?.ready.catch(() => null));

  // On-device confirmation so the user immediately sees notifications working.
  try {
    await registration?.showNotification?.("Notifications enabled", {
      body: "You'll receive FF3 & FF4 approval alerts, budget warnings and overdue reminders here.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      tag: "njss-welcome",
    });
  } catch {
    /* ignore */
  }

  // Real Web-Push subscription (only when a VAPID public key is configured).
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (vapid && registration && "pushManager" in registration) {
    try {
      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        }));
      // TODO(server): persist `sub` (push_subscriptions table) and send via a
      // Supabase Edge Function / web-push when NJSS events fire.
      console.info("[NJSS] push subscription ready", JSON.stringify(sub));
    } catch (e) {
      console.warn("[NJSS] push subscribe failed", e);
    }
  }
  return true;
}
