# Read-aloud audio (Kids' World)

Every Kids' World page has a "Read it to me" button that plays a recording of the page
(brief v5 §10c). This guide says how the recordings are made and how to replace them with a
real voice.

## How it works

1. **The words.** Each "Read it to me" button has an id, made from the page address:
   `/kids/calm-corner/` → `kids-calm-corner`. A button for one block (a story) adds the block:
   `kids-kids-like-me--lerato-panels`. The words it reads are saved in
   `content/audio/en/<id>.txt`. Each "Did you know?" fact has its own (`fact-0` …), and the
   Calm corner has `breathe-in` and `breathe-out`.
2. **The recordings.** `public/audio/en/<id>.mp3`: mono, 48 kbps, about 20–40 KB a sentence.
   A page only links a recording that exists; without one, the browser's own voice reads.
3. **Playing.** The file downloads only when a child presses the button. Pause and Stop
   appear, and Pholo talks while it plays. Nothing ever starts by itself.

## A real voice always wins (the goal)

Record a warm South African voice (a staff member, volunteer or voice actor) on a phone or a
USB microphone in a quiet room. Clean it up in **Audacity** (free): remove noise, trim silence,
export as MP3, mono, 48–64 kbps. Read the words in `content/audio/en/<id>.txt` exactly.

Save each file as `content/audio/recorded/en/<id>.mp3` (the same id), then run the generator
(below). Recorded files are copied as they are and are never replaced by computer voices.

## Until then: open-source computer voices

The recordings are made on a computer at build time, never in the browser, with **Kokoro**
(Apache 2.0 licence; voices `bf_emma` for Pholo and the stories, `af_nicole` for the Calm
corner, set in `content/audio/voices.json`). The Accessibility page says that some read-aloud
audio is computer-generated. Do not use voice models with non-commercial licences (for
example XTTS v2).

### Set up once (Windows)

```
winget install Python.Python.3.12
py -3.12 -m venv .venv-audio
.venv-audio\Scripts\python -m pip install --index-url https://download.pytorch.org/whl/cpu torch
.venv-audio\Scripts\python -m pip install "kokoro>=0.9.4" soundfile lameenc
```

The first run downloads the voice model (about 330 MB) and an English language model.

### When Kids' World words change

```
pnpm build:preview
node scripts/audio-texts.mjs                       # saves the words each button reads
.venv-audio\Scripts\python scripts\generate-audio.py   # makes only the recordings that changed
pnpm build:preview                                 # pages link the new recordings
```

Then commit `content/audio/` and `public/audio/` together. CI runs
`node scripts/audio-texts.mjs --check` and fails if a page's words no longer match its saved
text, so a recording never goes out of date unnoticed.

## Other South African languages (later)

Open-source voices for isiZulu, Sesotho, Afrikaans and others are still weak. Options for the
Foundation: commercial voices with South African English, isiZulu and Afrikaans (for example
Narakeet), Qfrency (South African, all eleven official languages), or voices built from the
open South African speech data on OpenSLR (CC BY-SA). The pipeline is already per language
(`content/audio/<lang>/`, `public/audio/<lang>/`).
