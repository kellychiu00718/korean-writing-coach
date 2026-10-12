import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { type Clip, clips, GENRE_LABEL, type Genre } from "@/lib/dictation";
import { getProfile, type Interest } from "@/lib/profile";
import { ClipCard } from "./ClipCard";
import { DictationPicks, type PickCandidate } from "./DictationPicks";
import { FilterMenu } from "./FilterMenu";
import { createClient } from "@/lib/supabase/server";

const GENRES: Genre[] = ["drama", "music", "news", "variety"];
const LEVELS = [1, 2, 3, 4, 5, 6];
const PER_PAGE = 24;

/** 依上次正確率篩選 */
const ACC_FILTERS = [
  { id: "new", label: "還沒練過" },
  { id: "low", label: "上次 60% 以下" },
  { id: "mid", label: "上次 60–89%" },
  { id: "high", label: "上次 90% 以上" },
] as const;
type AccFilter = (typeof ACC_FILTERS)[number]["id"];

/** 使用者的興趣比較常對應到哪些類型（推薦時優先） */
const INTEREST_GENRES: Record<Interest, Genre[]> = {
  fan: ["music", "variety"],
  daily: ["drama", "variety"],
  work: ["news"],
  topik: ["news"],
};

type Filters = { genre: Genre | null; level: number | null; acc: AccFilter | null; page: number };

function hrefFor(f: Filters, change: Partial<Filters>) {
  // 換篩選條件時回到第 1 頁
  const next = { ...f, page: 1, ...change };
  const q = new URLSearchParams();
  if (next.genre) q.set("genre", next.genre);
  if (next.level) q.set("level", String(next.level));
  if (next.acc) q.set("acc", next.acc);
  if (next.page > 1) q.set("page", String(next.page));
  const s = q.toString();
  return s ? `/dictation?${s}` : "/dictation";
}

function matchAcc(acc: AccFilter, last: number | undefined) {
  if (acc === "new") return last === undefined;
  if (last === undefined) return false;
  if (acc === "low") return last < 60;
  if (acc === "mid") return last >= 60 && last < 90;
  return last >= 90;
}

/**
 * 推薦：
 * 1. 還沒練過、級數跟「答得好（80% 以上）的句子」的中間級數差不多或高一級的；興趣相關的類型優先。
 * 2. 上次正確率低於 60% 的，挑分數最低的再練一次。
 * 全部由規則決定，不用 AI。前面 3 句照優先順序，其餘是「換一批」的候選。
 */
function recommend(last: Map<string, number>, interests: Interest[]): PickCandidate[] {
  // 答得好的句子取中間的級數；還沒有紀錄就從 3 級開始
  const good = clips
    .filter((c) => (last.get(c.id) ?? -1) >= 80)
    .map((c) => c.level)
    .sort((a, b) => a - b);
  const base = good.length ? good[Math.floor((good.length - 1) / 2)] : 3;
  const liked = new Set(interests.flatMap((i) => INTEREST_GENRES[i]));

  const fresh = clips
    .filter((c) => !last.has(c.id) && c.level >= base && c.level <= base + 1)
    .sort((a, b) => Number(liked.has(b.genre)) - Number(liked.has(a.genre)));
  const retry = clips
    .filter((c) => (last.get(c.id) ?? 100) < 60)
    .sort((a, b) => (last.get(a.id) ?? 0) - (last.get(b.id) ?? 0));

  const card = (c: Clip, reason: string): PickCandidate => ({
    id: c.id,
    genre: GENRE_LABEL[c.genre],
    level: c.level,
    hardest: c.hardest,
    reason,
  });
  return [
    ...retry.slice(0, 1).map((c) => card(c, `上次 ${last.get(c.id)}%，再挑戰一次`)),
    ...fresh.slice(0, 20).map((c) => card(c, liked.has(c.genre) ? "你感興趣的類型" : "難度跟你差不多")),
    ...retry.slice(1, 6).map((c) => card(c, `上次 ${last.get(c.id)}%，再挑戰一次`)),
  ];
}

