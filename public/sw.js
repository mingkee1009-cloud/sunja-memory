// Service Worker 완전 제거용 — 캐시 삭제 + 자기 해제
self.addEventListener("install", () => {
  self.skipWaiting(); // 즉시 대기 건너뛰고 활성화
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1. 모든 캐시 삭제
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      // 2. 열린 탭 즉시 제어권 획득
      await self.clients.claim();
      // 3. 자기 자신 등록 해제
      await self.registration.unregister();
    })()
  );
});
