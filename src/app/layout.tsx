import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "기억창고",
  description: "소중한 기억을 간직하는 나만의 공간",
  openGraph: {
    title: "기억창고",
    description: "소중한 기억을 간직하는 나만의 공간",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)",  color: "#4c1d95" },
  ],
  viewportFit: "cover",
};

// 이전 Service Worker 완전 해제 스크립트 (단순 문자열로 분리해 JSX 파싱 오류 방지)
const SW_CLEANUP =
  "if('serviceWorker' in navigator){" +
    "navigator.serviceWorker.getRegistrations().then(function(r){" +
      "r.forEach(function(s){s.unregister();});" +
    "});" +
    "caches.keys().then(function(k){" +
      "k.forEach(function(n){caches.delete(n);});" +
    "});" +
  "}";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="기억창고" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
        <meta name="theme-color" content="#7c3aed" />
        <script dangerouslySetInnerHTML={{ __html: SW_CLEANUP }} />
      </head>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
