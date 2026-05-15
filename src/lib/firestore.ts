import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Memory } from "@/types/memory";
import { analyzeMemory } from "./analyzeMemory";

function memCol(uid: string) {
  return collection(db, "users", uid, "memories");
}

function memDoc(uid: string, id: string) {
  return doc(db, "users", uid, "memories", id);
}

export async function createMemory(uid: string, rawText: string): Promise<string> {
  console.log("createMemory called", rawText);
  const analysis = analyzeMemory(rawText);
  try {
    const docRef = await addDoc(memCol(uid), {
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

export async function updateMemory(uid: string, id: string, rawText: string): Promise<void> {
  const analysis = analyzeMemory(rawText);
  await updateDoc(memDoc(uid, id), {
    rawText,
    summary:   analysis.summary,
    category:  analysis.category,
    keywords:  analysis.keywords,
    place:     analysis.place,
    todo:      analysis.todo,
    priority:  analysis.priority,
    updatedAt: serverTimestamp(),
  });
}

export async function getMemories(uid: string): Promise<Memory[]> {
  const q = query(memCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory));
}

export async function toggleMemoryDone(uid: string, id: string, isDone: boolean): Promise<void> {
  await updateDoc(memDoc(uid, id), {
    isDone,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMemory(uid: string, id: string): Promise<void> {
  await deleteDoc(memDoc(uid, id));
}

// root memories -> users/{uid}/memories migration
export async function migrateRootMemories(uid: string): Promise<number> {
  const rootSnap = await getDocs(collection(db, "memories"));

  if (rootSnap.empty) return 0;

  let count = 0;
  const dest = memCol(uid);

  for (const rootDoc of rootSnap.docs) {
    // duplicate check: skip if already imported
    const dupQ = query(dest, where("importedFromRootId", "==", rootDoc.id));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      console.log("skip duplicate:", rootDoc.id);
      continue;
    }

    const data = rootDoc.data();
    await addDoc(dest, {
      ...data,
      importedFromRootId: rootDoc.id,
      importedFromRoot:   true,
      importedAt:         serverTimestamp(),
    });
    count++;
  }

  return count;
}

export { migrateRootMemories as importRootMemories };
