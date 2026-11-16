# SignBridge System Architecture — Deep Technical Specification

This document explains the complete architecture of **SignBridge Offline**, its foundational Rust systems design, exact runtime data flows across all modalities, and the exact mathematical formulas behind frame quality analysis, 3D hand landmark normalization, anatomical classification confidence scores, temporal debouncing, and dual-model routing.

---

## 1. Base Architecture & Design Lineage

SignBridge is founded on a **Dual-Pipeline Systems Accessibility Architecture** originally architected for constrained ARM64 Linux / Android / Windows desktop targets (`signbridge-rust`, documented in `src/data/rustArchitectureData.ts`) and adapted from the geometric pose-normalization concepts of the open-source **`sign-language-translator`** Python library (Apache 2.0):

1. **Base Concept (`sign-language-translator` Adaptation)**:
   - In the Python library (`slt.vision.landmarks`), raw camera landmarks are translated relative to an anchor joint (wrist), scaled by palm distance, and evaluated across temporal windows using NumPy/PyTorch tensors.
   - SignBridge **decouples** landmark extraction from Python/PyTorch GC heaps and standardizes on a fixed-size **63-float vector (`[f32; 63]`)** + **6-float temporal extension vector**, enabling deterministic sub-10 ms classification in both browser WASM (`src/utils/aslClassifier.ts`) and native desktop/Rust runtimes (`desktop_windows/sign_avatar.py`, `src/sign_language.rs`).
2. **Dual-Pipeline Convergence Around a Shared Intermediate Representation (`NormalizedIR`)**:
   - Instead of building $N \times N$ separate pairwise converters between Spoken Languages (16 languages), Braille, Morse, and Sign Language, **every input pipeline feeds into one canonical intermediate state (`NormalizedIR`)**, and **every output renderer consumes that `NormalizedIR`**.
3. **Concrete Implementations in This Repository**:
   - **Web & Server Runtime (`src/` + `server.ts`)**: Real-time interactive React 19 UI using local `@mediapipe/tasks-vision` WASM (`public/mediapipe/`), browser `pdfjs-dist`, Web Audio / Speech APIs, and an Express API proxy (`server.ts`) for optional Gemma 4 / Gemini translation, audio transcription, and dictionary explanation with local offline failover.
   - **Offline Windows Desktop Suite (`desktop_windows/`)**: Native Tkinter GUI + `llama-cpp-python` GGUF inference + Windows SAPI5 (`pyttsx3`) TTS + Vosk/OpenCV/MediaPipe packaged via PyInstaller (`signbridge.spec`) and Inno Setup (`installer.iss`).
   - **Rust + C++ FFI Blueprint (`src/data/rustArchitectureData.ts`)**: Complete reference modules (`braille_morse.rs`, `mediapipe_ffi.rs`, `ffi_bridge.cpp`, `sign_pipeline.rs`, `sign_language.rs`, `gemma_runtime.rs`, `reference_table.rs`, `main.rs`).

---

## 2. High-Level Pipeline Topology & Data Transfer

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                         MODALITY INPUT PIPELINES                             │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ Pipeline A (Keyboard/Voice)  │ Pipeline B (Local Webcam Sign)                │
│ • Plain text (16 languages)  │ • getUserMedia / nokhwa RGB24 (>=15 FPS)      │
│ • 6-Key Perkins Braille      │ • 96x72 RGBA BT.601 luma & YCbCr chroma check │
│ • ITU Morse (Key/Text)       │ • Local MediaPipe HandLandmarker (21x3 pts)   │
│ • Mic Speech / Audio Clip    │ • [f32; 63] Normalization -> Classifier       │
│   -> /api/transcribe         │ • Confidence Gate (>=0.80) + 5-Frame Debounce │
└──────────────┬───────────────┴───────────────────────┬───────────────────────┘
               │                                       │
               ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 SHARED NORMALIZED INTERMEDIATE REPRESENTATION                │
