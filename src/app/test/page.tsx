"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";

type Status = "info" | "success" | "error";
type Log = { status: Status; msg: string };

function logColor(status: Status): string {
  if (status === "success") return "#059669";
  if (status === "error")   return "#dc2626";
  return "#6b7280";
}

export default function TestPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (status: Status, msg: string) => {
    setLogs((prev) => [...prev, { status, msg }]);
  };

  const handleTest = async () => {
    console.log("test button clicked");
    setLogs([{ status: "info", msg: "테스트 시작" }]);
    setRunning(true);

    try {
      addLog("info", "Firestore 연결 확인 중...");
      const col = collection(db, "memories");
      addLog("success", "memories 컬렉션 참조 성공");

      addLog("info", "테스트 문서 저장 중...");
      const ref = await addDoc(col, {
        rawText:    "Firebase 연동 테스트",
        summary:    "테스트",
        category:   "기타",
        keywords:   [],
        place:      "기타",
        sourceType: "text",
        url:        "",
        todo:       false,
        priority:   "보통",
        isDone:     false,
        dueDate:    null,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
      });
      addLog("success", "저장 성공 — ID: " + ref.id);

      addLog("info", "최신순 조회 중...");
      const snap = await getDocs(query(col, orderBy("createdAt", "desc")));
      addLog("success", "조회 성공 — 총 " + snap.size + "개 문서");

      addLog("info", "테스트 문서 삭제 중...");
      await deleteDoc(doc(db, "memories", ref.id));
      addLog("success", "삭제 완료 — 테스트 데이터 정리됨");

      addLog("success", "모든 테스트 통과! Firebase 연동 정상");
    } catch (e) {
      console.error("[TestPage] Firestore 오류:", e);
      const msg = e instanceof Error ? e.message : String(e);
      addLog("error", "오류 발생: " + msg);
    } finally {
      setRunning(false);
    }
  };

  const envVars: [string, string | undefined][] = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY",     process.env.NEXT_PUBLIC_FIREBASE_API_KEY],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID",  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN],
    ["NEXT_PUBLIC_FIREBASE_APP_ID",      process.env.NEXT_PUBLIC_FIREBASE_APP_ID],
  ];

  const s = {
    page:    { maxWidth:"480px", margin:"0 auto", minHeight:"100vh", background:"#f9fafb", padding:"2rem 1rem", fontFamily:"-apple-system, BlinkMacSystemFont, sans-serif" },
    card:    { background:"#fff", borderRadius:"1rem", border:"1px solid #e5e7eb", padding:"1rem", marginBottom:"1rem" },
    label:   { fontSize:"0.7rem", fontWeight:700, color:"#9ca3af", textTransform:"uppercase" as const, letterSpacing:"0.05em", marginBottom:"0.75rem" },
    row:     { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.3rem 0", borderBottom:"1px solid #f3f4f6" },
    rowKey:  { fontSize:"0.75rem", color:"#6b7280" },
    btn:     { width:"100%", padding:"1rem", color:"#fff", fontWeight:700, fontSize:"1rem", border:"none", borderRadius:"1rem", marginBottom:"1rem", transition:"background 0.2s" },
    logItem: { margin:0, fontSize:"0.85rem", fontFamily:"ui-monospace, monospace", padding:"0.25rem 0", borderBottom:"1px solid #f3f4f6" },
  };

  return (
    <div style={s.page}>
      <div style={{ marginBottom:"1.5rem" }}>
        <h1 style={{ fontSize:"1.25rem", fontWeight:700, color:"#111827", margin:0 }}>
          Firebase 연동 테스트
        </h1>
        <p style={{ fontSize:"0.8rem", color:"#6b7280", marginTop:"0.25rem" }}>
          프로젝트: <strong style={{ color:"#6366f1" }}>sunja-memory</strong>
        </p>
      </div>

      <div style={s.card}>
        <p style={s.label}>환경변수 확인</p>
        {envVars.map(([label, val]) => (
          <div key={label} style={s.row}>
            <span style={s.rowKey}>{label}</span>
            <span style={{ fontSize:"0.75rem", fontWeight:600, color: val ? "#059669" : "#dc2626" }}>
              {val ? "OK: " + val.slice(0, 16) + "..." : "없음"}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handleTest}
        disabled={running}
        style={{
          ...s.btn,
          background: running ? "#a5b4fc" : "#6366f1",
          cursor: running ? "not-allowed" : "pointer",
        }}
      >
        {running ? "테스트 실행 중..." : "Firestore 연결 테스트 실행"}
      </button>

      {logs.length > 0 && (
        <div style={s.card}>
          <p style={s.label}>실행 로그</p>
          {logs.map((l, i) => (
            <p
              key={i}
              style={{
                ...s.logItem,
                color: logColor(l.status),
                background: l.status === "error" ? "#fef2f2" : "transparent",
                borderBottom: i < logs.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
            >
              {l.status === "success" ? "✅ " : l.status === "error" ? "❌ " : "→ "}
              {l.msg}
            </p>
          ))}
        </div>
      )}

      <a
        href="/"
        style={{ display:"block", textAlign:"center", marginTop:"1.5rem", fontSize:"0.85rem", color:"#9ca3af", textDecoration:"none" }}
      >
        ← 홈으로
      </a>
    </div>
  );
}
