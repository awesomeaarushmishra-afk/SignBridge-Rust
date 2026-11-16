# Supported Languages, Standards & Offline Limitations

## 1. Spoken Languages (Offline + Auto-Detect)
- English (`en-US`), Spanish (`es-ES`), French (`fr-FR`), German (`de-DE`), Hindi (`hi-IN`), Japanese (`ja-JP`), Arabic (`ar-SA`), Portuguese (`pt-BR`), Mandarin Chinese (`zh-CN`).
- **Auto-Detection**: Script range classification (Devanagari, Hiragana/Katakana, Han, Arabic) + token-level Latin stopword heuristics; refined by the active local LLM when loaded.

## 2. Braille Standard & BRF Export
- **UEB / English Grade-1 uncontracted Braille** (`A–Z`, `0–9` with dots `3-4-5-6` numeric prefix `#`, uppercase dot `6` capital prefix `,`, core punctuation).
- **Outputs**: Unicode Braille Patterns (`U+2800`–`U+283F`) and 64-character North American ASCII **BRF** (`.brf` embosser-ready ASCII export).
- *Limitation*: Grade-2 literary contractions (e.g. `⠿` for "for", `⠮` for "the") are intentionally omitted so every typed letter maps 1:1 round-trip without ambiguity.

## 3. International Morse Code (ITU-R M.1677-1)
- Supports `A–Z`, `0–9`, `.`, `,`, `?`, `!`, standard intra-word space (` `) and `/` word separators.
- Exports standard **16-bit PCM Mono 22.05 kHz `.wav`** audio generated directly in memory with zero external audio codecs.

## 4. Local Hand Tracking, Calibration, Privacy & Sign Limitations
- **On-Device Privacy**: All webcam frame sampling, ambient luma checks, and 21-point `[f32; 63]` hand landmark extraction run **100% locally and offline**—no video frames or landmark vectors ever leave the device.
- **Pre-Tracking Calibration & Status Prompts**: Includes camera mirror toggle, hand-size scale factor, ambient lighting luma threshold, confidence gate (`>= 0.80`), and consecutive-frame debounce controls, with live accessibility guidance (`"Move hands into frame"`, `"Lighting too low"`, `"Hold sign steady"`, `"Hand tracked cleanly"`).
- **Supported Input Vocabulary & Editable Buffer**: Static ASL A–Z fingerspelling (`>= 0.80` confidence gate, 5-frame debounce, 500 ms word-boundary pause) + 10 core conversational gestures. Users can inspect and edit recognized characters directly in the transcript buffer before converting to speech, Braille, Morse, or translated text.
- **Output (Text/Speech/Braille/Morse → Sign)**: Renders an **offline 2D skeletal hand avatar** stepping through ASL fingerspelling + gloss tokens (`A–Z`, `SPACE`).
- *Explicit Offline Limitation*: Full continuous 3D co-articulated sign-language synthesis (facial non-manual markers, spatial verb inflection, and two-handed NMMs) across all national sign languages (ASL, BSL, ISL, PSL) is **not** generated offline on low-RAM CPUs. Rather than silently faking full grammar video, SignBridge renders exact ASL fingerspelling keyframes alongside a gloss token sequence and documents this fallback clearly in the UI.