│                               (NormalizedIR)                                 │
│  • sourceModality   : 'text' | 'braille' | 'morse' | 'sign'                  │
│  • detectedLanguage : Auto-detected script/lexicon across 16 languages       │
│  • sourceText       : Plain decoded utterance                                │
│  • canonicalEnglish : English pivot when offline phrasebook translation runs │
│  • signGlosses      : Normalized uppercase token stream [A..Z, SPACE]        │
└──────────────┬───────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               TRANSLATION & ENRICHMENT ROUTER (DUAL ENGINE)                  │
│ 1. Offline Deterministic Engine (instant, 0 network):                        │
│    offlineTranslator.ts / translator_core.py -> OFFLINE_PHRASEBOOK           │
│ 2. Local GGUF Engine (Windows Desktop):                                      │
│    LocalModelManager -> llama-cpp-python (Q4_K_M Gemma 4 / Qwen / Phi-4)     │
│ 3. Optional Server AI Engine (Web Preview / Live API):                       │
│    POST /api/translate -> LRU Cache -> gemini-4-hydrogen ->                  │
│    gemini-3.1-flash-lite failover -> local OFFLINE_PHRASEBOOK JSON fallback  │
└──────────────┬───────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         MULTI-MODAL OUTPUT ENCODERS                          │
│  • Spoken Text + Pronunciation Guide -> Web Speech / Windows SAPI5 TTS       │
│  • Grade-1 Braille -> Unicode (U+2800..U+283F) + ASCII BRF (NFD diacritics)  │
│  • ITU Morse -> Visual (·/−) + 22,050 Hz 16-bit Mono RIFF PCM .wav           │
│  • Sign Output -> 2D Skeletal Fingerspelling Canvas Avatar                   │
│  • Dictionary Helper -> Local .pdf/.txt index + /api/explain-word            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### How Data Transfers Between Components

#### A. Web App Client ↔ Express Server (`server.ts`)
1. **Static Local Assets (0 external fetches at runtime for vision/PDF)**:
   - MediaPipe runtime WASM (`vision_wasm_internal.wasm`, `.js`) and `hand_landmarker.task` are served directly from `public/mediapipe/` (`<origin>/mediapipe/...`).
   - PDF worker `pdf.worker.min.mjs` is served from `public/pdf.worker.min.mjs` so uploaded `.pdf` dictionaries never rely on external CDNs.
2. **Real-Time Translation (`POST /api/translate`)**:
   - **Request**: `{ text, sourceLanguage, targetLanguage, sourceModality, modelName }`.
   - **Server processing**:
     1. Checks an in-memory `translationCache` (`Map<string, payload>`) keyed by `${sourceModality}::${sourceLanguage}::${targetLanguage}::${rawText}` (cache hits return in `~1 ms`).
     2. If `GEMINI_API_KEY` is absent or offline mode is selected, immediately returns HTTP `200` with the local phrasebook result (`engine: "... (Offline Phrasebook)"`).
     3. Calls `@google/genai` using structured JSON output (`responseSchema`: `detectedSourceLanguage`, `normalizedEnglish`, `translatedText`, `phoneticGuide`, `grammarNote`) with `ThinkingLevel.LOW` on `gemini-4-hydrogen`.
     4. If rate-limited (`429` / `RESOURCE_EXHAUSTED`), sets a 5-minute cooldown flag (`hydrogenRateLimitedUntil`) and automatically retries `gemini-3.1-flash-lite` (`ThinkingLevel.MINIMAL`). If upstream fails, degrades cleanly with HTTP `200` fallback JSON instead of crashing the client.
3. **Speech-to-Text (`POST /api/transcribe`)**:
   - Primary browser path uses `SpeechRecognition` / `webkitSpeechRecognition` mapped to the selected `LANGUAGE_BCP47` code (e.g., `ja-JP`, `hi-IN`, `es-ES`).
   - If the browser lacks Web Speech API (or microphone stream capture uses `MediaRecorder` / audio file upload), the client encodes the audio `Blob` to Base64 (`FileReader.readAsDataURL`) and posts `{ audioBase64, mimeType, languageHint }` (`express.json({ limit: '15mb' })`) to `/api/transcribe`, which runs `gemini-3.5-transcribe`.
4. **Dictionary Word Explanation (`POST /api/explain-word`)**:
   - Uploaded `.txt` and `.pdf` dictionaries are parsed client-side (`parseDictionaryText`), indexed in memory + `localStorage` (`DICTIONARY_STORAGE_KEY`), and queried locally first via exact match, morphological stemming (`-ing`, `-ed`, `-es`, `-s`), and substring match.
   - Selecting a word sends `{ word, contextSentence, dictionaryExcerpts, targetLanguage }` to `/api/explain-word`, returning a plain-language definition and example sentence (or local dictionary excerpt if offline/rate-limited).

