import clipData from "@/data/dictation.json";
import levelData from "@/data/dictation-levels.json";
import voiceAudio from "@/data/voice-audio.json";
import { displayForm, getGrammar } from "@/lib/grammar";
import { lessons } from "@/lib/lessons";

export type Genre = "news" | "drama" | "movie" | "music" | "variety";

/** 依國立國語院分級表推估的級數，以及拉高級數的單字或文法（scripts/estimate_levels.py） */
export type Hardest = { type: "單字" | "文法"; text: string; level: number };

type Audio = { file: string; voice: string } | null;

/** 影片台詞：用 Supertonic 重唸，附上原影片的連結和時間 */
export type Clip = {
  kind: "clip";
  id: string;
  /** YouTube 影片編號；來源是新聞網站等其他頁面時沒有 */
  videoId?: string;
  /** 這一句在原影片裡的開始與結束秒數；沒有時間資訊的來源（例如 KBS 新聞網站）就沒有 */
  start?: number;
  end?: number;
  text_ko: string;
  text_zh: string;
  level: number;
  genre: Genre;
  source: { title: string; channel: string; url: string; note?: string };
  /** 還沒經過 Kelly 確認的候選，不會出現在網站上 */
  pending?: boolean;
  audio: Audio;
  hardest: Hardest[];
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
  /** 預先用 Supertonic 做好的音檔（scripts/generate_voice_audio.py）；沒有就用瀏覽器內建語音 */
  audio: Audio;
  hardest: Hardest[];
};

export type DictationItem = Clip | VoiceItem;

const levels = levelData as Record<string, { level: number; hardest: Hardest[] }>;

const allClips: Clip[] = (clipData as Omit<Clip, "kind" | "audio" | "hardest">[])
  .filter((c) => c.text_ko.trim())
  .map((c) => ({
    ...c,
    kind: "clip",
    level: levels[c.id]?.level ?? c.level,
    audio: audioFor(c.id),
    hardest: levels[c.id]?.hardest ?? [],
  }));

/** 網站上看得到的片段：還沒確認的候選先不顯示。 */
export const clips = allClips.filter((c) => !c.pending);

/** 等 Kelly 確認的候選（只在本機的審核頁 /dictation/pending 看得到） */
export const pendingClips = allClips.filter((c) => c.pending);

export const voiceItems: VoiceItem[] = lessons.flatMap((l) =>
  l.examples.map((ex, i) => ({
    kind: "voice" as const,
    id: `voice-${l.id}-${i}`,
    text_ko: ex.ko,
    text_zh: ex.zh,
    level: levels[`voice-${l.id}-${i}`]?.level ?? getGrammar(l.id)?.level ?? 0,
    form: displayForm(getGrammar(l.id)?.form ?? l.id),
    audio: audioFor(`voice-${l.id}-${i}`),
    hardest: levels[`voice-${l.id}-${i}`]?.hardest ?? [],
  })),
);

function audioFor(id: string): Audio {
  const a = (voiceAudio as Record<string, { file: string; voice: string }>)[id];
  return a ? { file: a.file, voice: a.voice } : null;
}

export function getItem(id: string): DictationItem | undefined {
  return clips.find((c) => c.id === id) ?? voiceItems.find((v) => v.id === id);
}

/** 同一種題型裡的下一題 */
export function nextItemId(item: DictationItem) {
  const list: DictationItem[] = item.kind === "clip" ? clips : voiceItems;
  if (list.length < 2) return null;
  return list[(list.findIndex((x) => x.id === item.id) + 1) % list.length].id;
}
