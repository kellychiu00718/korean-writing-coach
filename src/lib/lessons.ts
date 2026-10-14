import "server-only";
import lessonData from "@/data/lessons.json";
import type { Lesson } from "@/lib/grammar";

// 課程內容（含預先寫好的參考寫法）只給伺服器用。
// 瀏覽器端的元件不要匯入這個檔案，否則參考寫法會被打包進瀏覽器；需要的欄位由伺服器挑好再傳過去。

export const lessons = lessonData as Lesson[];

const lessonById = new Map(lessons.map((l) => [l.id, l]));

export function getLesson(id: string) {
  return lessonById.get(id);
}
