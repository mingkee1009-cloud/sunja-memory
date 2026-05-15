"use client";

import { useState, useEffect, useMemo } from "react";
import {
  createMemory,
  getMemories,
  updateMemory,
  deleteMemory,
  toggleMemoryDone,
} from "@/lib/firestore";
import { signInWithGoogle, signOut, subscribeAuth, User } from "@/lib/auth";
import { Memory } from "@/types/memory";

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

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("전체");
  const [editingId, setEditingId] = useState<string | null>(null);

  // 인증 상태 구독
  useEffect(() => {
    const unsub = subscribeAuth((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // 로그인 시 메모 로드
  useEffect(() => {
    if (user) {
      load(user.uid);
    } else {
      setMemories([]);
    }
  }, [user]);

  async function load(uid: string) {
    setLoading(true);
    try {
      const data = await getMemories(uid);
      setMemories(data);
    } catch (e) {
      console.error("load failed", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    const value = text.trim();
    if (!value) { alert("내용을 입력하세요"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateMemory(user.uid, editingId, value);
        setEditingId(null);
      } else {
        await createMemory(user.uid, value);
      }
      setText("");
      await load(user.uid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(m: Memory) {
    if (!m.id) return;
    setEditingId(m.id);
    setText(m.rawText);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setText("");
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("삭제할까요?")) return;
    try {
      await deleteMemory(user.uid, id);
      if (editingId === id) cancelEdit();
      await load(user.uid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  async function handleToggle(m: Memory) {
    if (!user || !m.id) return;
    try {
      await toggleMemoryDone(user.uid, m.id, !m.isDone);
      await load(user.uid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "변경 실패");
    }
  }

  async function handleLogin() {
    try {
      await signInWithGoogle();
    } catch (e) {
      alert(e instanceof Error ? e.message : "로그인 실패");
    }
  }

  async function handleLogout() {
    try {
      await signOut();
      setMemories([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "로그아웃 실패");
    }
  }

  const displayed = useMemo(() => {
    let list = memories;
    if (activeFilter !== "전체") list = list.filter((m) => m.category === activeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) =>
        m.rawText?.toLowerCase().includes(q) ||
        m.summary?.toLowerCase().includes(q) ||
        m.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    }
    return list;
  }, [memories, activeFilter, search]);

  const isEditing = editingId !== null;

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 1rem", textAlign: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#9ca3af" }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "sans-serif" }}>

      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "#7c3aed" }}>기억창고</h1>
          <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.25rem", marginBottom: 0 }}>
            홈화면에 추가하면 앱처럼 사용할 수 있어요
          </p>
        </div>

        {/* 로그인/로그아웃 */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="프로필"
                width={32}
                height={32}
                style={{ borderRadius: "50%", border: "2px solid #7c3aed" }}
              />
            )}
            <button
              type="button"
              onClick={handleLogout}
              style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.3rem 0.7rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", background: "#fff", color: "#6b7280", cursor: "pointer" }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 700, padding: "0.45rem 0.9rem", border: "none", borderRadius: "0.6rem", background: "#7c3aed", color: "#fff", cursor: "pointer", flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google 로그인
          </button>
        )}
      </div>

      {/* 비로그인 안내 */}
      {!user && (
        <div style={{ padding: "2rem 1rem", textAlign: "center", background: "#f9fafb", borderRadius: "1rem", border: "1px solid #e5e7eb", marginBottom: "1rem" }}>
          <p style={{ fontSize: "2rem", margin: "0 0 0.75rem" }}>🔒</p>
          <p style={{ fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>로그인이 필요해요</p>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "1.25rem" }}>
            Google 계정으로 로그인하면<br />어디서든 메모를 확인할 수 있어요
          </p>
          <button
            type="button"
            onClick={handleLogin}
            style={{ fontSize: "0.95rem", fontWeight: 700, padding: "0.65rem 1.5rem", border: "none", borderRadius: "0.75rem", background: "#7c3aed", color: "#fff", cursor: "pointer" }}
          >
            Google로 시작하기
          </button>
        </div>
      )}

      {/* 로그인 상태 - 메모 입력 */}
      {user && (
        <>
          {isEditing && (
            <div style={{ marginBottom: "0.75rem", padding: "0.6rem 1rem", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#92400e" }}>✏️ 수정 중</span>
              <button type="button" onClick={cancelEdit} style={{ fontSize: "0.8rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>취소</button>
            </div>
          )}

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
          <div style={{ marginTop: "1.5rem", marginBottom: "0.75rem" }}>
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
                <button key={cat} type="button" onClick={() => setActiveFilter(cat)}
                  style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem", fontWeight: 700, border: "none", borderRadius: "999px", cursor: "pointer", background: active ? "#7c3aed" : "#f3f4f6", color: active ? "#fff" : "#374151" }}>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* 메모 카운트 */}
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "0.6rem" }}>
            {activeFilter === "전체" ? "전체" : activeFilter} {displayed.length}개
          </p>

          {/* 메모 목록 */}
          {loading ? (
            <p style={{ color: "#9ca3af" }}>불러오는 중...</p>
          ) : displayed.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>메모가 없어요</p>
          ) : (
            displayed.map((m) => {
              if (!m.id) return null;
              const id = m.id;
              const done = m.isDone;
              const cs = catStyle(m.category);
              const ts = m.createdAt?.seconds
                ? new Date(m.createdAt.seconds * 1000).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "";
              return (
                <div key={id} style={{ padding: "0.9rem 1rem", marginBottom: "0.6rem", background: editingId === id ? "#fffbeb" : "#f9fafb", borderRadius: "0.75rem", border: `1px solid ${editingId === id ? "#f59e0b" : "#e5e7eb"}`, opacity: done ? 0.5 : 1, transition: "opacity 0.2s" }}>
                  <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: "999px", marginBottom: "0.35rem", background: cs.bg, color: cs.text }}>
                    {m.category}
                  </span>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, textDecoration: done ? "line-through" : "none", color: done ? "#9ca3af" : "#111827", lineHeight: 1.45 }}>
                    {m.summary || m.rawText}
                  </div>
                  {m.summary && m.rawText !== m.summary && (
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.2rem" }}>{m.rawText}</div>
                  )}
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.3rem" }}>{ts}</div>
                  <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => handleToggle(m)}
                      style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 600, border: "none", borderRadius: "0.5rem", cursor: "pointer", background: done ? "#d1fae5" : "#ede9fe", color: done ? "#065f46" : "#5b21b6" }}>
                      {done ? "✅ 완료됨" : "⬜ 완료"}
                    </button>
                    <button type="button" onClick={() => startEdit(m)}
                      style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 600, border: "none", borderRadius: "0.5rem", cursor: "pointer", background: "#fef9c3", color: "#92400e" }}>
                      ✏️ 수정
                    </button>
                    <button type="button" onClick={() => handleDelete(id)}
                      style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 600, border: "none", borderRadius: "0.5rem", cursor: "pointer", background: "#fee2e2", color: "#991b1b" }}>
                      🗑 삭제
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
