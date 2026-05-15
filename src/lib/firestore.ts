import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Memory } from "@/types/memory";
import { analyzeMemory } from "./analyzeMemory";

const COL = "memories";

// ── 메모 저장 (자동분류 포함) ─────────────────────────────────
export async function createMemory(rawText: string): Promise<string> {
  console.log("createMemory called", rawText);
  const analysis = analyzeMemory(rawText);
  try {
    const docRef = await addDoc(collection(db, COL), {
      rawText,
      summary:    analysis.summary,
      category:   analysis.category,
      keywords:   analysis.keywords,
      place:      analysis.place,
      todo:       analysis.todo,
      priority:   analysis.priority,
      sourceType: "text",
      url:        "",
      dueDate:    null,
      isDone:     false,
      createdAt:  serverTimestamp(),
      updatedAt:  serverTimestamp(),
    });
    console.log("addDoc success", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("addDoc failed", error);
    throw error;
  }
}

// ── 캡쳐 메모 저장 ────────────────────────────────────────────
export async function createCaptureMemo(
  title: string,
  description: string,
  sourceUrl: string
): Promise<string> {
  const parts = [title.trim(), description.trim(), sourceUrl.trim()].filter(Boolean);
  const rawText = parts.join(" ");
  const analysis = analyzeMemory(rawText);
  const docRef = await addDoc(collection(db, COL), {
    rawText,
    summary:    analysis.summary,
    category:   analysis.category,
    keywords:   analysis.keywords,
    place:      analysis.place,
    todo:       analysis.todo,
    priority:   analysis.priority,
    sourceType: "image",
    url:        sourceUrl.trim(),
    dueDate:    null,
    isDone:     false,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
  return docRef.id;
}

// ── 링크 저장 ─────────────────────────────────────────────────
export async function createLinkMemory(url: string, description: string): Promise<string> {
  const rawText = description.trim()
    ? `${url.trim()} ${description.trim()}`
    : url.trim();
  const analysis = analyzeMemory(rawText);
  const docRef = await addDoc(collection(db, COL), {
    rawText,
    summary:    analysis.summary,
    category:   analysis.category,
    keywords:   analysis.keywords,
    place:      analysis.place,
    todo:       analysis.todo,
    priority:   analysis.priority,
    sourceType: "link",
    url:        url.trim(),
    dueDate:    null,
    isDone:     false,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
  return docRef.id;
}

// ── 전체 메모 최신순 조회 ─────────────────────────────────────
export async function getMemories(): Promise<Memory[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory));
}

// ── 완료 토글 ─────────────────────────────────────────────────
export async function toggleMemoryDone(id: string, isDone: boolean): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    isDone,
    updatedAt: serverTimestamp(),
  });
}

// ── 삭제 ──────────────────────────────────────────────────────
export async function deleteMemory(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