#### B. Frozen Windows Desktop Executable (`desktop_windows/`)
When PyInstaller compiles `desktop_windows/main.py` into a single-file `SignBridgeOffline.exe`:
- Bundled defaults (`models.json`, docs) extract into PyInstaller's temporary `sys._MEIPASS`.
- External user-dropped GGUF weights and persistent configuration live beside `SignBridgeOffline.exe` (`Path(sys.executable).resolve().parent`).
- `get_app_dir()` and `resolve_runtime_path()` (`desktop_windows/model_manager.py`) always check **executable directory first**, copying default `models.json` alongside the `.exe` on first launch so tier swaps persist across restarts and `models/*.gguf` files are found regardless of Windows working directory.

---

## 3. Hand Tracking & Confidence Score Mathematics (In Complete Detail)

Every frame of local sign-language tracking passes through five deterministic mathematical stages implemented in `src/utils/localHandTracker.ts`, `src/utils/aslClassifier.ts`, `src/components/SignMediaPipeStage.tsx`, and `desktop_windows/sign_avatar.py`.

### Stage 1: Frame Pre-Flight Quality Analysis (`analyzeVideoFrameMetrics`)
At 15 FPS (`setInterval(..., 66)` ms), the webcam `<video>` frame is drawn to an off-screen `96 × 72` analysis canvas and sampled on a stride of `step = 4` pixels (~432 pixels/frame for sub-millisecond CPU cost):
1. **ITU-R BT.601 Luminance**:
   $$\text{Luma}_i = 0.299 R_i + 0.587 G_i + 0.114 B_i$$
   Averaged across sampled pixels into $\overline{\text{Luma}} \in [0, 255]$. If $\overline{\text{Luma}} < \text{lightingMinLuma}$ (default `48`), tracking stops safely with `"Lighting too low"` (`low-light`).
2. **YCbCr Chroma & Foreground Centroid Check**:
   Pixels passing $\text{Luma} > 40$, $C_b \in [77, 127]$, $C_r \in [133, 175]$ contribute to skin/foreground ratio and centroid estimation when evaluating frame readiness.
3. **MediaPipe 3D Landmark Extraction (`HandLandmarker`)**:
   Runs locally in `VIDEO` mode (`minHandDetectionConfidence: 0.55`, `minHandPresenceConfidence: 0.55`, `minTrackingConfidence: 0.50`, `numHands: 1`) with GPU delegate (and automatic CPU fallback). Returns `21` normalized `(x, y, z)` coordinates; if absent, returns `null` without raising errors (`trackingStatus = 'no-hand'`, guidance: `"Move hands into frame"`).
4. **Centroid Stability Gate**:
   Mid-palm centroid is computed from wrist landmark `0` and middle MCP landmark `9`:
   $$c = \frac{1}{2}(p_0 + p_9), \quad \Delta_{\text{motion}} = \|c_t - c_{t-1}\|_2$$
   If $\Delta_{\text{motion}} > 0.045$, the frame is marked `unstable` (`"Hold sign steady"`) and **blocked from committing into `SignBuffer`** until the user holds the sign steady.

---

### Stage 2: Translation- & Scale-Invariant `[f32; 63]` Normalization (`normalizeLandmarksTo63`)
Given $21$ 3D points $p_0, \dots, p_{20}$ where $p_0$ is the wrist:
1. **Origin Translation**:
   $$\tilde{p}_i = p_i - p_0 \quad \forall i \in \{0, \dots, 20\}$$
   (Guarantees $\tilde{p}_0 = (0, 0, 0)$ regardless of where the hand sits in the webcam frame.)
2. **Scale Normalization by Maximum Euclidean Wrist Radius**:
   $$d_{\max} = \max\left(10^{-5},\; \max_{0 \le i \le 20} \|\tilde{p}_i\|_2\right)$$
   $$\hat{p}_i = \frac{\tilde{p}_i}{d_{\max}}$$
3. **Flattening**: Flattens all 21 normalized 3D points into a fixed `[f32; 63]` vector `features63`.

**Sanity Geometry Gate**: Before scoring any letter, `classifyAslLandmarks` checks palm span $\|\hat{p}_9 - \hat{p}_0\|_2 \ge 0.14$ and knuckle span $\|\hat{p}_{17} - \hat{p}_5\|_2 \ge 0.08$. Degenerate/collapsed skeletons immediately return `confidence = 0.15, accepted = false`.

---

### Stage 3: Anatomical Pose Feature Extraction (`extractAnatomicalFeatures`)
To achieve high accuracy across real human hand proportions and left/right handedness, `aslClassifier.ts` extracts **12 scale-normalized anatomical scalars** relative to palm scale $S_{\text{palm}} = \max(\|\hat{p}_0 - \hat{p}_9\|_2,\; \|\hat{p}_5 - \hat{p}_{17}\|_2,\; 0.15)$:

