"use client";

import { useId, useState } from "react";
import type { RevealedFeedback } from "@/lib/coach";
import { displayForm, getGrammar, STATE_LABEL, type Lesson, type ProgressState } from "@/lib/grammar";

export type RoundEntry = { attempt: number; sentence: string; feedback: RevealedFeedback };

type Props = {
  grammarId: string;
  prompts: Lesson["prompts"];
  openRounds: Record<number, RoundEntry[]>;
  initialPrompt?: number;
  /** 已經在複習字卡裡的情境 */
  cardPrompts?: number[];
};

const SCENE_LABEL: Record<Lesson["prompts"][number]["scene"], string> = {
  daily: "日常",
  fan: "追星",
  work: "職場",
  topik: "TOPIK",
};

const STEPS = [
  { title: "標示出要改的地方", caption: "標出句子中的哪個部分需要修改" },
  { title: "提示", caption: "提供選項、單字的初聲或文法" },
  { title: "對照參考答案", caption: "寫對之後或是修改兩次之後才出現" },
];

export function CoachPanel({ grammarId, prompts, openRounds, initialPrompt = 0, cardPrompts = [] }: Props) {
  const [promptIndex, setPromptIndex] = useState(initialPrompt);
  const [rounds, setRounds] = useState<Record<number, RoundEntry[]>>(openRounds);
  const [draft, setDraft] = useState(() => openDraft(openRounds[initialPrompt]));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoted, setPromoted] = useState<{ grammarId: string; state: ProgressState }[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [cards, setCards] = useState<Set<number>>(() => new Set(cardPrompts));
  const [cardNote, setCardNote] = useState<string | null>(null);
  const [cardPending, setCardPending] = useState(false);

  const round = rounds[promptIndex] ?? [];
  const latest = round.at(-1);
  const closed = latest?.feedback.level === 3;
  const level = latest?.feedback.level ?? 0;

  function switchPrompt(i: number) {
    setPromptIndex(i);
    setDraft(openDraft(rounds[i]));
    setError(null);
    setPromoted([]);
    setCardNote(null);
  }

  function startOver() {
    setRounds((r) => ({ ...r, [promptIndex]: [] }));
    setDraft("");
    setPromoted([]);
    setCardNote(null);
  }

  async function addCard() {
    setCardPending(true);
    setCardNote(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grammarId, promptIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCardNote(data.error ?? "加入失敗了，請稍後再試。");
        return;
      }
      setCards((c) => new Set(c).add(promptIndex));
      setCardNote("已加入複習字卡，可以在「複習字卡」頁面複習。");
    } catch {
      setCardNote("網路好像斷了，再試一次？");
    } finally {
      setCardPending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sentence = draft.trim();
    if (!sentence || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grammarId, promptIndex, sentence }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "出了點問題，請再試一次。");
        return;
      }
      setRounds((r) => {
        const base = data.attempt === 1 ? [] : (r[promptIndex] ?? []);
        return { ...r, [promptIndex]: [...base, { attempt: data.attempt, sentence, feedback: data.feedback }] };
      });
      setPromoted(data.promoted);
      setRemaining(data.remaining);
      if (data.reviewCard === "auto") {
        setCards((c) => new Set(c).add(promptIndex));
        setCardNote("這題修改了兩次以上，已自動加入複習字卡，之後可以再回來練。");
      } else {
        setCardNote(null);
      }
      setDraft(data.feedback.level === 3 ? "" : sentence);
    } catch {
      setError("網路好像斷了，再試一次？");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card" aria-labelledby="coach-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="coach-title" className="text-xl font-bold">
          自己寫寫看
        </h2>
        <div role="group" aria-label="選擇情境" className="flex gap-1.5">
          {prompts.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === promptIndex}
              onClick={() => switchPrompt(i)}
              className={`min-h-11 rounded-full border-2 px-4 text-sm ${
                i === promptIndex ? "border-ink bg-rose-soft font-medium" : "border-line bg-white"
              }`}
            >
              {SCENE_LABEL[p.scene]}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 rounded-2xl bg-cream px-4 py-3">
        <span className="mb-1 block text-xs text-ink-soft">情境</span>
        {prompts[promptIndex].situation_zh}
      </p>

      <ol className="mb-4 grid grid-cols-3 gap-2" aria-label="提示進度">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            aria-current={level === i + 1 ? "step" : undefined}
            className={`rounded-2xl border-2 px-2 py-1.5 text-center ${
              level > i ? "border-ink bg-peach" : "border-dashed border-line text-ink-soft"
            }`}
          >
            <span className="block text-xs font-bold sm:text-sm">
              {"①②③"[i]} {s.title}
            </span>
            <span className="block text-[11px] leading-snug text-ink-soft">{s.caption}</span>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="grid gap-4">
        {round.map((entry) => (
          <AttemptView key={entry.attempt} entry={entry} />
        ))}
      </div>

      {promoted.length > 0 && (
        <p role="status" className="mt-4 animate-pop rounded-2xl bg-sage-soft px-4 py-3 text-sage-ink">
          地圖更新了：
          {promoted.map((p, i) => (
            <span key={p.grammarId}>
              {i > 0 && "、"}
              <span lang="ko">「{displayForm(getGrammar(p.grammarId)?.form ?? p.grammarId)}」</span>
              {STATE_LABEL[p.state]}
            </span>
          ))}
        </p>
      )}

      {closed && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {cards.has(promptIndex) ? (
            <span className="inline-flex min-h-11 items-center rounded-full bg-sage-soft px-4 text-sm text-sage-ink">
              <span aria-hidden="true">✓&nbsp;</span>已在複習字卡中
            </span>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={addCard} disabled={cardPending}>
              {cardPending ? "加入中…" : "加入複習字卡"}
            </button>
          )}
        </div>
      )}
      {cardNote && (
        <p role="status" className="mt-3 animate-pop text-sm text-sage-ink">
          {cardNote}
        </p>
      )}

      {closed ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn" onClick={startOver}>
            再寫一句
          </button>
          {prompts.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => switchPrompt((promptIndex + 1) % prompts.length)}
            >
              換個情境
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} aria-busy={pending} className="mt-5 grid gap-3">
          <label htmlFor="sentence" className="font-medium">
            {round.length ? "改改看，再送一次" : "你的句子"}
          </label>
          <textarea
            id="sentence"
            lang="ko"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="여기에 한국어로 써 보세요"
            className="field resize-y text-lg"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-ink-soft">
              {draft.length} / 300 字
              {remaining !== null && `・今天還能問 ${remaining} 次`}
            </span>
            <button type="submit" className="btn" disabled={pending || !draft.trim()}>
              {pending ? "教練看看中…" : round.length ? "再請教練看一次" : "請教練看看"}
            </button>
          </div>
          {error && (
            <p role="alert" className="rounded-2xl bg-hint px-4 py-3">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

/** 這一輪還沒結束時，把上一句放回輸入框，方便直接修改。 */
function openDraft(round: RoundEntry[] | undefined) {
  const last = round?.at(-1);
  return last && last.feedback.level < 3 ? last.sentence : "";
}

function AttemptView({ entry }: { entry: RoundEntry }) {
  const { feedback: fb } = entry;
  return (
    <article className="animate-pop rounded-[32px] border-2 border-line p-4">
      <p className="mb-1 text-xs text-ink-soft">第 {entry.attempt} 次</p>
      <p lang="ko" className="mb-3 text-xl">
        <Highlighted sentence={entry.sentence} spans={fb.issues.map((i) => i.span)} />
      </p>
      {fb.praise && <p className="mb-2 rounded-2xl bg-sage-soft px-4 py-2 text-sage-ink"><span aria-hidden="true">✓ </span>{fb.praise}</p>}
      {fb.issues.map((issue, i) => {
        // 舊紀錄的線索欄位叫 rule
        const clue = issue.clue ?? (issue as { rule?: string | null }).rule;
        return (
          <div key={i} className="mb-2 rounded-2xl bg-hint px-4 py-2">
            <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-xs">{issue.category}</span>
            {issue.location}
            {clue && <p className="mt-1 text-sm"><span aria-hidden="true">💡 </span>提示：{clue}</p>}
            {issue.choices?.length > 0 && (
              <p lang="ko" className="mt-1.5 flex flex-wrap gap-1.5">
                {issue.choices.map((c) => (
                  <span key={c} className="rounded-full border-2 border-ink bg-white px-3 py-0.5">
                    {c}
                  </span>
                ))}
              </p>
            )}
          </div>
        );
      })}
      {fb.usesTarget === false && fb.level < 3 && (
        <p className="mb-2 rounded-2xl bg-hint px-4 py-2">這句還沒用到本題的文法，試著放進去看看？</p>
      )}
      {fb.otherGrammar?.length > 0 && (
        <p className="mb-2 rounded-2xl bg-sage-soft px-4 py-2 text-sage-ink">
          <span aria-hidden="true">✨ </span>你還用對了：
          {fb.otherGrammar.map((g, i) => (
            <span key={g.id}>
              {i > 0 && "、"}
              <span lang="ko">{g.form}</span>（{g.level} 級）
            </span>
          ))}
        </p>
      )}
      {fb.reference && (
        <div className="mt-2 rounded-2xl border-2 border-sage bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">
            {fb.sameAsReference
              ? "跟參考寫法一模一樣！完全靠自己寫出來了"
              : fb.solved
                ? "寫得很好！這是用本題文法的參考寫法"
                : "參考寫法"}
          </p>
          {!fb.sameAsReference && (
            <p lang="ko" className="text-lg">
              {fb.reference}
            </p>
          )}
          {fb.referenceNote && <p className="text-sm text-ink-soft">{fb.referenceNote}</p>}
          {fb.alternatives?.length > 0 && <Alternatives items={fb.alternatives} />}
        </div>
      )}
    </article>
  );
}

function Alternatives({ items }: { items: { ko: string; note_zh: string }[] }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-sage-ink underline underline-offset-4"
      >
        {open ? "收起其他寫法" : "想知道其他寫法？"}
      </button>
      {open && (
        <ul id={listId} className="mt-2 grid gap-2">
          {items.map((a) => (
            <li key={a.ko} className="animate-pop rounded-2xl bg-cream px-3 py-2">
              <span lang="ko" className="block">
                {a.ko}
              </span>
              <span className="text-sm text-ink-soft">{a.note_zh}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Highlighted({ sentence, spans }: { sentence: string; spans: string[] }) {
  const marks: [number, number][] = [];
  for (const span of spans) {
    if (!span) continue;
    const start = sentence.indexOf(span);
    if (start >= 0 && !marks.some(([a, b]) => start < b && start + span.length > a)) {
      marks.push([start, start + span.length]);
    }
  }
  marks.sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  marks.forEach(([a, b], i) => {
    if (a > cursor) parts.push(sentence.slice(cursor, a));
    parts.push(
      <mark key={i} className="rounded bg-hint px-0.5 text-ink underline decoration-hint-line decoration-dotted decoration-2 underline-offset-4">
        {sentence.slice(a, b)}
      </mark>,
    );
    cursor = b;
  });
  parts.push(sentence.slice(cursor));
  return <>{parts}</>;
}
