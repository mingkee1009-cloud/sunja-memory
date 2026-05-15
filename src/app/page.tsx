"use client";

import dynamic from "next/dynamic";

// Firebase는 브라우저에서만 실행 — ssr: false로 prerender 완전 차단
const Home = dynamic(() => import("./_home"), { ssr: false });

export default function Page() {
  return <Home />;
}
