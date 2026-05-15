"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  createMemory,
  createLinkMemory,
  createCaptureMemo,
  getMemories,
  toggleMemoryDone,
  deleteMemory,
} from "@/lib/firestore";
import { Memory } from "@/types/memory";
import { useVoiceMemo } from "@/hooks/useVoiceMemo";
import { InstallPrompt } from "@/components/InstallPrompt";

// ── 탭 정의 ───────────────────────────────────────────────────
type TabKey = "전체" | "오늘 할 일" | "미모마켓" | "콘텐츠" | "AI자동화" | "쇼핑" | "금융";
const TABS: TabKey[] = ["전체", "오늘 할 일", "미모마켓", "콘텐츠", "AI자동화", "쇼핑", "금융"];

// ── 카테고리 색상 맵 ──────────────────────────────────────────
const CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  쇼핑:     { bg: "#fef9c3", text: "#854d0e" },
  주문서:   { bg: "#fce7f3", text: "#9d174d" },
  콘텐츠:   { bg: "#fce7f3", text: "#7c3aed" },
  미모마켓: { bg: "#fdf2f8", text: "#9d174d" },
  AI자동화: { bg: "#ede9fe", text: "#5b21b6" },
  건강:     { bg: "#dcfce7", text: "#166534" },
  학교:     { bg: "#dbeafe", text: "#1e40af" },
  금융:     { bg: "#d1fae5", text: "#065f46" },
  부동산:   { bg: "#ffedd5", text: "#9a3412" },
  기타:     { bg: "#f3f4f6", text: "#6b7280" },
};