1. **Per-Finger Extension Ratio ($e_{\text{index}}, e_{\text{middle}}, e_{\text{ring}}, e_{\text{pinky}} \in [0, 1]$)**:
   Combines radial reach from wrist to fingertip and segment straightness ($\cos\theta$ between MCP→PIP vector $v_1$ and PIP→TIP vector $v_2$):
   $$\text{reachRatio} = \text{clamp}_{0,1}\!\left(\frac{\|\hat{p}_{\text{tip}}\|_2 / \|\hat{p}_{\text{mcp}}\|_2 - 1.02}{0.92}\right), \quad \text{straightScore} = \text{clamp}_{0,1}\!\left(\frac{\frac{v_1 \cdot v_2}{\|v_1\|_2 \|v_2\|_2} + 0.15}{1.1}\right)$$
   $$e_f = 0.65 \cdot \text{reachRatio} + 0.35 \cdot \text{straightScore}$$
2. **Thumb Abduction (`thumbExt`)**: normalized distance of thumb tip `4` from index MCP `5` and palm center `9`.
3. **Thumb-Across-Palm (`thumbCross`)**: inverse distance from thumb tip `4` to pinky MCP `17` (distinguishes `B`, `E`, `M`, `N`, `S`).
4. **Thumb Pinches (`pinchIndex`, `pinchMiddle`)**: proximity of thumb tip `4` to index tip `8` (`F`, `O`) and middle tip `12` (`D`).
5. **Index–Middle Tip Spread (`spreadIndexMiddle`)**: $\|\hat{p}_8 - \hat{p}_{12}\|_2 / (0.95 \, S_{\text{palm}})$ (separates `U` vs `V`).
6. **Crossed-Finger Indicator (`spreadDirCross`)**: binary flag `1.0` when `index` and `middle` are extended (`> 0.6`) and their tip X-order inverts relative to their MCP X-order (separates `R` from `U`/`V`).
7. **Hand Orientation (`horizRatio`, `downRatio`)**: axis vector from wrist `0` to middle MCP `9` plus index direction `(p8 - p5) * 0.45` (distinguishes horizontal `G`/`H` and downward `P`/`Q` from upright letters).

---

### Stage 4: Exact Confidence Score Calculation (`classifyAslLandmarks`)

For every candidate letter template $k \in \{\text{A} \dots \text{Z}\}$:

1. **Mirror-Invariant 63-Float Euclidean Squared Distance** (handles left vs. right hands identically without separate templates):
   $$\text{sqDist}_{\text{direct}}(k) = \sum_{i=0}^{62} (f_i - t_{k,i})^2$$
   $$\text{sqDist}_{\text{mirror}}(k) = \sum_{i=0}^{62} \big(\text{mirror}_X(f_i) - t_{k,i}\big)^2$$
   $$\text{sqDist}_k = \min\big(\text{sqDist}_{\text{direct}}(k),\; \text{sqDist}_{\text{mirror}}(k)\big)$$
   where $\text{mirror}_X$ negates every $x$-coordinate index ($i \bmod 3 = 0$).

2. **Weighted Anatomical Squared Distance (`anatomicalDistanceSq`)**:
   $$\text{anatDist}_k = 2.4 \sum_{f=0}^{4} (e_f - e_{k,f})^2 + 1.6 \Delta_{\text{pinchI}}^2 + 0.9 \Delta_{\text{pinchM}}^2 + 1.2 \Delta_{\text{thumbX}}^2 + 1.5 \Delta_{\text{spread}}^2 + 1.8 \Delta_{\text{horiz}}^2 + 1.8 \Delta_{\text{down}}^2 + 2.0 \Delta_{\text{cross}}^2$$

3. **Combined Prototype Cost**:
   $$C_k = 0.72 \cdot \text{anatDist}_k + 0.28 \cdot \min(\text{sqDist}_k,\; 6.0)$$
   The winning class is $k^* = \arg\min_k C_k$ with $\text{minAnatDist} = \text{anatDist}_{k^*}$.

