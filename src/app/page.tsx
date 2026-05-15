"use client";

import { useState, useEffect, useMemo } from "react";
import {
  createMemory,
  getMemories,
  deleteMemory,
  toggleMemoryDone,
} from "@/lib/firestore";
import { Memory } from "@/types/memory";

// ── 카테고리 목록 ─────────────────────────────────────────────
const CATEGORIES = ["전체", "쇼핑", "미모마켓", "콘텐츠", "AI자동화", "기타"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

// ── 카테고리 색상 ─────────────────────────────────────────────
const CAT_COLOR: Record<string, { bg: string; text: string }> = {
  쇼핑:     { bg: "#fef9c3", text: "#854d0e" },
  미모마켓: { bg: "#fdf2f8", text: "#9d174d" },
  콘텐츠:   { bg: "#ede9fe", text: "#5b21b6" },
  AI자동화: { bg: "#dbeafe", text: "#1e40af" },
  기타:     { bg: "#f3f4f6", text: "#6b7280" },
};

function catStyle(category: string) {
  return CAT_COLOR[category] ?? CAT_COLOR["기타"];
}

export default function HomePage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("전체");

  // ── 로드 ──────────────────────────────────────────────────
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

  // ── 저장 ──────────────────────────────────────────────────
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

  // ── 삭제 ──────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("삭제할까요?")) return;
    try {
      await deleteMemory(id);
      await loadMemories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  // ── 완료 토글 ─────────────────────────────────────────────
  async function handleToggle(memory: Memory) {
    if (!memory.id) return;
    try {
      await toggleMemoryDone(memory.id, !memory.isDone);
      await loadMemories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "변경 실패");
    }
  }

  // ── 필터 + 검색 ───────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = memories;
    if (activeFilter !== "전체") {
      list = list.filter((m) => m.category === activeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.rawText?.toLowerCase().includes(q) ||
          m.summary?.toLowerCase().includes(q) ||
          m.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    }
    return list;
  }, [memories, activeFilter, search]);

  // ── 스타일 상수 ───────────────────────────────────────────
  const s = {
    page:    { maxWidth: 480, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "sans-serif" } as React.CSSProperties,
    input:   { width: "100%", padding: "0.75rem", fontSize: "1rem", border: "1px solid #d1d5db", borderRadius: "0.75rem", boxSizing: "border-box" as const },
    btn:     (bg: string, disabled = false): React.CSSProperties => ({ marginTop: "0.75rem", width: "100%", padding: "0.75rem", fontSize: "1rem", fontWeight: 700, color: "#fff", background: bg, border: "none", borderRadius: "0.75rem", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }),
    filterWrap: { display: "flex", gap: "0.5rem", flexWrap: "wrap" as const, marginBottom: "0.75rem" },
    filterBtn: (active: boolean): React.CSSProperties => ({ padding: "0.3rem 0.8rem", fontSize: "0.8rem", fontWeight: 700, border: "none", borderRadius: "999px", cursor: "pointer", background: active ? "#7c3aed" : "#f3f4f6", color: active ? "#fff" : "#374151" }),
    card:    { padding: "0.9rem 1rem", marginBottom: "0.6rem", background: "#f9fafb", borderRadius: "0.75rem", border: "1px solid #e5e7eb" } as React.CSSProperties,
    catBadge: (cat: string): React.CSSProperties => ({ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", marginBottom: "0.3rem", background: catStyle(cat).bg, color: catStyle(cat).text }),
    summary: (done: boolean): React.CSSProperties => ({ fontSize: "0.95rem", fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? "#9ca3af" : "#111827" }),
    meta:    { fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" } as React.CSSProperties,
    rowBtns: { display: "flex", gap: "0.5rem", marginTop: "0.5rem" } as React.CSSProperties,
    checkBtn:(done: boolean): React.CSSProperties => ({ padding: "0.25rem 0.6rem", fontSize: "0.78rem", fontWeight: 600, border: "none", borderRadius: "0.5rem", cursor: "pointer", background: done ? "#d1fae5" : "#ede9fe", color: done ? "#065f46" : "#5b21b6" }),
    delBtn:  { padding: "0.25rem 0.6rem", fontSize: "0.78rem", fontWeight: 600, border: "none", borderRadius: "0.5rem", cursor: "pointer", background: "#fee2e2", color: "#991b1b" } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "#7c3aed" }}>
        기억창고
      </h1>

      {/* 메모 입력 */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
        placeholder="기억할 내용을 입력하세요..."
        rows={4}
        style={s.input}
      />
      <button type="button" onClick={handleSave} disabled={saving} style={s.btn(saving ? "#a5b4fc" : "#7c3aed", saving)}>
        {saving ? "저장 중..." : "저장하기"}
      </button>

      {/* 검색 */}
      <div style={{ marginTop: "1.75rem", marginBottom: "0.75rem" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="검색..."
          style={{ ...s.input, marginTop: 0 }}
        />
      </div>

      {/* 카테고리 필터 */}
      <div style={s.filterWrap}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveFilter(cat)}
            style={s.filterBtn(activeFilter === cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 메모 목록 */}
      <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.6rem", color: "#374151" }}>
        {activeFilter === "전체" ? "전체 메모" : activeFilter} ({displayed.length})
      </h2>

      {loading ? (
        <p style={{ color: "#9ca3af" }}>불러오는 중...</p>
      ) : displayed.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>메모가 없어요</p>
      ) : (
        displayed.map((m) => {
          if (!m.id) return null;
          const id = m.id;
          const ts = m.createdAt?.seconds
            ? new Date(m.createdAt.seconds * 1000).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "";
          return (
            <div key={id} style={s.card}>
              <span style={s.catBadge(m.category)}>{m.category}</span>
              <div style={s.summary(m.isDone)}>{m.summary || m.rawText}</div>
              {m.rawText !== m.summary && m.summary && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.2rem" }}>{m.rawText}</div>
              )}
              <div style={s.meta}>{ts}</div>
              <div style={s.rowBtns}>
                <button type="button" onClick={() => handleToggle(m)} style={s.checkBtn(m.isDone)}>
                  {m.isDone ? "✅ 완료됨" : "⬜ 완료"}
                </button>
                <button type="button" onClick={() => handleDelete(id)} style={s.delBtn}>
                  🗑 삭제
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
