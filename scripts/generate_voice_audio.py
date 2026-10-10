"""
把聽打練習的句子做成音檔（Supertonic，女聲 F1、男聲 M1）：
- 課程例句（語音朗讀）
- 影片片段的台詞（src/data/dictation.json，含還沒確認的候選）

用法（需要 Python 3.9+ 和 ffmpeg）：
    python3 -m venv .venv-tts && .venv-tts/bin/pip install supertonic
    .venv-tts/bin/python scripts/generate_voice_audio.py

會產生：
    public/audio/voice/<題目 id>.mp3（例句）、public/audio/clips/<題目 id>.mp3（影片台詞）
    src/data/voice-audio.json（題目 id → 用了哪個聲音、檔名）
已經做過、句子和聲音都沒變的不會重做；改了例句再跑一次就好。

聲音怎麼選：
1. dictation.json 裡有 "speaker"（female／male）就照它，例如依歌手性別標好的歌詞。
2. 句子裡有通常只有男生會用的稱呼（형、형님、누나）就用男聲；
   有通常只有女生會用的稱呼（오빠、언니）就用女聲。用 Kiwi 斷詞判斷，「형식」「형태」不會被誤判。
3. 都沒有（新聞、課程例句等）就女聲、男聲輪流。
"""

import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
LESSONS = ROOT / "src/data/lessons.json"
CLIPS = ROOT / "src/data/dictation.json"
MANIFEST = ROOT / "src/data/voice-audio.json"
VOICES = ["F1", "M1"]
VOICE_OF = {"female": "F1", "male": "M1"}
MALE_WORDS = {"형", "형님", "누나"}
FEMALE_WORDS = {"오빠", "언니"}

_kiwi = None


def speaker_from_words(text):
    """從稱呼判斷說話的人是男生還是女生；判斷不出來就回傳 None。"""
    global _kiwi
    if _kiwi is None:
        from kiwipiepy import Kiwi

        _kiwi = Kiwi()
    nouns = {t.form for t in _kiwi.tokenize(text) if t.tag.startswith("NN")}
    male, female = bool(nouns & MALE_WORDS), bool(nouns & FEMALE_WORDS)
    if male and not female:
        return "male"
    if female and not male:
        return "female"
    return None
SUPERTONIC = pathlib.Path(sys.executable).parent / "supertonic"


def sentences():
    """(題目 id, 句子, 資料夾, 指定的說話者) 的清單"""
    for lesson in json.loads(LESSONS.read_text()):
        for i, ex in enumerate(lesson["examples"]):
            yield f"voice-{lesson['id']}-{i}", ex["ko"], "voice", None
    for c in json.loads(CLIPS.read_text()):
        if c.get("text_ko", "").strip():
            yield c["id"], c["text_ko"], "clips", c.get("speaker")


def main():
    old = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    manifest = {}
    for n, (item_id, text, folder, speaker) in enumerate(sentences()):
        if speaker in VOICE_OF:
            voice, reason = VOICE_OF[speaker], "指定"
        elif guess := speaker_from_words(text):
            voice, reason = VOICE_OF[guess], "稱呼"
        else:
            voice, reason = VOICES[n % len(VOICES)], "輪流"
        out_dir = ROOT / "public/audio" / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha1(f"{voice}:{text}".encode()).hexdigest()[:10]
        mp3 = out_dir / f"{item_id}.mp3"
        entry = {"voice": voice, "file": f"/audio/{folder}/{item_id}.mp3", "hash": digest, "reason": reason}
        if old.get(item_id, {}).get("hash") == digest and mp3.exists():
            manifest[item_id] = entry
            continue
        with tempfile.TemporaryDirectory() as tmp:
            wav = pathlib.Path(tmp) / "out.wav"
            subprocess.run(
                [str(SUPERTONIC), "tts", text, "-o", str(wav), "--lang", "ko", "--voice", voice],
                check=True,
                capture_output=True,
            )
            # 單聲道 64 kbps，一句大約幾十 KB
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-b:a", "64k", str(mp3)],
                check=True,
            )
        manifest[item_id] = entry
        print(f"{item_id}  {voice}  {text}")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"done: {len(manifest)} items")


if __name__ == "__main__":
    main()
