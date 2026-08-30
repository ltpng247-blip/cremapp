/* NJSSCREMAPP (CREMAPP) — service worker */
const VERSION = "cremapp-v2";
const SHELL = `cremapp-shell-${VERSION}`;
const STATIC = `cremapp-static-${VERSION}`;

const PRECACHE = [
  "/",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      for (const url of PRECACHE) {
        try {
          await cache.add(new Request(url, { cache: "reload" }));
        } catch (_) {
          /* best-effort */
        }
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("cremapp-supabase-") || !key.endsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

const SUPABASE_API_PATHS = [
  "/rest/v1/",
  "/auth/v1/",
  "/storage/v1/",
  "/functions/v1/",
  "/realtime/v1/",
  "/graphql/v1",
];

const isSupabaseApiRequest = (url) =>
  url.hostname.endsWith(".supabase.co") || SUPABASE_API_PATHS.some((path) => url.pathname.startsWith(path));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache mutations / approvals
  const url = new URL(req.url);

  // Authenticated Supabase traffic must always go directly to the network.
  if (isSupabaseApiRequest(url)) return;

  // App navigations: network-first -> cached shell -> offline page
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL);
          cache.put("/", fresh.clone()).catch(() => {});
          return fresh;
        } catch (_) {
          const cache = await caches.open(SHELL);
          return (await cache.match("/")) || (await cache.match("/offline")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});

/* -------------------------------- Push notifications -------------------------------- */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: "CREMAPP", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "CREMAPP";
  const priority = (payload.priority || "").toUpperCase();
  const options = {
    body: payload.body || "You have a new approval alert.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag: payload.tag || payload.reference_id || "cremapp",
    renotify: true,
    data: { url: payload.url || "/?tab=approvals", ...(payload.data || {}) },
    vibrate: [80, 40, 80],
    requireInteraction: priority === "CRITICAL" || priority === "HIGH",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          client.navigate?.(target).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })(),
  );
});