export default async function DictationPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; level?: string; acc?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const f: Filters = {
    genre: GENRES.find((x) => x === sp.genre) ?? null,
    level: LEVELS.find((x) => String(x) === sp.level) ?? null,
    acc: ACC_FILTERS.find((x) => x.id === sp.acc)?.id ?? null,
    page: Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1),
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dictation");
  const profile = getProfile(user);

  // 每個片段最近一次的正確率（新的在前，第一筆就是最近一次）
  const { data } = await supabase
    .from("dictation_attempts")
    .select("clip_id, accuracy")
    .eq("user_id", user.id)
    .eq("mode", "listen")
    .order("created_at", { ascending: false })
    .limit(1000);
  const last = new Map<string, number>();
  for (const r of data ?? []) if (!last.has(r.clip_id)) last.set(r.clip_id, r.accuracy);

  const pass = (c: Clip, skip?: keyof Filters) =>
    (skip === "genre" || !f.genre || c.genre === f.genre) &&
    (skip === "level" || !f.level || c.level === f.level) &&
    (skip === "acc" || !f.acc || matchAcc(f.acc, last.get(c.id)));
  const shown = clips.filter((c) => pass(c));
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Math.min(f.page, pages);
  const pageItems = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const picks = recommend(last, profile.interests);
  const filtered = Boolean(f.genre || f.level || f.acc);

  return (
    <>
      <AppHeader current="/dictation" />
      <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-5">
        <section className="py-6 sm:py-10">
          <span className="eyebrow mb-3">聽打練習</span>
          <h1 className="text-3xl font-bold sm:text-4xl">聽一句，打一句</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            台詞來自戲劇、音樂、新聞和綜藝，聽完就把句子打出來，可以重聽、放慢。練習完之後再對答案，看看自己可以聽出多少關鍵字！也可以去原影片聽韓國人實際怎麼說。
          </p>
          <ul className="mt-4 grid max-w-2xl gap-2 text-sm sm:grid-cols-2">
            <li className="rounded-2xl border-2 border-line bg-white px-4 py-3">
              <b>聽力模式</b>
              <span className="mt-0.5 block text-ink-soft">聽完把句子打出來，對答案看看聽出了多少。</span>
            </li>
            <li className="rounded-2xl border-2 border-line bg-white px-4 py-3">
              <b>打字模式</b>
              <span className="mt-0.5 block text-ink-soft">看著句子打，測出你的韓文打字速度。</span>
            </li>
          </ul>
        </section>

        {picks.length > 0 && !filtered && page === 1 && <DictationPicks pool={picks} />}

        <h2 className="mb-4 text-xl font-bold">全部的句子</h2>

        {/* 篩選：三個下拉按鈕，選項是網址參數，重新整理也會保留 */}
        <div className="mb-5 flex flex-wrap gap-2">
          <FilterMenu
            label="類型"
            options={[null, ...GENRES].map((x) => ({
              key: x ?? "all",
              label: x ? GENRE_LABEL[x] : "全部",
              href: hrefFor(f, { genre: x }),
              count: clips.filter((c) => (!x || c.genre === x) && pass(c, "genre")).length,
              on: f.genre === x,
            }))}
          />
          <FilterMenu
            label="級數"
            options={[null, ...LEVELS].map((x) => ({
              key: x ? String(x) : "all",
              label: x ? `${x} 級` : "全部",
              href: hrefFor(f, { level: x }),
              count: clips.filter((c) => (!x || c.level === x) && pass(c, "level")).length,
              on: f.level === x,
            }))}
          />
          <FilterMenu
            label="練習狀況"
            options={[null, ...ACC_FILTERS].map((x) => ({
              key: x?.id ?? "all",
              label: x?.label ?? "全部",
              href: hrefFor(f, { acc: x?.id ?? null }),
              count: clips.filter((c) => (!x || matchAcc(x.id, last.get(c.id))) && pass(c, "acc")).length,
              on: f.acc === (x?.id ?? null),
            }))}
          />
          {filtered && (
            <Link href="/dictation" scroll={false} className="inline-flex min-h-11 items-center px-2 text-sm text-ink-soft underline">
              清除篩選
            </Link>
          )}
        </div>

        {pageItems.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-line bg-white/60 px-5 py-6 text-center text-ink-soft">
            沒有符合條件的句子。<Link href="/dictation" className="underline">清除篩選</Link>
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((c) => (
              <li key={c.id}>
                <ClipCard clip={{ id: c.id, genre: GENRE_LABEL[c.genre], level: c.level, hardest: c.hardest }} acc={last.get(c.id)} />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && <Pagination f={f} page={page} pages={pages} />}
      </main>
    </>
  );
}

/** 像搜尋結果那樣的頁碼：上一頁、頁碼（太多時中間省略）、下一頁 */
function Pagination({ f, page, pages }: { f: Filters; page: number; pages: number }) {
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);
  const btn = "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border-2 px-3 text-sm tabular-nums";
  return (
    <nav aria-label="分頁" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={hrefFor(f, { page: page - 1 })} className={`${btn} border-line bg-white hover:bg-cream`}>
          上一頁
        </Link>
      )}
      {list.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - list[i - 1] > 1 && (
            <span className="px-1 text-ink-soft" aria-hidden="true">
              …
            </span>
          )}
          <Link
            href={hrefFor(f, { page: n })}
            aria-current={n === page ? "page" : undefined}
            aria-label={`第 ${n} 頁`}
            className={`${btn} ${n === page ? "border-sage-ink bg-sage-soft font-medium text-sage-ink" : "border-line bg-white hover:bg-cream"}`}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={hrefFor(f, { page: page + 1 })} className={`${btn} border-line bg-white hover:bg-cream`}>
          下一頁
        </Link>
      )}
    </nav>
  );
}
