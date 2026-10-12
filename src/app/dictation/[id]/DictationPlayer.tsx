"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
// 只匯入型別（打包時會被拿掉）；比對函式放在不含課程資料的檔案
import type { Clip, DictationItem, Hardest } from "@/lib/dictation";
import type { CharMark } from "@/lib/dictation-compare";
import {
  compareDictation,
  formatTime,
  keystrokes,
  netKeystrokes,
  normalizeForCompare,
  TYPING_GRADES,
  typingGrade,
} from "@/lib/dictation-compare";
import { createClient } from "@/lib/supabase/client";

// 沒送出的字存在這台裝置的瀏覽器裡，跟句子工坊一樣
const draftKey = (id: string) => `draft:dictation:${id}`;
function loadDraft(id: string) {
  try {
    return localStorage.getItem(draftKey(id)) ?? "";
  } catch {
    return "";
  }
}
function saveDraft(id: string, text: string) {
  try {
    if (text) localStorage.setItem(draftKey(id), text);
    else localStorage.removeItem(draftKey(id));
  } catch {
    // 無痕模式或封鎖網站資料時存不了，不影響練習
  }
}

/** listen：聽力模式（聽完打出來）；type：打字模式（看著句子打，測打字速度） */
export type Mode = "listen" | "type";

type Result = ReturnType<typeof compareDictation> & { kpm: number; netKpm: number; typed: string };

export function DictationPlayer({
  item,
  userId,
  nextId,
  lastAccuracy,
  mode,
}: {
  item: DictationItem;
  userId: string;
  nextId: string | null;
  lastAccuracy: number | null;
  mode: Mode;
}) {
  // 打字模式的草稿分開存，切換模式時不會互相蓋掉
  const key = mode === "type" ? `${item.id}:type` : item.id;
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    setResult(null);
    setTyped(loadDraft(key));
    startedAt.current = null;
  }, [key]);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const text = typed.trim();
    if (!text) return;
    const r = compareDictation(item.text_ko, text);
    const minutes = startedAt.current ? (Date.now() - startedAt.current) / 60000 : 0;
    // 打太快（不到 3 秒）時算出來的速度不準，就不顯示
    const kpm = minutes >= 0.05 ? Math.round(keystrokes(text) / minutes) : 0;
    const netKpm = minutes >= 0.05 ? Math.round(netKeystrokes(r.answerMarks) / minutes) : 0;
    setResult({ ...r, kpm, netKpm, typed: text });
    saveDraft(key, "");
    // 打字模式記的是「只算打對的字」的速度，用 mode 跟聽力模式分開（我的頁面畫打字速度用）。
    // 紀錄失敗不影響畫面
    await createClient()
      .from("dictation_attempts")
      .insert(
        mode === "type"
          ? { user_id: userId, clip_id: item.id, typed: text, accuracy: r.accuracy, kpm: Math.min(netKpm, 3000), mode }
          : { user_id: userId, clip_id: item.id, typed: text, accuracy: r.accuracy, kpm: Math.min(kpm, 3000) },
      )
      .then(
        () => {},
        () => {},
      );
  }

  function retry() {
    setResult(null);
    setTyped("");
    startedAt.current = null;
  }

  return (
    <div className="grid gap-5">
      {mode === "listen" ? <Listener item={item} /> : <TypeTarget item={item} />}

      <section className="card grid gap-3" aria-labelledby="type-title">
        <h2 id="type-title" className="text-xl font-bold">
          {mode === "listen" ? "把聽到的打出來" : "照著上面的句子打"}
        </h2>
        {result ? (
          <ResultView item={item} result={result} mode={mode} />
        ) : (
          <form onSubmit={check} className="grid gap-3">
            <label htmlFor="typed" className="sr-only">
              你聽到的句子
            </label>
            <input
              id="typed"
              lang="ko"
              value={typed}
              onChange={(e) => {
                if (!startedAt.current && e.target.value) startedAt.current = Date.now();
                setTyped(e.target.value);
                saveDraft(key, e.target.value);
              }}
              maxLength={300}
              autoComplete="off"
              spellCheck={false}
              placeholder={mode === "listen" ? "들은 문장을 써 보세요" : "위 문장을 그대로 써 보세요"}
              className="field text-lg"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-ink-soft">
                {mode === "type"
                  ? "從打下第一個字開始計時，按「測速度」停止。"
                  : lastAccuracy !== null
                    ? `上次正確率 ${lastAccuracy}%`
                    : "標點符號不用打，空格錯了也只會提醒、不扣分。"}
              </span>
              <button type="submit" className="btn" disabled={!typed.trim()}>
                {mode === "type" ? "測速度" : "對答案"}
              </button>
            </div>
          </form>
        )}
        {result && (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn" onClick={retry}>
              再試一次
            </button>
            {nextId && (
              <Link href={`/dictation/${nextId}${mode === "type" ? "?mode=type" : ""}`} className="btn btn-ghost">
                下一題
              </Link>
            )}
          </div>
        )}
      </section>

      <SourceCard item={item} revealed={Boolean(result)} />
    </div>
  );
}

