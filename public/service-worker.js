/* NJSSCREMAPP (CREMAPP) — service worker */
const VERSION = "cremapp-v1";
const SHELL = `cremapp-shell-${VERSION}`;
const STATIC = `cremapp-static-${VERSION}`;
const SUPA = `cremapp-supabase-${VERSION}`;

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
      await Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

const isSupabase = (url) => url.hostname.endsWith("supabase.co");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache mutations / approvals
  const url = new URL(req.url);

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

  // Supabase reads: network-first, fall back to last cached response when offline
  if (isSupabase(url)) {
    if (url.pathname.includes("/auth/")) return; // never cache auth
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SUPA);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch (_) {
          const cached = await caches.match(req);
          return cached || new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
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

/* -------------------------------- Background sync (reserved) ------------------------- */
self.addEventListener("sync", (event) => {
  if (event.tag === "cremapp-sync-approvals") {
    // Reserved: replay approval decisions queued while offline.
  }
});
