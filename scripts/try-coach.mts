// 本機測試 AI 教練：npx tsx --env-file=.env.local scripts/try-coach.mts
// 可用 COACH_MODEL、COACH_EFFORT 環境變數切換模型與思考深度。
import { revealFeedback, reviewSentence } from "@/lib/coach";
import { getGrammar, getLesson } from "@/lib/grammar";

// [文法 id, 情境, 句子, 第幾次, 之前的版本, 預期]
const cases: [string, number, string, number, string[], string][] = [
  ["g106", 0, "어젯밤에 드라마를 봤느라고 지각했어요.", 1, [], "錯：-느라고 前不能加過去式"],
  ["g186", 1, "이 가수의 노래를 들을수록 더 좋아해진다.", 1, [], "小問題：좋아해진다 → 좋아진다"],
  ["g186", 1, "이 가수의 노래를 들을수록 더 좋아해진다.", 2, ["이 가수의 노래를 들을수록 더 좋아해진다."], "同上，判斷要一致"],
  ["g106", 0, "새로 나온 드라마를 정주행하느라고 밤을 새우는 바람에 수업에 늦고 말았어요.", 1, [], "對：還用對 -는 바람에（4級）、-고 말다（3級）"],
  ["g211", 0, "지하철이 갑자기 멈추는 바람에 입장 시간을 놓쳤어요.", 1, [], "對"],
  ["g147", 1, "신제품 납기에 대해 문의 드리고 싶습니다.", 1, [], "對（문의드리다 可連寫，屬小問題可接受）"],
];
const pick = process.argv[2] ? process.argv[2].split(",").map(Number) : cases.map((_, i) => i);
for (const i of pick) {
  const [id, p, s, attempt, previous, expect] = cases[i];
  const fb = await reviewSentence({ item: getGrammar(id)!, lesson: getLesson(id)!, promptIndex: p, sentence: s, attempt, previous });
  const r = revealFeedback(fb, attempt, s, id);
  console.log(`\n#${i} ${id} 第${attempt}次：${s}\n  預期：${expect}\n  判斷：${r.overall}・用到本題=${r.usesTarget}/${r.targetCorrect}`);
  r.issues.forEach((x) => console.log(`  - [${x.category}] ${x.location}${x.clue ? `｜提示：${x.clue}` : ""}${x.choices.length ? `｜選項：${x.choices.join(" / ")}` : ""}`));
  if (r.otherGrammar.length) console.log(`  還用對：${r.otherGrammar.map((g) => `${g.form}(${g.level})`).join("、")}`);
  if (r.reference) console.log(`  參考：${r.reference}${r.sameAsReference ? "（相同）" : ""}`);
}
