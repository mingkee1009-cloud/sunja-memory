// Service Worker — production only
const CACHE_NAME = "kijeokchango-v1";

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS);
      })
      .catch((err) => {
        console.warn("[SW] precache failed:", err);
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const href = event.request.url;

  // 개발 환경 / 로컬 / 특수 프로토콜 — 완전히 bypass
  const shouldBypass =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.endsWith(".local") ||
    url.pathname.includes("webpack-hmr") ||
    url.pathname.startsWith("/_next/") ||
    url.protocol === "chrome-extension:" ||
    url.protocol === "moz-extension:" ||
    url.protocol === "ws:" ||
    url.protocol === "wss:" ||
    href.includes("firestore.googleapis.com") ||
    href.includes("firebase") ||
    href.includes("googleapis.com") ||
    href.includes("firebaseapp.com") ||
    href.includes("firebasestorage");

  if (shouldBypass) return;

  // Cache First for pages/static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(event.request, clone);
              } catch (err) {
                console.warn("[SW] cache.put failed:", err);
              }
            });
          }
          return response;
        })
        .catch(() => {
          if (event.request.destination === "document") {
            return caches.match("/");
          }
        });
    })
  );
});
