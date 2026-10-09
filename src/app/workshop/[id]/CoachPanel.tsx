"use client";

import { useState } from "react";
import type { RevealedFeedback } from "@/lib/coach";
import { displayForm, getGrammar, STATE_LABEL, type Lesson, type ProgressState } from "@/lib/grammar";

export type RoundEntry = { attempt: number; sentence: string; feedback: RevealedFeedback };

type Props = {
  grammarId: string;
  prompts: Lesson["prompts"];
  openRounds: Record<number, RoundEntry[]>;
};

const SCENE_LABEL: Record<Lesson["prompts"][number]["scene"], string> = {
  daily: "日常",
  fan: "追星",
  work: "職場",
  topik: "TOPIK",
};

const STEPS = ["指出位置", "給線索", "參考寫法"];

export function CoachPanel({ grammarId, prompts, openRounds }: Props) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [rounds, setRounds] = useState<Record<number, RoundEntry[]>>(openRounds);
  const [draft, setDraft] = useState(() => openDraft(openRounds[0]));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoted, setPromoted] = useState<{ grammarId: string; state: ProgressState }[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);

  const round = rounds[promptIndex] ?? [];
  const latest = round.at(-1);
  const closed = latest?.feedback.level === 3;
  const level = latest?.feedback.level ?? 0;

  function switchPrompt(i: number) {
    setPromptIndex(i);
    setDraft(openDraft(rounds[i]));
    setError(null);
    setPromoted([]);
  }

  function startOver() {
    setRounds((r) => ({ ...r, [promptIndex]: [] }));
    setDraft("");
    setPromoted([]);
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
        <div role="tablist" aria-label="選擇情境" className="flex gap-1.5">
          {prompts.map((p, i) => (
            <button
              key={i}
              role="tab"
              type="button"
              aria-selected={i === promptIndex}
              onClick={() => switchPrompt(i)}
              className={`rounded-full border-2 px-3 py-1 text-sm ${
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

      <ol className="mb-4 flex gap-2 text-xs" aria-label="提示進度">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full border-2 px-2 py-1 ${
              level > i ? "border-ink bg-peach" : "border-dashed border-line text-ink-soft"
            }`}
          >
            <b>{i + 1}</b> {s}
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
        <form onSubmit={submit} className="mt-5 grid gap-3">
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
            <span className="text-xs text-ink-soft">
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
    <article className="animate-pop rounded-3xl border-2 border-line p-4">
      <p className="mb-1 text-xs text-ink-soft">第 {entry.attempt} 次</p>
      <p lang="ko" className="mb-3 text-xl">
        <Highlighted sentence={entry.sentence} spans={fb.issues.map((i) => i.span)} />
      </p>
      {fb.praise && <p className="mb-2 rounded-2xl bg-sage-soft px-4 py-2 text-sage-ink">✓ {fb.praise}</p>}
      {fb.issues.map((issue, i) => (
        <div key={i} className="mb-2 rounded-2xl bg-hint px-4 py-2">
          <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-xs">{issue.category}</span>
          💡 {issue.location}
          {issue.rule && <p className="mt-1 text-sm">線索：{issue.rule}</p>}
        </div>
      ))}
      {fb.usesTarget === false && fb.level < 3 && (
        <p className="mb-2 rounded-2xl bg-hint px-4 py-2">💡 這句還沒用到本題的文法，試著放進去看看？</p>
      )}
      {fb.reference && (
        <div className="mt-2 rounded-2xl border-2 border-sage bg-white px-4 py-3">
          <p className="text-xs text-ink-soft">{fb.solved ? "寫得很好！也可以這樣說" : "參考寫法"}</p>
          <p lang="ko" className="text-lg">
            {fb.reference}
          </p>
          {fb.referenceNote && <p className="text-sm text-ink-soft">{fb.referenceNote}</p>}
        </div>
      )}
    </article>
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