// ── 헬퍼 컴포넌트 ────────────────────────────────────────────
function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLOR[category] ?? CATEGORY_COLOR["기타"];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      {category}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border px-4 py-4 flex items-start gap-3 animate-pulse"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
      {active && <circle cx="12" cy="8" r="2" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function sortMemories(list: Memory[]): Memory[] {
  return [...list].sort((a, b) => {
    const pa = a.priority === "높음" ? 0 : 1;
    const pb = b.priority === "높음" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const ta = a.todo && !a.isDone ? 0 : 1;
    const tb = b.todo && !b.isDone ? 0 : 1;
    if (ta !== tb) return ta - tb;
    const ca = a.createdAt?.seconds ?? 0;
    const cb = b.createdAt?.seconds ?? 0;
    return cb - ca;
  });
}

// ── 메인 페이지 ───────────────────────────────────────────────
export default function HomePage() {
  // ── 핵심 상태 (최소 안정 구조) ──────────────────────────────
  const [memoText, setMemoText] = useState("");
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // ── 보조 상태 ─────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("전체");
  const [daisoFilter, setDaisoFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkMemo, setLinkMemo] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureDesc, setCaptureDesc] = useState("");
  const [captureUrl, setCaptureUrl] = useState("");
  const [savingCapture, setSavingCapture] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linkUrlRef = useRef<HTMLInputElement>(null);
  const captureTitleRef = useRef<HTMLInputElement>(null);

  const {
    voiceState,
    interimText,
    finalText,
    errorMsg: voiceError,
    isSupported: voiceSupported,
    start: startVoice,
    stop: stopVoice,
    reset: resetVoice,
  } = useVoiceMemo();

  const isListening = voiceState === "listening";

  useEffect(() => {
    setMounted(true);
    setDateStr(
      new Date().toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    );
  }, []);

  useEffect(() => {
    if (finalText) {
      setMemoText((prev) => (prev ? prev + " " + finalText : finalText).trim());
    }
  }, [finalText]);

  useEffect(() => {
    if (voiceError) alert("음성인식 오류: " + voiceError);
  }, [voiceError]);

  // ── 목록 로드 ─────────────────────────────────────────────
  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMemories();
      setMemories(data);
    } catch (e) {
      console.error("loadMemories failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // ── 저장 핸들러 (최소 안정 구조) ─────────────────────────
  const handleSaveMemory = async () => {
    console.log("home save clicked", memoText);
    alert("저장 버튼 클릭됨");
    const value = memoText.trim();
    if (!value) {
      alert("내용을 입력하세요");
      return;
    }
    setSaving(true);
    try {
      await createMemory(value);
      console.log("home save success");
      alert("저장 완료");
      setMemoText("");
      resetVoice();
      await loadMemories();
    } catch (error) {
      console.error("home save failed", error);
      const msg = error instanceof Error ? error.message : "저장 실패";
      alert(msg);
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── 링크 저장 핸들러 ──────────────────────────────────────
  const handleSaveLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;
    if (savingLink) return;
    setSavingLink(true);
    try {
      await createLinkMemory(url, linkMemo.trim());
      setLinkUrl("");
      setLinkMemo("");
      setLinkOpen(false);
      alert("링크 저장 완료");
      await loadMemories();
    } catch (e) {
      alert("링크 저장 실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingLink(false);
    }
  };

  // ── 캡쳐 메모 저장 핸들러 ────────────────────────────────
  const handleSaveCapture = async () => {
    const title = captureTitle.trim();
    const desc = captureDesc.trim();
    if (!title && !desc) return;
    if (savingCapture) return;
    setSavingCapture(true);
    try {
      await createCaptureMemo(title, desc, captureUrl.trim());
      setCaptureTitle("");
      setCaptureDesc("");
      setCaptureUrl("");
      setCaptureOpen(false);
      alert("캡쳐 메모 저장 완료");
      await loadMemories();
    } catch (e) {
      alert("캡쳐 저장 실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingCapture(false);
    }
  };

  useEffect(() => {
    if (linkOpen) setTimeout(() => linkUrlRef.current?.focus(), 100);
  }, [linkOpen]);

  useEffect(() => {
    if (captureOpen) setTimeout(() => captureTitleRef.current?.focus(), 100);
  }, [captureOpen]);

  // ── 탭별 카운트 ───────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TABS.forEach((tab) => {
      if (tab === "전체") counts[tab] = memories.length;
      else if (tab === "오늘 할 일") counts[tab] = memories.filter((m) => m.todo && !m.isDone).length;
      else counts[tab] = memories.filter((m) => m.category === tab || m.keywords?.includes(tab)).length;
    });
    return counts;
  }, [memories]);

  // ── 필터 ─────────────────────────────────────────────────
  const displayMemories = useMemo(() => {
    let list = memories;
    if (activeTab === "오늘 할 일") list = list.filter((m) => m.todo && !m.isDone);
    else if (activeTab !== "전체") list = list.filter((m) => m.category === activeTab || m.keywords?.includes(activeTab));
    if (daisoFilter) list = list.filter((m) => m.rawText?.includes("다이소") || m.keywords?.includes("다이소") || m.place?.includes("다이소"));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.rawText?.toLowerCase().includes(q) || m.summary?.toLowerCase().includes(q) || m.keywords?.some((k) => k.toLowerCase().includes(q)));
    }
    return sortMemories(list);
  }, [memories, activeTab, daisoFilter, search]);

  // ── 브리핑 ───────────────────────────────────────────────
  const briefing = useMemo(() => {
    const highPriority = memories.filter((m) => m.priority === "높음" && (!m.todo || !m.isDone));
    const activeTodos = memories.filter((m) => m.todo && !m.isDone);
    const mimoCount = memories.filter((m) => m.category === "미모마켓" || m.keywords?.includes("미모마켓")).length;
    const contentCount = memories.filter((m) => m.category === "콘텐츠" || m.keywords?.includes("콘텐츠")).length;
    const daisoCount = memories.filter((m) => m.rawText?.includes("다이소") || m.keywords?.includes("다이소") || m.place?.includes("다이소")).length;
    const recent = memories.filter((m) => Date.now() / 1000 - (m.createdAt?.seconds ?? 0) < 86400).slice(0, 3);
    return { highPriority, activeTodos, mimoCount, contentCount, daisoCount, recent, hasAnything: highPriority.length > 0 || activeTodos.length > 0 || mimoCount > 0 || contentCount > 0 || daisoCount > 0 };
  }, [memories]);

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-10" style={{ background: "var(--bg)", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-30 px-4"
        style={{
          background: "var(--accent)",
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "0.75rem",
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">기억창고</h1>
            <p className="text-purple-200 text-xs mt-0.5">{dateStr}</p>
          </div>
          <button
            onClick={() => setDaisoFilter((v) => !v)}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: daisoFilter ? "#ff6b6b" : "rgba(255,255,255,0.2)",
              color: daisoFilter ? "#fff" : "rgba(255,255,255,0.85)",
            }}
          >
            🏪 다이소
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4">
        {/* 오늘 브리핑 */}
        {!loading && briefing.hasAnything && (
          <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button
              onClick={() => setBriefingOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", border: "none", cursor: "pointer" }}
            >
              <span className="text-white font-bold text-sm">오늘 해야 할 핵심</span>
              <span className="text-purple-200 text-xs">{briefingOpen ? "▲" : "▼"}</span>
            </button>
            {briefingOpen && (
              <div className="px-4 py-3 space-y-2" style={{ background: "var(--card)" }}>
                {briefing.activeTodos.length > 0 && <div className="flex items-center gap-2 text-sm"><span>✅</span><span style={{ color: "var(--text)" }}>할 일 <strong>{briefing.activeTodos.length}건</strong> 미완료</span></div>}
                {briefing.highPriority.length > 0 && <div className="flex items-center gap-2 text-sm"><span>🔴</span><span style={{ color: "var(--text)" }}>우선순위 높음 <strong>{briefing.highPriority.length}건</strong></span></div>}
                {briefing.mimoCount > 0 && <div className="flex items-center gap-2 text-sm"><span>🛍️</span><span style={{ color: "var(--text)" }}>미모마켓 메모 <strong>{briefing.mimoCount}건</strong></span></div>}
                {briefing.contentCount > 0 && <div className="flex items-center gap-2 text-sm"><span>🎬</span><span style={{ color: "var(--text)" }}>콘텐츠 아이디어 <strong>{briefing.contentCount}건</strong></span></div>}
                {briefing.daisoCount > 0 && <div className="flex items-center gap-2 text-sm"><span>🏪</span><span style={{ color: "var(--text)" }}>다이소 메모 <strong>{briefing.daisoCount}건</strong></span></div>}
                {briefing.recent.length > 0 && (
                  <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>최근 기억</p>
                    {briefing.recent.map((m) => (
                      <p key={m.id} className="text-xs truncate" style={{ color: "var(--text)" }}>· {m.summary || m.rawText}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 오류 메시지 */}
        {errorMessage && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50" style={{ border: "1px solid #fca5a5" }}>
            ❌ {errorMessage}
            <button onClick={() => setErrorMessage("")} className="ml-2 text-xs underline">닫기</button>
          </div>
        )}

        {/* 메모 입력 */}
        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-start gap-2">
            <textarea
              ref={textareaRef}
              value={isListening ? memoText + (interimText ? " " + interimText : "") : memoText}
              onChange={(e) => setMemoText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveMemory();
                }
              }}
              placeholder="기억할 내용을 입력하세요..."
              rows={3}
              className="flex-1 resize-none text-sm outline-none"
              style={{ background: "transparent", color: "var(--text)", lineHeight: 1.6, border: "none" }}
            />
            {!mounted ? (
              <div className="w-10 h-10 flex-shrink-0" aria-hidden="true" />
            ) : voiceSupported ? (
              <button
                onClick={isListening ? stopVoice : startVoice}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full"
                style={{ background: isListening ? "#fee2e2" : "var(--accent-light)", color: isListening ? "#dc2626" : "var(--accent)", border: "none", cursor: "pointer" }}
                aria-label={isListening ? "음성인식 중지" : "음성으로 입력"}
              >
                <MicIcon active={isListening} />
              </button>
            ) : null}
          </div>

          {mounted && !voiceSupported && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>이 브라우저는 음성인식을 지원하지 않습니다</p>
          )}

          <button
            type="button"
            onClick={handleSaveMemory}
            disabled={saving}
            className="mt-3 w-full py-3 rounded-xl text-sm font-semibold"
            style={{
              background: saving ? "#a5b4fc" : "var(--accent)",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              border: "none",
            }}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>

        {/* 링크 / 캡쳐 버튼 */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => { setLinkOpen((v) => !v); setCaptureOpen(false); }}
            style={{ padding: "0.35rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, border: "none", cursor: "pointer", background: linkOpen ? "var(--accent)" : "var(--accent-light)", color: linkOpen ? "#fff" : "var(--accent)" }}
          >
            🔗 링크 저장
          </button>
          <button
            type="button"
            onClick={() => { setCaptureOpen((v) => !v); setLinkOpen(false); }}
            style={{ padding: "0.35rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, border: "none", cursor: "pointer", background: captureOpen ? "var(--accent)" : "var(--accent-light)", color: captureOpen ? "#fff" : "var(--accent)" }}
          >
            📸 캡쳐 메모
          </button>
        </div>

        {/* 링크 패널 */}
        {linkOpen && (
          <div className="mt-3 rounded-2xl px-4 py-3 space-y-2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <input ref={linkUrlRef} type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full text-sm outline-none px-3 py-2 rounded-xl" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
            <input type="text" value={linkMemo} onChange={(e) => setLinkMemo(e.target.value)} placeholder="메모 (선택)" className="w-full text-sm outline-none px-3 py-2 rounded-xl" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
            <button type="button" onClick={handleSaveLink} disabled={savingLink || !linkUrl.trim()} className="w-full py-2 rounded-xl text-sm font-semibold" style={{ background: savingLink ? "#a5b4fc" : "var(--accent)", color: "#fff", cursor: savingLink ? "not-allowed" : "pointer", border: "none", opacity: savingLink ? 0.7 : 1 }}>
              {savingLink ? "저장 중..." : "링크 저장하기"}
            </button>
          </div>
        )}

        {/* 캡쳐 메모 패널 */}
        {captureOpen && (
          <div className="mt-3 rounded-2xl px-4 py-3 space-y-2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <input ref={captureTitleRef} type="text" value={captureTitle} onChange={(e) => setCaptureTitle(e.target.value)} placeholder="제목" className="w-full text-sm outline-none px-3 py-2 rounded-xl" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
            <textarea value={captureDesc} onChange={(e) => setCaptureDesc(e.target.value)} placeholder="메모 내용" rows={3} className="w-full resize-none text-sm outline-none px-3 py-2 rounded-xl" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
            <input type="url" value={captureUrl} onChange={(e) => setCaptureUrl(e.target.value)} placeholder="출처 URL (선택)" className="w-full text-sm outline-none px-3 py-2 rounded-xl" style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
            <button type="button" onClick={handleSaveCapture} disabled={savingCapture || (!captureTitle.trim() && !captureDesc.trim())} className="w-full py-2 rounded-xl text-sm font-semibold" style={{ background: savingCapture ? "#a5b4fc" : "var(--accent)", color: "#fff", cursor: savingCapture ? "not-allowed" : "pointer", border: "none", opacity: savingCapture ? 0.7 : 1 }}>
              {savingCapture ? "저장 중..." : "캡쳐 메모 저장하기"}
            </button>
          </div>
        )}

        {/* 검색 */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path strokeLinecap="round" d="M13.5 13.5L18 18" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="검색..." className="flex-1 text-sm outline-none bg-transparent" style={{ color: "var(--text)", border: "none" }} />
          {search && <button onClick={() => setSearch("")} className="text-xs" style={{ color: "var(--text-muted)" }}>✕</button>}
        </div>

        {/* 필터 탭 */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {TABS.map((tab) => {
            const active = activeTab === tab;
            const count = tabCounts[tab] ?? 0;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: active ? "var(--accent)" : "var(--card)", color: active ? "#fff" : "var(--text-muted)", border: active ? "none" : "1px solid var(--border)", cursor: "pointer" }}
              >
                {tab}{count > 0 && <span className="ml-1 text-xs" style={{ opacity: active ? 0.8 : 0.6 }}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* 목록 */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : displayMemories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{search ? "검색 결과가 없어요" : "저장된 기억이 없어요"}</p>
            </div>
          ) : (
            displayMemories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onToggle={async (id) => { await toggleMemoryDone(id, !memory.isDone); await loadMemories(); }}
                onDelete={async (id) => { await deleteMemory(id); await loadMemories(); }}
              />
            ))
          )}
        </div>
      </div>

      {mounted && <InstallPrompt />}
    </div>
  );
}

// ── 메모리 카드 ───────────────────────────────────────────────
function MemoryCard({ memory, onToggle, onDelete }: { memory: Memory; onToggle: (id: string) => void; onDelete: (id: string) => void; }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

const handleDelete = async () => {
  if (!confirm("이 기억을 삭제할까요?")) return;

  setDeleting(true);

  try {
    if (!memory.id) return;
    await onDelete(memory.id);
  } finally {
    setDeleting(false);
  }
};
  const sourceLabel = memory.sourceType === "link" ? "🔗 링크" : memory.sourceType === "image" ? "📸 캡쳐" : memory.sourceType === "voice" ? "🎙️ 음성" : null;

  return (
    <div className="rounded-2xl border px-4 py-4" style={{ background: "var(--card)", borderColor: memory.priority === "높음" ? "#fca5a5" : "var(--border)", opacity: memory.isDone ? 0.6 : 1 }}>
      <div className="flex items-start gap-3">
        {memory.todo && (
          <button
            type="button"
            onClick={() => onToggle(memory.id)}
            className="w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center mt-0.5"
            style={{ borderColor: memory.isDone ? "#10b981" : "var(--border)", background: memory.isDone ? "#10b981" : "transparent", cursor: "pointer" }}
          >
            {memory.isDone && <svg viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <CategoryBadge category={memory.category} />
            {memory.priority === "높음" && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fee2e2", color: "#b91c1c" }}>🔴 높음</span>}
            {sourceLabel && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>{sourceLabel}</span>}
          </div>
          <p className={`text-sm font-medium leading-snug ${memory.isDone ? "line-through" : ""}`} style={{ color: "var(--text)" }}>
            {memory.summary || memory.rawText}
          </p>
          {memory.keywords && memory.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {memory.keywords.slice(0, 4).map((kw) => (
                <span key={kw} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>#{kw}</span>
              ))}
            </div>
          )}
          {expanded && (
            <div className="mt-2 space-y-1">
              {memory.rawText && memory.rawText !== memory.summary && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{memory.rawText}</p>}
              {memory.place && memory.place !== "기타" && <p className="text-xs" style={{ color: "var(--text-muted)" }}>📍 {memory.place}</p>}
              {memory.dueDate && <p className="text-xs" style={{ color: "var(--text-muted)" }}>📅 마감: {memory.dueDate}</p>}
              {memory.url && <a href={memory.url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: "var(--accent)" }}>{memory.sourceType === "image" ? "출처 열기" : "링크 열기"} →</a>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--border)", border: "none", cursor: "pointer" }}>{expanded ? "접기" : "더보기"}</button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs px-2 py-1 rounded-lg" style={{ color: "#dc2626", background: "#fee2e2", border: "none", cursor: "pointer", opacity: deleting ? 0.5 : 1 }}>{deleting ? "..." : "삭제"}</button>
        </div>
      </div>
    </div>
  );
}
