"""
依國立國語院〈국제 통용 한국어 표준 교육과정〉的單字（vocab.json）和文法（grammar.json）分級，
推估聽打句子的級數：句子裡最高級的單字或文法就是這一句的級數。

斷詞用開源的 Kiwi（kiwipiepy）。用法：
    .venv-tts/bin/pip install kiwipiepy
    .venv-tts/bin/python scripts/estimate_levels.py              # 更新 src/data/dictation-levels.json
    .venv-tts/bin/python scripts/estimate_levels.py "문장1" ...  # 只印出結果，不寫檔

這是自動推估，最後仍以人工確認為準；不在分級表裡的字（外來語、專有名詞）不會拉高級數，會另外列出來。
"""

import json
import pathlib
import re
import sys

from kiwipiepy import Kiwi

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "src/data"
kiwi = Kiwi()

# ---------- 單字 ----------
vocab_level: dict[str, int] = {}
for w in json.loads((DATA / "vocab.json").read_text()):
    # 「있다01/있다」「지금02/지금」：斜線分開的都是同一個字的寫法，去掉同形異義的編號
    for part in w["word"].split("/"):
        key = re.sub(r"\d+$", "", part.strip())
        if key:
            vocab_level[key] = min(vocab_level.get(key, 9), w["level"])

CONTENT_TAGS = {"NNG", "NNB", "VV", "VA", "VX", "MAG", "MAJ", "MM", "XR", "NP"}
IGNORE_TAGS = {"NNP", "SN", "SL", "SH", "SW", "SF", "SP", "SS", "SE", "SO"}


def lemma(tok):
    return tok.form + "다" if tok.tag in ("VV", "VA", "VX", "VCP", "VCN") else tok.form


# ---------- 文法 ----------
def canon(form: str) -> str:
    """把母音調和、有無收尾音造成的不同寫法，統一成同一種，方便比對。"""
    f = form
    f = re.sub(r"^[아여]", "어", f)
    f = re.sub(r"^[았였]", "었", f)
    if len(f) > 1 and f.startswith("으"):
        f = f[1:]
    f = re.sub(r"^을", "ᆯ", f)
    f = re.sub(r"^은", "ᆫ", f)
    f = re.sub(r"^는다", "ᆫ다", f)
    f = re.sub(r"^습", "ᆸ", f)
    return f


def clean(form: str) -> str:
    return re.sub(r"\d+(\(\d+\))?", "", form).strip()


def pattern_for(form: str, category: str):
    """用一個假的語幹把文法接起來斷詞，再拿掉語幹，剩下的語素序列就是這個文法的樣子。"""
    f = clean(form)
    if not f or re.match(r"^-?[ㄱ-ㅎ]", f):
        return None  # 「-ㄴ다고」這類用字母開頭的寫法，交給其他變體
    if f.startswith("-") and f.endswith("-"):  # 先語末語尾：-었-、-겠-
        toks = kiwi.tokenize("먹" + f.strip("-") + "다")[1:-1]
    elif f.startswith("-"):
        toks = kiwi.tokenize("먹" + f[1:])[1:]
    elif category == "조사" or f in ("이다",):
        toks = kiwi.tokenize("학교" + f)[1:]
    else:
        toks = kiwi.tokenize("학교 " + f)[1:]
    # 字典形最後的「다」不算在文法裡（-고 싶다 → 고 싶）
    if toks and toks[-1].form == "다" and toks[-1].tag == "EF" and len(toks) > 1:
        toks = toks[:-1]
    pat = tuple((canon(t.form), t.tag) for t in toks)
    return pat or None


# 同一串語素可能同時是好幾個文法（變體斷詞後只剩「에」「었」這種常見語素時特別多），
# 這時取最低的級數，避免一個常見助詞就把句子判成高級。
_by_pattern: dict[tuple, tuple[int, str]] = {}
for g in json.loads((DATA / "grammar.json").read_text()):
    for f in [g["form"], *g.get("variants", [])]:
        p = pattern_for(f, g["category"])
        if p and (p not in _by_pattern or g["level"] < _by_pattern[p][0]):
            _by_pattern[p] = (g["level"], clean(g["form"]))
grammar_patterns: list[tuple[tuple, int, str]] = [(p, lv, name) for p, (lv, name) in _by_pattern.items()]


def find_grammar(tokens):
    seq = [(canon(t.form), t.tag) for t in tokens]
    found: dict[str, int] = {}
    for pat, level, name in grammar_patterns:
        n = len(pat)
        for i in range(len(seq) - n + 1):
            if tuple(seq[i : i + n]) == pat:
                # 同一個寫法有好幾個意思（例如 -는다고 是 3 級也是 6 級）時取比較低的，避免高估
                found[name] = min(found.get(name, 9), level)
                break
    return found


def estimate(sentence: str):
    # 斷詞偶爾會選錯（例如把「드세요」斷成「드세다」）；取前 3 種斷法，用級數最低的那一種
    candidates = [toks for toks, _ in kiwi.analyze(sentence, top_n=3)]
    results = [_estimate_tokens(toks) for toks in candidates]
    return min(results, key=lambda r: (r["level"], len(r["unknown"])))


def _estimate_tokens(tokens):
    words: dict[str, int] = {}
    unknown: list[str] = []
    for t in tokens:
        if t.tag in IGNORE_TAGS or t.tag not in CONTENT_TAGS:
            continue
        lv = vocab_level.get(lemma(t)) or vocab_level.get(t.form)
        if lv:
            words[lemma(t)] = lv
        elif lemma(t) not in unknown:
            unknown.append(lemma(t))
    gram = find_grammar(tokens)
    items = [("單字", k, v) for k, v in words.items()] + [("文法", k, v) for k, v in gram.items()]
    level = max((v for _, _, v in items), default=1)
    hardest = [{"type": t, "text": k, "level": v} for t, k, v in items if v == level and v >= 2]
    return {"level": level, "hardest": hardest, "unknown": unknown}


def main():
    if len(sys.argv) > 1:
        for s in sys.argv[1:]:
            print(s, json.dumps(estimate(s), ensure_ascii=False))
        return
    out = {}
    for c in json.loads((DATA / "dictation.json").read_text()):
        if c.get("text_ko", "").strip():
            out[c["id"]] = estimate(c["text_ko"])
    for lesson in json.loads((DATA / "lessons.json").read_text()):
        for i, ex in enumerate(lesson["examples"]):
            out[f"voice-{lesson['id']}-{i}"] = estimate(ex["ko"])
    (DATA / "dictation-levels.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(f"done: {len(out)} sentences")


if __name__ == "__main__":
    main()