function ResultView({ item, result, mode }: { item: DictationItem; result: Result; mode: Mode }) {
  const allOk = result.answerMarks.every((m) => m.state === "ok") && result.extras.length === 0;
  const grade = typingGrade(result.netKpm);
  return (
    <div className="animate-pop grid gap-3" role="status">
      {mode === "type" ? (
        <div className="grid gap-1">
          <p className="font-display text-3xl tabular-nums">
            {result.netKpm > 0 ? result.netKpm : "—"}
            <span className="ml-1.5 font-sans text-sm text-ink-soft">타／分鐘（只算打對的字）</span>
          </p>
          {result.netKpm > 0 ? (
            <p className="text-sm">
              {grade ? (
                <>
                  大約是 <b>{grade}</b> 的速度
                </>
              ) : (
                <>還沒到 3 級（每分鐘 {TYPING_GRADES[2].min} 타）</>
              )}
              <span className="text-ink-soft">
                ・正確率 <span className="tabular-nums">{result.accuracy}</span>%
              </span>
            </p>
          ) : (
            <p className="text-sm text-ink-soft">打得太快了，不到 3 秒算不出速度。</p>
          )}
          <p className="text-xs text-ink-soft">
            分級參考大韓商工會議所過去的打字技能檢定：每分鐘 3 級 150 타、2 級 200 타、1 級 250 타（扣掉錯字）。
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <p className="font-display text-3xl tabular-nums">
            {result.accuracy}
            <span className="font-sans text-base">%</span>
            <span className="ml-1.5 font-sans text-sm text-ink-soft">正確率</span>
          </p>
          {result.kpm > 0 && (
            <p className="text-sm text-ink-soft tabular-nums">每分鐘大約 {result.kpm}&nbsp;타（按鍵數）</p>
          )}
        </div>
      )}

      <div className="rounded-2xl border-2 border-sage px-4 py-3">
        <p className="text-xs text-ink-soft">答案</p>
        <p lang="ko" className="text-xl leading-10">
          <Marked text={item.text_ko} marks={result.answerMarks} />
        </p>
        <p className="mt-1 text-sm text-ink-soft">{item.text_zh}</p>
        {item.hardest.length > 0 && <HardestLine hardest={item.hardest} />}
      </div>

      <div className="rounded-2xl border-2 border-dashed border-line px-4 py-3">
        <p className="text-xs text-ink-soft">你打的</p>
        <p lang="ko" className="text-lg leading-9">
          <Marked text={result.typed} marks={result.typedMarks} />
        </p>
      </div>

      <MarkLegend result={result} />
      {allOk && <p className="text-sm text-sage-ink">{mode === "listen" ? "每個字都聽對了！" : "每個字都打對了！"}</p>}
      {result.spacingDiff > 0 && (
        <p className="text-sm text-ink-soft">有 {result.spacingDiff}&nbsp;個地方的空格跟答案不一樣，可以對照看看。</p>
      )}
    </div>
  );
}

/**
 * 把標示套回原句（比對時不看空格和標點，顯示時放回空格）：
 * 漏打的字用玫瑰紅圈起來；打錯和多打的字用跟句子工坊一樣的黃色螢光＋點點底線。
 */
function Marked({ text, marks }: { text: string; marks: CharMark[] }) {
  return (
    <>
      {withSpaces(text, marks).map((m, i) =>
        m === " " ? (
          <span key={i}> </span>
        ) : m.state === "ok" ? (
          <span key={i}>{m.ch}</span>
        ) : m.state === "missing" ? (
          <mark
            key={i}
            className="mx-px inline-block rounded-full bg-transparent px-1 leading-tight text-ink ring-2 ring-rose"
          >
            {m.ch}
            <span className="sr-only">（漏打）</span>
          </mark>
        ) : (
          <mark
            key={i}
            className="rounded bg-hint px-0.5 text-ink underline decoration-hint-line decoration-dotted decoration-2 underline-offset-4"
          >
            {m.ch}
            <span className="sr-only">{m.state === "extra" ? "（多打）" : "（打錯）"}</span>
          </mark>
        ),
      )}
    </>
  );
}

