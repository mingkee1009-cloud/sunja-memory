"use client";

import { useState, useEffect } from "react";

// Chrome/Edge에서 발생하는 beforeinstallprompt 이벤트 타입
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA 설치 안내 배너
 * - Android/Chrome: 시스템 설치 프롬프트 연동
 * - iOS Safari: 수동 안내 (공유 → 홈 화면에 추가)
 * - 이미 설치됐거나 배너를 닫으면 숨김
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // 이미 standalone(설치됨) 상태면 표시 안 함
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    // 이번 세션에서 이미 닫은 경우 표시 안 함
    if (sessionStorage.getItem("install-prompt-dismissed")) return;

    // iOS 감지
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // iOS는 Safari에서만 동작 (크롬 앱 내에서는 제외)
      const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
      if (isSafari) {
        // 약간의 딜레이 후 표시 (앱 첫 로딩 직후 바로 띄우지 않음)
        const timer = setTimeout(() => setVisible(true), 3000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Android/Chrome: beforeinstallprompt 이벤트 수신
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("install-prompt-dismissed", "1");
  };

  if (!visible) return null;

  // ── iOS 안내 배너 ─────────────────────────────────────────
  if (isIOS) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe animate-slide-up"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div
          className="mx-auto max-w-md rounded-2xl p-4 shadow-xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-start gap-3">
            {/* 아이콘 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="기억창고 아이콘"
              className="w-12 h-12 rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                홈 화면에 추가하면 더 편해요!
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Safari 하단{" "}
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                >
                  공유
                  {/* 공유 아이콘 */}
                  <svg viewBox="0 0 18 18" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 1v10M5 4l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 10v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" strokeLinecap="round" />
                  </svg>
                </span>{" "}
                버튼을 누른 후{" "}
                <strong style={{ color: "var(--text)" }}>홈 화면에 추가</strong>를 탭하세요
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-sm"
              style={{ color: "var(--text-muted)", background: "var(--border)" }}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Android/Chrome 설치 배너 ──────────────────────────────
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 animate-slide-up"
    >
      <div
        className="mx-auto max-w-md rounded-2xl p-4 shadow-xl"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt="기억창고 아이콘"
            className="w-12 h-12 rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              기억창고
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              홈 화면에 추가하면 더 편하게 사용할 수 있어요
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{
                background: "var(--border)",
                color: "var(--text-muted)",
              }}
            >
              나중에
            </button>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-60"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {installing ? "설치 중..." : "설치하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
