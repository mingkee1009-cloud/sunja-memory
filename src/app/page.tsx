"use client";

import { useState, useEffect, useMemo } from "react";
import {
  createMemory,
  getMemories,
  updateMemory,
  deleteMemory,
  toggleMemoryDone,
} from "@/lib/firestore";
import { Memory } from "@/types/memory";

// ── 카테고리 ─────────────────────────────────────────────────
const CATEGORIES = ["전체", "쇼핑", "미모마켓", "콘텐츠", "AI자동화", "기타"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

const CAT_COLOR: Record<string, { bg: string; text: string }> = {
  쇼핑:     { bg: "#fef9c3", text: "#854d0e" },
  미모마켓: { bg: "#fdf2f8", text: "#9d174d" },
  콘텐츠:   { bg: "#ede9fe", text: "#5b21b6" },
  AI자동화: { bg: "#dbeafe", text: "#1e40af" },
  기타:     { bg: "#f3f4f6", text: "#6b7280" },
};
function catStyle(c: string) { return CAT_COLOR[c] ?? CAT_COLOR["기타"]; }

// ── 메인 ─────────────────────────────────────────────────────
export default function HomePage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("전체");
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── 로드 ────────────────────────────────────────────────
  async function load() {
    try {
      const data = await getMemories();
      // 최신순 정렬
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setMemories(data);
    } catch (e) {
      console.error("load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── 저장 / 수정 ─────────────────────────────────────────
  async function handleSave() {
    const value = text.trim();
    if (!value) {
      alert("내용을 입력하세요");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateMemory(editingId, value);
        setEditingId(null);
      } else {
        await createMemory(value);
      }
      setText("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  // ── 수정 시작 ───────────────────────────────────────────
  function startEdit(m: Memory) {
    if (!m.id) return;
    setEditingId(m.id);
    setText(m.rawText);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── 수정 취소 ───────────────────────────────────────────
  function cancelEdit() {
    setEditingId(null);
    setText("");
  }

  // ── 삭제 ────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("삭제할까요?")) return;
    try {
      await deleteMemory(id);
      if (editingId === id) cancelEdit();
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  // ── 완료 토글 ───────────────────────────────────────────
  async function handleToggle(m: Memory) {
    if (!m.id) return;
    try {
      await toggleMemoryDone(m.id, !m.isDone);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "변경 실패");
    }
  }

  // ── 필터 + 검색 ─────────────────────────────────────────
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

  // ── 렌더 ────────────────────────────────────────────────
  const isEditing = editingId !== null;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "sans-serif" }}>

      {/* 헤더 */}
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "#7c3aed" }}>
        기억창고
      </h1>
      <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "1.25rem" }}>
        홈화면에 추가하면 앱처럼 사용할 수 있어요
      </p>

      {/* 수정 중 배너 */}
      {isEditing && (
        <div style={{ marginBottom: "0.75rem", padding: "0.6rem 1rem", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#92400e" }}>✏️ 수정 중</span>
          <button type="button" onClick={cancelEdit} style={{ fontSize: "0.8rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>취소</button>
        </div>
      )}

      {/* 메모 입력 */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
        placeholder="기억할 내용을 입력하세요..."
        rows={4}
        style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", border: `1.5px solid ${isEditing ? "#f59e0b" : "#d1d5db"}`, borderRadius: "0.75rem", resize: "vertical", boxSizing: "border-box", outline: "none" }}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: "0.6rem", width: "100%", padding: "0.75rem", fontSize: "1rem", fontWeight: 700, color: "#fff", background: saving ? "#a5b4fc" : isEditing ? "#f59e0b" : "#7c3aed", border: "none", borderRadius: "0.75rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
      >
        {saving ? "처리 중..." : isEditing ? "수정 완료" : "저장하기"}
      </button>

      {/* 검색 */}
      <div style={{ marginTop: "1.75rem", marginBottom: "0.75rem" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  검색..."
          style={{ width: "100%", padding: "0.65rem 0.75rem", fontSize: "0.95rem", border: "1px solid #d1d5db", borderRadius: "0.75rem", boxSizing: "border-box", outline: "none" }}
        />
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {CATEGORIES.map((cat) => {
          const active = activeFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem", fontWeight: 700, border: "none", borderRadius: "999px", cursor: "pointer", background: active ? "#7c3aed" : "#f3f4f6", color: active ? "#fff" : "#374151", transition: "background 0.15s" }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 카운트 */}
      <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.6rem" }}>
        {activeFilter === "전체" ? "전체" : activeFilter} {displayed.length}개
      </p>

      {/* 목록 */}
      {loading ? (
        <p style={{ color: "#9ca3af" }}>불러오는 중...</p>
      ) : displayed.length === 0 ? (
        <p style={{ color: "#9ca3af" }}>메모가 없어요</p>
      ) : (
        displayed.map((m) => {
          if (!m.id) return null;
          const id = m.id;
          const done = m.isDone;
          const ts = m.createdAt?.seconds
            ? new Date(m.createdAt.seconds * 1000).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "";
          const isBeingEdited = editingId === id;
          const cs = catStyle(m.category);

          return (
            <div
              key={id}
              style={{
                padding: "0.9rem 1rem",
                marginBottom: "0.6rem",
                background: isBeingEdited ? "#fffbeb" : "#f9fafb",
                borderRadius: "0.75rem",
                border: `1px solid ${isBeingEdited ? "#f59e0b" : "#e5e7eb"}`,
                opacity: done ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {/* 카테고리 뱃지 */}
              <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: "999px", marginBottom: "0.35rem", background: cs.bg, color: cs.text }}>
                {m.category}
              </span>

              {/* 요약 */}
              <div style={{ fontSize: "0.95rem", fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? "#9ca3af" : "#111827", lineHeight: 1.45 }}>
                {m.summary || m.rawText}
              </div>

              {/* 원문 (요약과 다를 때만) */}
              {m.summary && m.rawText !== m.summary && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.2rem" }}>
                  {m.rawText}
                </div>
              )}

              {/* 시간 */}
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.3rem" }}>{ts}</div>

              {/* 액션 버튼 */}
              <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                <button type="button" onClick={() => handleToggle(m)} style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 600, border: "none", borderRadius: "0.5rem", cursor: "pointer", background: done ? "#d1fae5" : "#ede9fe", color: done ? "#065f46" : "#5b21b6" }}>
                  {done ? "✅ 완료됨" : "⬜ 완료"}
                </button>
                <button type="button" onClick={() => startEdit(m)} style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 600, border: "none", borderRadius: "0.5rem", cursor: "pointer", background: "#fef9c3", color: "#92400e" }}>
                  ✏️ 수정
                </button>
                <button type="button" onClick={() => handleDelete(id)} style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 600, border: "none", borderRadius: "0.5rem", cursor: "pointer", background: "#fee2e2", color: "#991b1b" }}>
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