/** 標示說明：只列出這次真的有出現的標示 */
function MarkLegend({ result }: { result: Result }) {
  const missing = result.answerMarks.some((m) => m.state === "missing");
  const wrong = result.answerMarks.some((m) => m.state === "wrong") || result.extras.length > 0;
  if (!missing && !wrong) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
      {missing && (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" lang="ko" className="inline-block rounded-full px-1 leading-tight text-ink ring-2 ring-rose">
            가
          </span>
          圈起來的是漏打的字
        </span>
      )}
      {wrong && (
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            lang="ko"
            className="rounded bg-hint px-0.5 text-ink underline decoration-hint-line decoration-dotted decoration-2 underline-offset-4"
          >
            가
          </span>
          黃色底的是打錯或多打的字
        </span>
      )}
    </p>
  );
}

/** 打字模式：把要打的句子直接顯示出來 */
function TypeTarget({ item }: { item: DictationItem }) {
  return (
    <section className="card grid gap-2" aria-labelledby="target-title">
      <h1 id="target-title" className="text-xl font-bold">
        看看這一句
      </h1>
      <p lang="ko" className="rounded-2xl bg-cream px-4 py-5 text-xl leading-10">
        {item.text_ko}
      </p>
      <p className="text-xs text-ink-soft">測的是打字速度和正確度；想練聽力請切回聽力模式。</p>
    </section>
  );
}

/** 這句裡級數最高的單字或文法（依國立國語院分級表推估） */
function HardestLine({ hardest }: { hardest: Hardest[] }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-ink-soft">這句最難的：</span>
      {hardest.map((h) => (
        <span key={`${h.type}${h.text}`} className="rounded-full bg-peach px-2 py-0.5">
          <span lang="ko" className="ko-inline">
            {h.text}
          </span>
          <span className="text-ink-soft">
            （{h.level}&nbsp;級{h.type}）
          </span>
        </span>
      ))}
    </p>
  );
}

/** 比對時不看空格；顯示時把原本的空格放回去。 */
function withSpaces(text: string, marks: CharMark[]) {
  const out: (CharMark | " ")[] = [];
  let k = 0;
  for (const ch of normalizeForCompare(text)) {
    if (ch === " ") out.push(" ");
    else if (marks[k]) out.push(marks[k++]);
  }
  return out;
}