4. **Softmax Margin + Distance Penalty → Confidence $\in [0, 1]$**:
   Every class cost is scaled into logits with inverse temperature $\beta = 34.0$:
   $$z_k = -34.0 \cdot C_k, \quad z_{\max} = \max_j z_j$$
   $$P(k^*) = \frac{\exp(z_{k^*} - z_{\max})}{\sum_{j=1}^{26} \exp(z_j - z_{\max})}$$
   To prevent an ambiguous or non-ASL handshape that happens to be equidistantly far from all 26 letters from scoring high just by winning softmax relative margin, we multiply by an **exponential absolute anatomical distance decay**:
   $$\text{distancePenalty} = \exp\big(-0.22 \cdot \text{minAnatDist}\big)$$
   $$\text{confidence} = \text{round}_3\Big(\text{clamp}_{0,1}\big(P(k^*) \cdot \text{distancePenalty}\big)\Big)$$

5. **Confidence Acceptance Gate**:
   - `accepted = (confidence >= threshold)`, default `0.80` (user-tunable `0.70–0.90` in Calibrate).
   - Frames with `< 0.80` are **rejected** so intermediate finger transitions never type garbage characters.

#### Phrase Classifier Variant (`src/utils/signClassifier.ts`)
For the 10-sign vocabulary (`HELLO`, `PLEASE`, `HELP`, `THANK YOU`, `YES`, `NO`, `WATER`, `MORE`, `SORRY`, `GOODBYE`), `classifySignGesture` uses wrist elevation relative to upper-body pose (`nose`, `shoulders`) plus finger extensions in a 6D vector, combining **cosine similarity** and **Gaussian L2 kernel** (`confidence = 0.45 * cosineSimilarity + 0.55 * exp(-1.35 * sqDist)`).

---

### Stage 5: Temporal Debounce & Word Boundary State Machine (`SignBuffer`)
1. If a locked hand frame is accepted (`confidence >= 0.80`):
   - If the predicted letter matches `candidateLetter`, increment `consecutiveCount`; otherwise reset `consecutiveCount = 1`.
   - Once `consecutiveCount >= debounceFrames` (default **5 consecutive frames**, $\approx 330\text{ ms}$ at 15 FPS) **and** `lastCommittedRunLetter !== lower`, commit the character once (`push_letter`) and highlight its row in `ReferenceTablePanel` for `1,000 ms`.
2. If no hand is present (`detection === null`) for `> 500 ms` (`ASL_WORD_BOUNDARY_MS`), `SignBuffer` sets `spaceInsertedAfterLoss = true` and calls `commit_word()`, appending `' '` and emitting `' '` to trigger sentence translation/TTS.

---

## 4. Braille, Morse, Voice, Dictionary & Dual-Model Subsystems

1. **Grade-1 Braille (`brailleDecoder.ts`, `brfAndWav.ts`, `braille_morse.py`)**:
   - Represents every 6-dot cell as a 6-bit integer `mask & 0x3F` (`dot 1 = bit 0` … `dot 6 = bit 5`), mapping directly to Unicode `U+2800 + mask` and the standard 64-entry North American **ASCII BRF** table (`MASK_TO_BRF`).
   - Maintains finite-state prefixes for **Number Sign (`⠼`, dots `3,4,5,6`)** (`a..j` → `1..0`) and **Capital Sign (`⠠`, dot `6`)**, plus NFD Unicode normalization (`normalize('NFD').replace(/[\u0300-\u036f]/g, '')`) so accented characters (`ayúdeme`, `café`) encode cleanly without drops.
2. **ITU Morse (`morseDecoder.ts`, `brfAndWav.ts`)**:
   - PARIS-calibrated duration timing: $\text{dotUnitMs} = \text{round}(1200 / \text{WPM})$, dash threshold $= 2.2\times$, letter flush gap $= 3.5\times$, word boundary $= 7.5\times$.
   - Generates genuine offline **22,050 Hz, 16-bit mono RIFF PCM `.wav`** files synthesized cleanly via $650\text{ Hz}$ sine wave frames (`Math.sin(2π * 650 * i / 22050)`).
3. **Dual Model Manager & Onboarding SLM (`modelPresets.ts`, `onboardingSlm.ts`, `model_manager.py`, `onboarding_slm.py`)**:
   - Strictly decouples **Onboarding SLM** (`slm-fast`, `slm-balanced`, `slm-reasoning`) from **Main Translator** (`lightweight`, `balanced`, `high-quality`, `custom`), computing memory safety against `hostRamGb` before inference and never blocking core conversions or static help fallback if GGUF weights are missing.
4. **Dictionary Helper (`dictionaryParser.ts`, `pdfExtractor.ts`)**:
   - Supports `.txt` (`word: definition`, `word - definition`, `word\tdefinition`) and `.pdf` (extracted locally with `pdfjs-dist` worker, tracking page numbers) with ranked exact/stem/related lookup and optional plain-language rewrites via `/api/explain-word`.
