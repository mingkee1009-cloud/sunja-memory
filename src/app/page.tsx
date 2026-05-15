"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Category = "쇼핑" | "미모마켓" | "콘텐츠" | "AI자동화" | "기타";

type Memory = {
  id: string;
  text: string;
  category: Category;
  done: boolean;
  createdAt?: any;
  updatedAt?: any;
  importedFromRoot?: boolean;
  importedFromRootId?: string;
};

const categories: ("전체" | Category)[] = ["전체", "쇼핑", "미모마켓", "콘텐츠", "AI자동화", "기타"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>("기타");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"전체" | Category>("전체");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadMemories(currentUser.uid);
      } else {
        setMemories([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const memoriesRef = (uid: string) => {
    return collection(db, "users", uid, "memories");
  };

  const loadMemories = async (uid = user?.uid) => {
    if (!uid) return;

    const q = query(memoriesRef(uid), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Memory[];

    setMemories(data);
  };

  const saveMemory = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!text.trim()) {
      alert("기억할 내용을 입력하세요.");
      return;
    }

    await addDoc(memoriesRef(user.uid), {
      text: text.trim(),
      category,
      done: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setText("");
    setCategory("기타");
    await loadMemories(user.uid);
  };

  const deleteMemory = async (id: string) => {
    if (!user) return;

    if (!confirm("삭제할까요?")) return;

    await deleteDoc(doc(db, "users", user.uid, "memories", id));
    await loadMemories(user.uid);
  };

  const toggleDone = async (memory: Memory) => {
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid, "memories", memory.id), {
      done: !memory.done,
      updatedAt: serverTimestamp(),
    });

    await loadMemories(user.uid);
  };

  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditingText(memory.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async (id: string) => {
    if (!user) return;

    if (!editingText.trim()) {
      alert("수정할 내용을 입력하세요.");
      return;
    }

    await updateDoc(doc(db, "users", user.uid, "memories", id), {
      text: editingText.trim(),
      updatedAt: serverTimestamp(),
    });

    setEditingId(null);
    setEditingText("");
    await loadMemories(user.uid);
  };

  const handleImportOldMemories = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      setLoading(true);

      const rootSnapshot = await getDocs(collection(db, "memories"));

      if (rootSnapshot.empty) {
        alert("가져올 기존 메모가 없습니다.");
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;

      for (const rootDoc of rootSnapshot.docs) {
        const rootData = rootDoc.data();

        const duplicateQuery = query(
          memoriesRef(user.uid),
          where("importedFromRootId", "==", rootDoc.id)
        );

        const duplicateSnapshot = await getDocs(duplicateQuery);

        if (!duplicateSnapshot.empty) {
          skippedCount++;
          continue;
        }

        await addDoc(memoriesRef(user.uid), {
          ...rootData,
          text: rootData.text || rootData.content || "",
          category: rootData.category || "기타",
          done: rootData.done || false,
          importedFromRoot: true,
          importedFromRootId: rootDoc.id,
          importedAt: serverTimestamp(),
          createdAt: rootData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        importedCount++;
      }

      await loadMemories(user.uid);

      alert(`기존 메모 ${importedCount}개를 가져왔습니다. 중복 ${skippedCount}개는 건너뛰었습니다.`);
    } catch (error) {
      console.error(error);
      alert("기존 메모 가져오기 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("이 브라우저는 음성입력을 지원하지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = () => {
      alert("음성입력 중 오류가 발생했습니다.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const formatDate = (value: any) => {
    if (!value) return "";

    try {
      const date = value.toDate ? value.toDate() : new Date(value);
      return date.toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const filteredMemories = memories.filter((memory) => {
    const matchesSearch = memory.text.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "전체" || memory.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <main
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h1
          style={{
            color: "#7c3aed",
            fontSize: "28px",
            fontWeight: "800",
            margin: 0,
          }}
        >
          기억창고
        </h1>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="profile"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#7c3aed",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
            )}

            <button
              onClick={logout}
              style={{
                border: "1px solid #ddd",
                background: "white",
                borderRadius: "10px",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            style={{
              background: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "10px 14px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Google 로그인
          </button>
        )}
      </div>

      <p style={{ color: "#8b8b9a", marginTop: 0, marginBottom: "20px" }}>
        홈화면에 추가하면 앱처럼 사용할 수 있어요
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="기억할 내용을 입력하세요..."
        style={{
          width: "100%",
          height: "120px",
          border: "1px solid #d6d6e0",
          borderRadius: "14px",
          padding: "16px",
          fontSize: "16px",
          boxSizing: "border-box",
          resize: "vertical",
          outlineColor: "#7c3aed",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "10px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        {categories
          .filter((item) => item !== "전체")
          .map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item as Category)}
              style={{
                border: "none",
                borderRadius: "999px",
                padding: "8px 12px",
                fontWeight: "bold",
                cursor: "pointer",
                background: category === item ? "#7c3aed" : "#f3f3f6",
                color: category === item ? "white" : "#111827",
              }}
            >
              {item}
            </button>
          ))}
      </div>

      <button
        onClick={startVoiceInput}
        style={{
          width: "100%",
          background: listening ? "#ef4444" : "#f3f3f6",
          color: listening ? "white" : "#111827",
          border: "none",
          borderRadius: "12px",
          padding: "12px",
          fontSize: "15px",
          fontWeight: "bold",
          marginBottom: "10px",
          cursor: "pointer",
        }}
      >
        {listening ? "🎙 듣는 중..." : "🎙 음성입력"}
      </button>

      <button
        onClick={saveMemory}
        style={{
          width: "100%",
          background: "#7c3aed",
          color: "white",
          border: "none",
          borderRadius: "12px",
          padding: "15px",
          fontSize: "17px",
          fontWeight: "bold",
          marginBottom: "14px",
          cursor: "pointer",
        }}
      >
        저장하기
      </button>

      <button
        onClick={handleImportOldMemories}
        disabled={loading}
        style={{
          width: "100%",
          background: "#6d28d9",
          color: "white",
          border: "none",
          borderRadius: "12px",
          padding: "15px",
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "22px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        📦 기존 메모 가져오기
      </button>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 검색..."
        style={{
          width: "100%",
          border: "1px solid #d6d6e0",
          borderRadius: "14px",
          padding: "14px 16px",
          fontSize: "16px",
          boxSizing: "border-box",
          marginBottom: "12px",
          outlineColor: "#7c3aed",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setSelectedCategory(item)}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "8px 12px",
              fontWeight: "bold",
              cursor: "pointer",
              background: selectedCategory === item ? "#7c3aed" : "#f3f3f6",
              color: selectedCategory === item ? "white" : "#111827",
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <p style={{ color: "#8b8b9a", marginBottom: "10px" }}>
        전체 {filteredMemories.length}개
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredMemories.map((memory) => (
          <div
            key={memory.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "16px",
              background: "white",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: "#f3f3f6",
                borderRadius: "999px",
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              {memory.category || "기타"}
            </span>

            {editingId === memory.id ? (
              <>
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    border: "1px solid #d6d6e0",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "15px",
                    boxSizing: "border-box",
                    marginBottom: "10px",
                  }}
                />

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => saveEdit(memory.id)} style={smallButton("#7c3aed", "white")}>
                    저장
                  </button>
                  <button onClick={cancelEdit} style={smallButton("#f3f3f6", "#111827")}>
                    취소
                  </button>
                </div>
              </>
            ) : (
              <>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    margin: "0 0 8px 0",
                    textDecoration: memory.done ? "line-through" : "none",
                    color: memory.done ? "#9ca3af" : "#111827",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {memory.text}
                </p>

                <p
                  style={{
                    color: "#9ca3af",
                    fontSize: "13px",
                    margin: "0 0 12px 0",
                  }}
                >
                  {formatDate(memory.createdAt)}
                </p>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => toggleDone(memory)} style={smallButton("#ede9fe", "#6d28d9")}>
                    {memory.done ? "↩ 미완료" : "✓ 완료"}
                  </button>

                  <button onClick={() => startEdit(memory)} style={smallButton("#fef3c7", "#92400e")}>
                    ✏ 수정
                  </button>

                  <button onClick={() => deleteMemory(memory.id)} style={smallButton("#fee2e2", "#991b1b")}>
                    🗑 삭제
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function smallButton(background: string, color: string) {
  return {
    background,
    color,
    border: "none",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
  };
}