function SourceCard({ item, revealed }: { item: DictationItem; revealed: boolean }) {
  const voice = item.audio
    ? `Supertone 的 Supertonic 語音合成（${item.audio.voice === "M1" ? "男聲" : "女聲"}）`
    : "這台裝置的瀏覽器內建韓文語音，不同裝置聽起來會不太一樣";
  if (item.kind === "voice") {
    return (
      <section className="rounded-3xl border-2 border-line bg-white px-5 py-4 text-sm" aria-label="句子來源">
        <p className="mb-1 text-xs text-ink-soft">來源</p>
        <p>句子：慢慢寫自編的課程例句</p>
        <p className="text-ink-soft">聲音：{voice}</p>
      </section>
    );
  }
  const clip = item;
  // 影片標題可能透露台詞內容，對完答案才顯示
  if (!revealed) {
    return (
      <section className="rounded-3xl border-2 border-line bg-white px-5 py-4 text-sm" aria-label="台詞來源">
        <p className="mb-1 text-xs text-ink-soft">台詞來源</p>
        <p className="text-ink-soft">對完答案後會顯示出處，也可以去原影片聽聽看實際的發音和語氣。</p>
        <p className="mt-1 text-ink-soft">聲音：{voice}</p>
      </section>
    );
  }
  return (
    <section className="rounded-3xl border-2 border-line bg-white px-5 py-4 text-sm" aria-label="台詞來源">
      <p className="mb-1 text-xs text-ink-soft">台詞來源</p>
      <p className="font-medium">{clip.source.title}</p>
      <p className="text-ink-soft">
        {clip.source.channel}
        {clip.start !== undefined && clip.end !== undefined && `・${formatTime(clip.start)}–${formatTime(clip.end)}`}
      </p>
      {clip.source.note && <p className="mt-1 text-ink-soft">{clip.source.note}</p>}
      <p className="mt-1 text-ink-soft">聲音：{voice}</p>
      <a href={sourceLink(clip)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm mt-3">
        {clip.start !== undefined ? `去原影片聽韓國人怎麼說（${formatTime(clip.start)}）` : "去原新聞聽韓國人怎麼說"}
      </a>
      <p className="mt-2 text-xs text-ink-soft">影片版權屬於原作者，本站只引用一句台詞並附上出處，不下載、不儲存影片。</p>
    </section>
  );
}

/** 原影片連結：YouTube 帶上時間點，其他網站直接連過去 */
function sourceLink(clip: Clip) {
  if (clip.start === undefined || !clip.videoId) return clip.source.url;
  return `${clip.source.url}${clip.source.url.includes("?") ? "&" : "?"}t=${clip.start}s`;
}

/** 挑一個韓文語音；有些瀏覽器要等 voiceschanged 之後才拿得到語音清單 */
function useKoreanVoice() {
  const [state, setState] = useState<{ supported: boolean; voice: SpeechSynthesisVoice | null; checked: boolean }>({
    supported: true,
    voice: null,
    checked: false,
  });
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setState({ supported: false, voice: null, checked: true });
      return;
    }
    const pick = () => {
      const voices = speechSynthesis.getVoices();
      const ko = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("ko"));
      // 優先用一般的標準語音（Apple 的 Yuna、Google、Microsoft），避開「爺爺、奶奶」這類角色語音
      const preferred = ["Yuna", "Google", "SunHi", "InJoon", "Hyunsu", "Heami"];
      const voice =
        preferred.map((name) => ko.find((v) => v.name.includes(name))).find(Boolean) ??
        ko.find((v) => v.localService) ??
        ko[0] ??
        null;
      setState({ supported: true, voice, checked: voices.length > 0 });
    };
    pick();
    speechSynthesis.addEventListener("voiceschanged", pick);
    // 有些瀏覽器不會觸發 voiceschanged，1.5 秒後就當作已經檢查過
    const t = setTimeout(() => setState((s) => ({ ...s, checked: true })), 1500);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", pick);
      clearTimeout(t);
      speechSynthesis.cancel();
    };
  }, []);
  return state;
}

/** 聽的區塊：播預先做好的音檔；音檔載入失敗才改用瀏覽器內建語音 */
function Listener({ item }: { item: DictationItem }) {
  const { supported, voice, checked } = useKoreanVoice();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const useFile = Boolean(item.audio) && !audioFailed;

  function play(rate: number) {
    const a = audioRef.current;
    if (useFile && a) {
      a.pause();
      a.currentTime = 0;
      a.playbackRate = rate;
      a.play().catch(() => setAudioFailed(true));
      return;
    }
    speak(rate);
  }

  function speak(rate: number) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(item.text_ko);
    u.lang = "ko-KR";
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onstart = () => setPlaying(true);
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    speechSynthesis.speak(u);
  }

  return (
    <section className="card grid gap-4" aria-labelledby="listen-title">
      <h1 id="listen-title" className="text-xl font-bold">
        聽聽看這一句
      </h1>
      {item.audio && (
        <audio
          ref={audioRef}
          src={item.audio.file}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setAudioFailed(true)}
        />
      )}
      <div className="flex items-center justify-center rounded-2xl bg-cream py-8" aria-hidden="true">
        <span className={`text-5xl ${playing ? "motion-safe:animate-pulse" : ""}`}>🔊</span>
      </div>
      {!useFile && !supported ? (
        <p role="alert" className="rounded-2xl bg-hint px-4 py-3">
          這個瀏覽器不支援語音朗讀，換成 Chrome、Safari 或 Edge 試試看。
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" onClick={() => play(1)}>
              {playing ? "播放中…" : "播放這一句"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => play(0.75)}>
              放慢（0.75 倍）
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => play(0.5)}>
              再慢一點（0.5 倍）
            </button>
          </div>
          {!useFile && checked && !voice && (
            <p className="rounded-2xl bg-hint px-4 py-3 text-sm">
              這台裝置好像沒有韓文語音，唸出來可能不是韓文。可以在系統設定裡加入韓文語音，或換一個瀏覽器試試看。
            </p>
          )}
        </>
      )}
      <p className="text-xs text-ink-soft">可以重聽很多次，不限次數。</p>
    </section>
  );
}
