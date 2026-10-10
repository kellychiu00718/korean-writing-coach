"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
// 只匯入型別（打包時會被拿掉）；比對函式放在不含課程資料的檔案
import type { Clip, DictationItem, Hardest } from "@/lib/dictation";
import { compareDictation, formatTime, keystrokes, normalizeForCompare } from "@/lib/dictation-compare";
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

type Result = ReturnType<typeof compareDictation> & { kpm: number; typed: string };

export function DictationPlayer({
  item,
  userId,
  nextId,
  lastAccuracy,
}: {
  item: DictationItem;
  userId: string;
  nextId: string | null;
  lastAccuracy: number | null;
}) {
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    const saved = loadDraft(item.id);
    if (saved) setTyped(saved);
  }, [item.id]);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const text = typed.trim();
    if (!text) return;
    const r = compareDictation(item.text_ko, text);
    const minutes = startedAt.current ? (Date.now() - startedAt.current) / 60000 : 0;
    // 打太快（不到 3 秒）時算出來的速度不準，就不顯示
    const kpm = minutes >= 0.05 ? Math.round(keystrokes(text) / minutes) : 0;
    setResult({ ...r, kpm, typed: text });
    saveDraft(item.id, "");
    // 紀錄失敗不影響畫面
    await createClient()
      .from("dictation_attempts")
      .insert({ user_id: userId, clip_id: item.id, typed: text, accuracy: r.accuracy, kpm: Math.min(kpm, 3000) })
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
      <Listener item={item} />

      <section className="card grid gap-3" aria-labelledby="type-title">
        <h2 id="type-title" className="text-xl font-bold">
          把聽到的打出來
        </h2>
        {result ? (
          <ResultView item={item} result={result} />
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
                saveDraft(item.id, e.target.value);
              }}
              maxLength={300}
              autoComplete="off"
              spellCheck={false}
              placeholder="들은 문장을 써 보세요"
              className="field text-lg"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-ink-soft">
                {lastAccuracy !== null ? `上次正確率 ${lastAccuracy}%` : "標點符號不用打，空格錯了也只會提醒、不扣分。"}
              </span>
              <button type="submit" className="btn" disabled={!typed.trim()}>
                對答案
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
              <Link href={`/dictation/${nextId}`} className="btn btn-ghost">
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

function ResultView({ item, result }: { item: DictationItem; result: Result }) {
  const wrong = result.answerMarks.filter((m) => m.state !== "ok").length;
  return (
    <div className="animate-pop grid gap-3" role="status">
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

      <div className="rounded-2xl border-2 border-sage px-4 py-3">
        <p className="text-xs text-ink-soft">答案</p>
        <p lang="ko" className="text-xl leading-10">
          {withSpaces(item.text_ko, result.answerMarks).map((m, i) =>
            m === " " ? (
              <span key={i}> </span>
            ) : m.state === "ok" ? (
              <span key={i}>{m.ch}</span>
            ) : (
              <mark
                key={i}
                title={m.state === "wrong" ? `你打成「${m.typedAs}」` : "漏打了"}
                className={`rounded px-0.5 text-ink underline decoration-2 underline-offset-4 ${
                  m.state === "wrong" ? "bg-hint decoration-hint-line" : "bg-rose/30 decoration-rose"
                }`}
              >
                {m.ch}
              </mark>
            ),
          )}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{item.text_zh}</p>
        {item.hardest.length > 0 && <HardestLine hardest={item.hardest} />}
      </div>

      <div className="rounded-2xl border-2 border-dashed border-line px-4 py-3">
        <p className="text-xs text-ink-soft">你打的</p>
        <p lang="ko" className="text-lg">
          {result.typed}
        </p>
      </div>

      <ul className="grid gap-1 text-sm">
        {wrong === 0 && result.extras.length === 0 ? (
          <li className="text-sage-ink">每個字都聽對了！</li>
        ) : (
          <>
            {wrong > 0 && (
              <li>
                <mark className="rounded bg-hint px-1">黃色</mark> 是打錯的字、<mark className="rounded bg-rose/30 px-1">粉色</mark> 是漏打的字，共 {wrong}&nbsp;個。
              </li>
            )}
            {result.extras.length > 0 && (
              <li>
                多打了：<span lang="ko">{result.extras.join("")}</span>
              </li>
            )}
          </>
        )}
        {result.spacingDiff > 0 && <li className="text-ink-soft">有 {result.spacingDiff}&nbsp;個地方的空格跟答案不一樣，可以對照看看。</li>}
      </ul>
    </div>
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

/** 比對時不看空格；顯示答案時把原本的空格放回去。 */
function withSpaces(answer: string, marks: Result["answerMarks"]) {
  const out: (Result["answerMarks"][number] | " ")[] = [];
  let k = 0;
  for (const ch of normalizeForCompare(answer)) {
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
  return (
    <section className="rounded-3xl border-2 border-line bg-white px-5 py-4 text-sm" aria-label="台詞來源">
      <p className="mb-1 text-xs text-ink-soft">台詞來源</p>
      <p className="font-medium">{clip.source.title}</p>
      <p className="text-ink-soft">
        {clip.source.channel}
        {clip.start !== undefined && clip.end !== undefined && `・${formatTime(clip.start)}–${formatTime(clip.end)}`}
      </p>
      {clip.source.note && <p className="mt-1 text-ink-soft">{clip.source.note}</p>}
      <p className="mt-1 text-ink-soft">聲音：{voice}，不是影片原音。</p>
      {revealed ? (
        <a href={sourceLink(clip)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm mt-3">
          {clip.start !== undefined
            ? `去原影片聽韓國人怎麼說（${formatTime(clip.start)}）`
            : "去原新聞聽韓國人怎麼說"}
        </a>
      ) : (
        <p className="mt-2 text-xs text-ink-soft">對完答案後，可以去原影片聽聽看實際的發音和語氣。</p>
      )}
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
              放慢再聽（0.75 倍）
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
