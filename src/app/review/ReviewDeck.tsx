"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Card = {
  id: number;
  grammarId: string;
  promptIndex: number;
  form: string;
  level: number;
  situation: string;
  mine: string;
  reference: string;
  note: string | null;
  source: "auto" | "manual";
};

export function ReviewDeck({ cards: initial }: { cards: Card[] }) {
  const [cards, setCards] = useState(initial);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setFlipped((f) => {
      const next = new Set(f);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove(id: number) {
    setError(null);
    const { error } = await createClient().from("review_cards").delete().eq("id", id);
    if (error) {
      setError("移除失敗了，請稍後再試。");
      return;
    }
    setCards((c) => c.filter((x) => x.id !== id));
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-hint px-4 py-3">
          {error}
        </p>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => {
          const open = flipped.has(c.id);
          return (
            <li key={c.id} className="card flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span lang="ko" className="rounded-full bg-peach px-2.5 py-0.5 text-sm">
                  {c.form}
                </span>
                <span className="text-ink-soft">
                  {c.level} 級・{c.source === "auto" ? "修改兩次以上" : "自己加入"}
                </span>
              </div>
              <p className="text-lg">{c.situation}</p>

              <div id={`card-back-${c.id}`} hidden={!open} className="grid gap-2">
                <div className="rounded-2xl border-2 border-dashed border-line px-4 py-2">
                  <span className="text-xs text-ink-soft">你寫的句子</span>
                  <p lang="ko" className="text-lg">
                    {c.mine}
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-sage px-4 py-2">
                  <span className="text-xs text-ink-soft">參考答案</span>
                  <p lang="ko" className="text-lg">
                    {c.reference}
                  </p>
                  {c.note && <p className="text-sm text-ink-soft">{c.note}</p>}
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-expanded={open}
                  aria-controls={`card-back-${c.id}`}
                  onClick={() => toggle(c.id)}
                >
                  {open ? "蓋起來" : "翻面對照"}
                </button>
                <Link href={`/workshop/${c.grammarId}?p=${c.promptIndex}`} className="btn btn-ghost btn-sm">
                  再寫一次
                </Link>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center px-2 text-sm text-ink-soft underline underline-offset-4"
                  onClick={() => remove(c.id)}
                >
                  移除
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
