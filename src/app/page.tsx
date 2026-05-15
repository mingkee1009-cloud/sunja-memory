"use client";

import { useState, useEffect } from "react";
import { createMemory, getMemories } from "@/lib/firestore";
import { Memory } from "@/types/memory";

export default function HomePage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadMemories() {
    try {
      const data = await getMemories();
      setMemories(data);
    } catch (e) {
      console.error("load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemories();
  }, []);

  async function handleSave() {
    const value = text.trim();
    if (!value) return;
    setSaving(true);
    try {
      await createMemory(value);
      setText("");
      await loadMemories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>기억창고</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
        }}
        placeholder="기억할 내용을 입력하세요..."
        rows={4}
        style={{
          width: "100%",
          padding: "0.75rem",
          fontSize: "1rem",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: "0.75rem",
          width: "100%",
          padding: "0.75rem",
          fontSize: "1rem",
          fontWeight: 700,
          color: "#fff",
          background: saving ? "#a5b4fc" : "#7c3aed",
          border: "none",
          borderRadius: "0.75rem",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "저장 중..." : "저장하기"}
      </button>

      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginTop: "2rem", marginBottom: "0.75rem" }}>
        최근 메모
      </h2>

      {loading ? (
        <p style={{ color: "#9ca3af" }}>불러오는 중...</p>
      ) : memories.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>저장된 메모가 없어요</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {memories.map((m) => (
            <li
              key={m.id}
              style={{
                padding: "0.75rem 1rem",
                marginBottom: "0.5rem",
                background: "#f9fafb",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                fontSize: "0.9rem",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                {m.summary || m.rawText}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                {m.category} · {m.createdAt?.seconds
                  ? new Date(m.createdAt.seconds * 1000).toLocaleString("ko-KR")
                  : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
