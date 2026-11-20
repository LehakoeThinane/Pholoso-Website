"""Read-aloud audio for Kids' World (brief v5 §10c).

Turns every text in content/audio/<lang>/<id>.txt into public/audio/<lang>/<id>.mp3:
mono, 48 kbps, made at build time on this computer (never in the browser).

- A real recording always wins: content/audio/recorded/<lang>/<id>.mp3 is copied as-is.
- Otherwise the open-source Kokoro voice (Apache 2.0) speaks the text. The voice for each id
  is in content/audio/voices.json ("default", or an id or id prefix).
- Files whose text and voice have not changed are skipped (content/audio/<lang>/.made.json).

Set up once (see docs/AUDIO.md):
    py -3.12 -m venv .venv-audio
    .venv-audio/Scripts/python -m pip install --index-url https://download.pytorch.org/whl/cpu torch
    .venv-audio/Scripts/python -m pip install "kokoro>=0.9.4" soundfile lameenc
Run:
    .venv-audio/Scripts/python scripts/generate-audio.py [--lang en] [--force]
"""

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_RATE = 24000  # Kokoro's output
KBPS = 48


def voice_for(item_id: str, voices: dict) -> str:
    best = ""
    for key in voices:
        if key != "default" and item_id.startswith(key) and len(key) > len(best):
            best = key
    return voices[best] if best else voices["default"]


def to_mp3(samples) -> bytes:
    import lameenc
    import numpy as np

    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2").tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(KBPS)
    enc.set_in_sample_rate(SAMPLE_RATE)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--force", action="store_true", help="make every file again")
    args = ap.parse_args()

    texts = ROOT / "content" / "audio" / args.lang
    recorded = ROOT / "content" / "audio" / "recorded" / args.lang
    out = ROOT / "public" / "audio" / args.lang
    out.mkdir(parents=True, exist_ok=True)
    voices = json.loads((ROOT / "content" / "audio" / "voices.json").read_text("utf-8"))
    made_file = texts / ".made.json"
    made = json.loads(made_file.read_text("utf-8")) if made_file.exists() else {}

    pipelines = {}
    count = {"recorded": 0, "made": 0, "kept": 0}
    wanted = set()
    for txt in sorted(texts.glob("*.txt")):
        item = txt.stem
        wanted.add(item)
        target = out / f"{item}.mp3"
        human = recorded / f"{item}.mp3"
        if human.exists():
            shutil.copyfile(human, target)
            made[item] = "recorded"
            count["recorded"] += 1
            continue
        text = txt.read_text("utf-8").strip()
        voice = voice_for(item, voices)
        key = hashlib.sha256(f"{voice}|{text}".encode()).hexdigest()
        if not args.force and made.get(item) == key and target.exists():
            count["kept"] += 1
            continue
        from kokoro import KPipeline
        import numpy as np

        lang_code = voice[0]  # 'a' American English, 'b' British English
        if lang_code not in pipelines:
            pipelines[lang_code] = KPipeline(lang_code=lang_code, repo_id="hexgrad/Kokoro-82M")
        chunks = [audio for _, _, audio in pipelines[lang_code](text, voice=voice, speed=0.92)]
        pause = np.zeros(int(SAMPLE_RATE * 0.25), dtype="float32")
        joined = np.concatenate([np.concatenate([c.numpy() if hasattr(c, "numpy") else c, pause]) for c in chunks])
        target.write_bytes(to_mp3(joined))
        made[item] = key
        count["made"] += 1
        print(f"  made {item}.mp3 ({target.stat().st_size // 1024} KB, {voice})")

    # Audio for texts that no longer exist is removed
    for old in out.glob("*.mp3"):
        if old.stem not in wanted:
            old.unlink()
            made.pop(old.stem, None)
            print(f"  removed {old.name} (no text any more)")
    made_file.write_text(json.dumps(made, indent=2, sort_keys=True) + "\n", "utf-8")
    print(f"audio ({args.lang}): {count['made']} made, {count['kept']} unchanged, {count['recorded']} recorded")
    return 0


if __name__ == "__main__":
    sys.exit(main())
