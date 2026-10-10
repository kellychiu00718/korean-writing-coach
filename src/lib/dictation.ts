import clipData from "@/data/dictation.json";
import { displayForm, getGrammar, lessons } from "@/lib/grammar";

export type Genre = "news" | "drama" | "movie" | "music" | "variety";

/** YouTube 影片片段 */
export type Clip = {
  kind: "video";
  id: string;
  videoId: string;
  /** 這一句在影片裡的開始與結束秒數 */
  start: number;
  end: number;
  text_ko: string;
  text_zh: string;
  level: number;
  genre: Genre;
  source: { title: string; channel: string; url: string; note?: string };
};

export const GENRE_LABEL: Record<Genre, string> = {
  news: "新聞",
  drama: "戲劇",
  movie: "電影",
  music: "音樂",
  variety: "綜藝",
};

/** 語音朗讀：課程例句，由瀏覽器內建的韓文語音唸出來 */
export type VoiceItem = {
  kind: "voice";
  id: string;
  text_ko: string;
  text_zh: string;
  level: number;
  /** 出自哪一課 */
  form: string;
};

export type DictationItem = Clip | VoiceItem;

/** 台詞還沒填好的片段先不顯示（text_ko 是空字串）。 */
export const clips: Clip[] = (clipData as Omit<Clip, "kind">[])
  .filter((c) => c.text_ko.trim())
  .map((c) => ({ ...c, kind: "video" }));

export const voiceItems: VoiceItem[] = lessons.flatMap((l) =>
  l.examples.map((ex, i) => ({
    kind: "voice" as const,
    id: `voice-${l.id}-${i}`,
    text_ko: ex.ko,
    text_zh: ex.zh,
    level: getGrammar(l.id)?.level ?? 0,
    form: displayForm(getGrammar(l.id)?.form ?? l.id),
  })),
);

export function getItem(id: string): DictationItem | undefined {
  return clips.find((c) => c.id === id) ?? voiceItems.find((v) => v.id === id);
}

/** 同一種題型裡的下一題 */
export function nextItemId(item: DictationItem) {
  const list: DictationItem[] = item.kind === "video" ? clips : voiceItems;
  if (list.length < 2) return null;
  return list[(list.findIndex((x) => x.id === item.id) + 1) % list.length].id;
}
