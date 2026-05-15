"use client";

import { useEffect } from "react";

export function SwRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // 개발 환경: 서비스워커 완전 비활성화 + 기존 등록 해제 + 캐시 삭제
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
      console.log("Service worker disabled in development");
      return;
    }

    // 프로덕션 환경에서만 등록
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[SW] 새 버전 준비됨, 다음 방문 시 적용됩니다.");
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] 등록 실패:", err);
      });
  }, []);

  return null;
}
