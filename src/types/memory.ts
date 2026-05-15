export type SourceType = "text" | "voice" | "image" | "link";
export type Priority = "높음" | "보통" | "낮음";

export interface Memory {
  id?: string;
  rawText: string;
  summary?: string;
  category: string;
  keywords: string[];
  place: string;
  sourceType: SourceType;
  url?: string;
  todo: boolean;
  priority: Priority;
  dueDate?: string | null;
  isDone: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatedAt: any;
}
