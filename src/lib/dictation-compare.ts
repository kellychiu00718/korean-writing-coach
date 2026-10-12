// 聽打比對：純函式，瀏覽器和伺服器都能用（不要在這裡匯入課程資料，避免參考答案被打包進瀏覽器）。

/** 秒數寫成 0:42 這種格式 */
export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type CharMark = { ch: string; state: "ok" | "missing" | "wrong" | "extra" };

/** 去掉標點、把連續空格合成一個，比對時只看字和空格。 */
export function normalizeForCompare(s: string) {
  return s
    .normalize("NFC")
    .replace(/[.,!?。！？~…'"“”‘’「」『』()（）\-–—:;·・]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 逐字比對答案和使用者打的字（不看空格），用最長共同子序列找出對齊方式：
 * - 答案有、使用者沒打到的字：missing（同一個位置使用者打了別的字就算 wrong）
 * - 使用者多打的字：extra
 * 正確率＝打對的字 ÷（答案和輸入中比較長的字數）；空格（띄어쓰기）另外比，只提醒不扣分。
 */
export function compareDictation(answer: string, typed: string) {
  const a = [...normalizeForCompare(answer).replace(/ /g, "")];
  const b = [...normalizeForCompare(typed).replace(/ /g, "")];

  // dp[i][j]＝a 的前 i 個字和 b 的前 j 個字的最長共同子序列長度
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // 從尾巴往回走，得到對齊結果
  const ops: { kind: "ok" | "del" | "ins"; a?: string; b?: string }[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ kind: "ok", a: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ kind: "ins", b: b[j - 1] });
      j--;
    } else {
      ops.push({ kind: "del", a: a[i - 1] });
      i--;
    }
  }
  ops.reverse();

  // 相鄰的「漏打＋多打」視為打錯：答案那一格顯示 wrong，使用者打的字放在 typedAs
  // typedMarks：使用者打的每個字（不含空格）對到答案的狀態，用來在「你打的」那一行標出打錯和多打的字
  const answerMarks: (CharMark & { typedAs?: string })[] = [];
  const typedMarks: CharMark[] = [];
  const extras: string[] = [];
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.kind === "ok") {
      answerMarks.push({ ch: op.a!, state: "ok" });
      typedMarks.push({ ch: op.a!, state: "ok" });
    } else if (op.kind === "del") {
      const next = ops[k + 1];
      if (next?.kind === "ins") {
        answerMarks.push({ ch: op.a!, state: "wrong", typedAs: next.b });
        typedMarks.push({ ch: next.b!, state: "wrong" });
        k++;
      } else answerMarks.push({ ch: op.a!, state: "missing" });
    } else {
      const next = ops[k + 1];
      if (next?.kind === "del") {
        answerMarks.push({ ch: next.a!, state: "wrong", typedAs: op.b });
        typedMarks.push({ ch: op.b!, state: "wrong" });
        k++;
      } else {
        extras.push(op.b!);
        typedMarks.push({ ch: op.b!, state: "extra" });
      }
    }
  }

  const correct = answerMarks.filter((m) => m.state === "ok").length;
  // 分母取答案和輸入比較長的那個，多打的字也會扣分
  const accuracy = a.length ? Math.round((correct / Math.max(a.length, b.length)) * 100) : 0;
  return { answerMarks, typedMarks, extras, accuracy, spacingDiff: spacingDifferences(answer, typed) };
}

/** 字都打對的前提下，比較兩句在哪幾個位置空格不一樣（只看字和字之間有沒有空格）。 */
function spacingDifferences(answer: string, typed: string) {
  const gaps = (s: string) => {
    const out: boolean[] = [];
    const chars = [...normalizeForCompare(s)];
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === " ") continue;
      out.push(chars[i + 1] === " ");
    }
    return { letters: chars.filter((c) => c !== " ").join(""), gaps: out };
  };
  const x = gaps(answer);
  const y = gaps(typed);
  if (x.letters !== y.letters) return 0;
  return x.gaps.reduce((n, g, i) => n + (g !== y.gaps[i] ? 1 : 0), 0);
}

/** 大約的按鍵數：韓文字拆成字母（ㄱ、ㅏ…）來數，跟韓國打字練習常用的「타수」接近。 */
export function keystrokes(text: string) {
  return [...text.normalize("NFD")].length;
}

/**
 * 打字速度的分級，參考大韓商工會議所過去的打字技能檢定（《韓國民族文化大百科事典》「타자수」條目）：
 * 扣掉錯字後，10 分鐘 3 級 1,500 타、2 級 2,000 타、1 級 2,500 타，也就是每分鐘 150／200／250 타。
 * 那是打字機時代的制度，這裡只當作參考。
 */
export const TYPING_GRADES = [
  { grade: "1 級", min: 250 },
  { grade: "2 級", min: 200 },
  { grade: "3 級", min: 150 },
] as const;

export function typingGrade(netKpm: number) {
  return TYPING_GRADES.find((g) => netKpm >= g.min)?.grade ?? null;
}

/** 只算打對的字的按鍵數（淨타수） */
export function netKeystrokes(marks: CharMark[]) {
  return marks.filter((m) => m.state === "ok").reduce((n, m) => n + keystrokes(m.ch), 0);
}

/** 聽力模式正確率達到這個標準，才算「聽懂」這一句（我的頁面的統計用） */
export const UNDERSTOOD = 90;
