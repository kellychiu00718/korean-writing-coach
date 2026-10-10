"""
把聽打練習的句子做成音檔（Supertonic，女聲 F1、男聲 M1 輪流）：
- 課程例句（語音朗讀）
- 影片片段的台詞（src/data/dictation.json，含還沒確認的候選）

用法（需要 Python 3.9+ 和 ffmpeg）：
    python3 -m venv .venv-tts && .venv-tts/bin/pip install supertonic
    .venv-tts/bin/python scripts/generate_voice_audio.py

會產生：
    public/audio/voice/<題目 id>.mp3（例句）、public/audio/clips/<題目 id>.mp3（影片台詞）
    src/data/voice-audio.json（題目 id → 用了哪個聲音、檔名）
已經做過、句子沒變的不會重做；改了例句再跑一次就好。
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
SUPERTONIC = pathlib.Path(sys.executable).parent / "supertonic"


def sentences():
    """(題目 id, 句子, 資料夾) 的清單"""
    for lesson in json.loads(LESSONS.read_text()):
        for i, ex in enumerate(lesson["examples"]):
            yield f"voice-{lesson['id']}-{i}", ex["ko"], "voice"
    for c in json.loads(CLIPS.read_text()):
        if c.get("text_ko", "").strip():
            yield c["id"], c["text_ko"], "clips"


def main():
    old = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    manifest = {}
    for n, (item_id, text, folder) in enumerate(sentences()):
        voice = VOICES[n % len(VOICES)]
        out_dir = ROOT / "public/audio" / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha1(f"{voice}:{text}".encode()).hexdigest()[:10]
        mp3 = out_dir / f"{item_id}.mp3"
        entry = {"voice": voice, "file": f"/audio/{folder}/{item_id}.mp3", "hash": digest}
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
