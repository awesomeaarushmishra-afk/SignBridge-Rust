# SignBridge Offline — Multi-Modal Accessibility Translator

**Track:** Languages
**Team:** Aarush Mishra

## The problem

Deaf and hard-of-hearing people routinely face situations where no interpreter is available — a rural clinic, a government office, a train station — and existing accessibility tools each handle only one channel. A sign-language app doesn't produce Braille. A Braille tool can't read a sign. A Morse tool can't speak. A Deaf user ends up juggling four disconnected apps, several of which need internet. SignBridge gives one offline tool that translates between all four, so a single conversation can move between speech, text, Braille, Morse, and sign without switching apps or going online.

## What we added

**Our own idea.** We did not follow a suggested project. SignBridge is built around a shared `NormalizedIR` pivot — 16 spoken languages, Grade-1 Braille (Unicode + ASCII BRF), ITU Morse (visual + PCM WAV), and ASL fingerspelling all convert through one intermediate representation, giving 16 modal directions instead of pairwise converters. On top of that we built: mirror-invariant `[f32; 63]` landmark normalization (left and right hands score identically), a softmax + absolute-distance confidence gate at 0.80, a 5-frame debounce with automatic word boundaries, pre-flight RAM validation and tiered model routing for 8 GB laptops, and deterministic sub-millisecond Braille/Morse codecs that never hallucinate dot patterns. Evaluated on 26 self-collected inputs: 17/26 for the standalone baseline, 26/26 for the integrated system.

**SignBridge Offline** is a bidirectional, offline-first accessibility translator uniting **Spoken Languages (16 languages)**, **Grade-1 Braille (Unicode + ASCII `.brf`)**, **ITU Morse Code (Visual + 22.05 kHz PCM `.wav`)**, and **ASL Sign Language (21-landmark local MediaPipe hand tracking + 2D skeletal fingerspelling avatar)** through a single **Normalized Intermediate Representation (`NormalizedIR`)**.

The repository includes:
1. **Interactive Web & Server Workbench** (React 19 + Vite + Express + local WASM MediaPipe HandLandmarker + Google Gemini/Gemma server adapter + PDF/TXT dictionary helper).
2. **Offline Windows Desktop Suite (`desktop_windows/`)** (Tkinter + `llama-cpp-python` + Windows SAPI5 TTS + Vosk/OpenCV/MediaPipe packaged via PyInstaller & Inno Setup into `SignBridgeOffline.exe` / `SignBridgeOfflineSetup-x64.exe`).
3. **Rust + C++ FFI Systems Architecture Reference** (`src/data/rustArchitectureData.ts` & interactive explorer tabs).

See [SOURCES.md](SOURCES.md) for all models, libraries and AI tools used.

---

## Documentation Index
- **[Architecture.md](Architecture.md)** — Complete deep-dive into the base Rust/SLT architecture, bidirectional `NormalizedIR` data flows, exact confidence-score equations, debouncing state machines, and dual-model routing.
- **[Baseline.md](Baseline.md)** — Detailed comparison against standalone baselines (Gemma 4 E4B, Microsoft Phi-4-mini 3.8B, and the `sign-language-translator` Python plugin) covering latency, RAM efficiency, confidence gating, and self-collected evaluation results.
- **[Requirements.md](Requirements.md)** — Hardware, RAM, disk, CPU/NPU, camera, and OS requirements for every model tier (from 4 GB SBCs and 8 GB laptops up to 16–32 GB workstations).
- **[SOURCES.md](SOURCES.md)** — Exact citations, links, and licenses for every model, crate, Python/npm package, API, and evaluation input used.

---

## Code Navigation Map

```text
.
├── README.md                              # Project entry point, navigation & .exe packaging guide
├── Architecture.md                        # System architecture, data flows & confidence math
├── Baseline.md                            # Baseline vs SignBridge comparison & evaluation
├── Requirements.md                        # Hardware specs across AI model tiers
├── SOURCES.md                             # All models, crates, libraries, APIs & test credits
│
├── index.html                             # Web entry point & SEO metadata
├── server.ts                              # Express server: Vite dev middleware + /api/translate, /api/transcribe, /api/explain-word
├── package.json                           # Node/React/Vite/MediaPipe/PDF.js dependencies
├── metadata.json                          # App permissions (camera, microphone) & metadata
├── .env.example                           # Environment variable template (GEMINI_API_KEY, PORT)
│
├── public/
│   ├── mediapipe/
│   │   ├── hand_landmarker.task           # Local bundled MediaPipe 21-point HandLandmarker model
│   │   └── wasm/                          # Local MediaPipe Vision WASM runtime binaries
│   └── pdf.worker.min.mjs                 # Local PDF.js worker for offline .pdf dictionary parsing
│
├── src/
│   ├── App.tsx                            # Main workbench UI, shortcuts (Alt+1..4), TTS, voice input, tabs
│   ├── components/
│   │   ├── SignMediaPipeStage.tsx         # Live 15 FPS webcam -> MediaPipe -> 63-float classifier -> SignBuffer
│   │   ├── SignOutputAvatar.tsx           # 2D skeletal ASL fingerspelling avatar & playback controls
│   │   ├── BraillePad.tsx                 # 6-key Perkins Braille chord & Unicode/BRF pad
│   │   ├── MorseKeyer.tsx                 # Straight/paddle Morse keyer with PARIS timing & WebAudio tone
│   │   ├── ReferenceTablePanel.tsx        # Collapsible A–Z Braille & Morse lookup table
│   │   ├── DictionaryHelperPanel.tsx      # .pdf/.txt dictionary uploader & plain-language word explainer
│   │   ├── OnboardingAssistantPanel.tsx   # Built-in SLM onboarding & navigation assistant drawer
│   │   ├── ModelManagerView.tsx           # Dual UI switcher (Onboarding SLM + Main Translator + RAM checks)
│   │   ├── DesktopPackageView.tsx         # Windows offline .exe packaging overview & guide
│   │   ├── ArchitectureDiagram.tsx        # Interactive Rust dual-pipeline architecture inspector
│   │   ├── RustCodeExplorer.tsx           # Source viewer for Rust Cargo.toml & .rs/.cpp modules
│   │   ├── SltMigrationPlan.tsx           # sign-language-translator Python -> Rust migration stages
│   │   └── BenchmarksView.tsx             # Gemma 4 E4B quantization & latency budgets across hardware
│   ├── utils/
│   │   ├── aslClassifier.ts               # [f32; 63] normalization, anatomical matching, confidence gate, SignBuffer
│   │   ├── signClassifier.ts              # 10-sign phrase cosine + L2 classifier & palm-scale normalization
│   │   ├── localHandTracker.ts            # YCbCr/luma hand presence, lighting check & stability metrics
│   │   ├── offlineTranslator.ts           # NormalizedIR bidirectional router & 16-language offline engine
│   │   ├── brailleDecoder.ts              # 6-dot Braille bitmask FSM & Unicode/text codecs
│   │   ├── brfAndWav.ts                   # ASCII BRF codec & 16-bit 22.05 kHz RIFF Morse WAV generator
│   │   ├── morseDecoder.ts                # ITU Morse table & PARIS timing classifier
│   │   ├── dictionaryParser.ts            # .txt / .pdf dictionary parser, stemmer & word lookup
│   │   ├── pdfExtractor.ts                # Client-side PDF text extraction via pdfjs-dist
│   │   ├── modelPresets.ts                # Dual SLM & translator preset definitions & RAM validation
│   │   ├── onboardingSlm.ts               # Context-aware offline SLM assistant + static fallback
│   │   └── *.test.ts                      # 18 deterministic Node/TS unit tests
│   └── data/
│       └── rustArchitectureData.ts        # Rust Cargo.toml, .rs/.cpp reference sources & benchmark tables
│
├── desktop_windows/                       # Offline Windows Desktop App (.exe target)
│   ├── main.py                            # Tkinter keyboard-first GUI, SAPI5 TTS, frozen path bootstrap
│   ├── model_manager.py                   # GGUF model loader (llama-cpp-python), RAM checks & 16-lang fallback
│   ├── onboarding_slm.py                  # Built-in offline SLM assistant + non-blocking fallback
│   ├── translator_core.py                 # NormalizedIR bidirectional routing & 16-language auto-detect
│   ├── braille_morse.py                   # Grade-1 Braille Unicode/BRF & ITU Morse/WAV generator
│   ├── sign_avatar.py                     # 63-float normalization, lighting status, SignBuffer & avatar tokens
│   ├── models.json                        # Active SLM + Translator tiers & local GGUF paths
│   ├── models/
│   │   └── README.txt                     # Instructions for placing local .gguf weights
│   ├── requirements.txt                   # Windows Python dependencies
│   ├── signbridge.spec                    # PyInstaller one-file executable spec (collects llama_cpp/mediapipe/vosk)
│   ├── installer.iss                      # Inno Setup 6 Windows installer script (bundles exe + models/)
│   ├── build_windows.ps1                  # One-command Windows venv, tests, PyInstaller & Inno Setup build
│   └── tests/test_acceptance.py           # 8 Python offline unit & frozen-path tests
│
└── .github/workflows/
    └── build-windows-exe.yml              # CI workflow: runs web + Python tests and builds Windows .exe artifact
```

---

## Quick Start: Download & Run the Web Workbench

### 1. Download the Repository
```bash
git clone <YOUR_GITHUB_REPO_URL> SignBridge
cd SignBridge
```
*(Or download the project ZIP from Google AI Studio / GitHub and extract it.)*

### 2. Run the Web App Locally
Requires **Node.js 20/22+** (`npm install` runs without requiring a separate Python install):
```bash
npm install
cp .env.example .env
# Optional: edit .env and add GEMINI_API_KEY=... for server-side Gemma 4 / Gemini translation & transcription.
# Leave blank to run purely via the deterministic offline fallback.
npm run dev
```
Open **http://localhost:3000** in Chrome/Edge.

---

## How to Add the 2 Local AI Models & Build the Windows `.exe`

Because quantized `.gguf` weights are large (0.4 GB–2.8 GB), `.gitignore` excludes `*.gguf` so Git pushes stay fast. You add the two models directly into `desktop_windows/models/` (before building locally) or next to the downloaded CI `.exe`.

### Step 1: Choose & Place Your 2 GGUF Models in `desktop_windows/models/`

For an **8 GB RAM Windows laptop** (recommended default):
1. **Onboarding & Navigation SLM (`slm-fast`)**:
   - File: `desktop_windows/models/qwen2.5-0.5b-instruct-q4_k_m.gguf` (~0.42 GB)
2. **Main Translation Model (`lightweight` for snappy 8 GB, or `balanced` for higher nuance)**:
   - Lightweight (recommended on 8 GB): `desktop_windows/models/gemma-4-e2b-q4_k_m.gguf` (~1.45 GB)
   - Balanced (tighter on 8 GB, ideal on 12–16 GB): `desktop_windows/models/gemma-4-e4b-q4_k_m.gguf` (~2.78 GB)
   - Optional Reasoning (fits 8 GB): `microsoft/Phi-4-mini-instruct` Q4_K_M GGUF (~2.3 GB) via `"customModelPath"` in `desktop_windows/models.json`. A full 14B-class Phi-4 (~8.4 GB) requires `>= 12–16 GB` RAM.

Update `desktop_windows/models.json` to match your chosen presets (for 8 GB laptops, set `"activeAssistantTierId": "slm-fast"` and `"activeTierId": "lightweight"` or `"balanced"`).

### Step 2: Build the `.exe` (Pick Option A or Option B)

#### Option A — Build Locally on Windows 10/11 (Portable `.exe` + Setup Installer `.exe`)
Prerequisites: **Python 3.11 or 3.12 (x64)** with *Add to PATH* & *tcl/tk* checked, plus optional **Inno Setup 6** (`ISCC.exe`).
```powershell
cd desktop_windows
powershell -ExecutionPolicy Bypass -File .\build_windows.ps1
```
This script:
1. Creates `.venv` and installs `requirements.txt` (preferring prebuilt CPU wheels for `llama-cpp-python` so no Visual Studio C++ compiler is needed).
2. Runs the Python acceptance test suite (`tests/test_acceptance.py`).
3. Builds **`desktop_windows/dist/SignBridgeOffline.exe`** via `signbridge.spec`.
4. Assembles **`desktop_windows/dist/portable/`** (containing `SignBridgeOffline.exe`, `models.json`, `models/`, and docs).
5. Compiles **`desktop_windows/dist/SignBridgeOfflineSetup-x64.exe`** via `installer.iss` (if Inno Setup 6 is installed), automatically bundling your `.gguf` files inside the installer.

#### Option B — Automated Build via GitHub Actions (No Local Python Needed)
1. Push this repository to GitHub on `main` or `master` (or trigger **Actions → Build SignBridge Offline Windows EXE → Run workflow**).
2. Download the **`SignBridgeOffline-Windows-x64`** artifact ZIP once the workflow finishes.
3. Extract the ZIP to a folder (e.g., `C:\SignBridgePortable\`) and drop your two `.gguf` model files into `C:\SignBridgePortable\models\`.
4. Launch `SignBridgeOffline.exe` with Wi-Fi turned off.

---

## Running Verification Tests

```bash
# 1. TypeScript typecheck & production Vite bundle
npm run lint
npm run build

# 2. TypeScript core pipeline, ASL classifier, Morse/Braille & dictionary unit tests (18 tests)
npx --yes tsx --test src/utils/*.test.ts

# 3. Windows desktop offline acceptance & frozen path resolution tests (8 tests)
python3 -m unittest discover -s desktop_windows/tests -v
```

---

## Known Failure Modes (and how the system handles them)

We tested on 26 self-collected on-the-spot inputs. SignBridge passed 26/26 automated verification checks, but live signing exposed real failure modes. We report them here rather than hiding them, because a prototype that fails loudly is safer than one that guesses silently.

### 1. Closed-fist letters (E, N, M, S) are the hardest case

**What happens:** E is sometimes rejected (confidence < 0.80) or swaps with N. M, N and S occasionally interchange under dim light.

**Why:** A, E, M, N, S and T are the *same macro-shape* — a closed fist. What separates them is **thumb position** and **how far the fingers curl**, a difference of a few millimetres in landmark space. The thumb is **self-occluded** (tucked *behind* the curled fingers), so MediaPipe — which estimates 21 landmarks from a single RGB frame — has to *infer* it rather than see it. Depth (`z`) is a monocular estimate, not a measurement, and it degrades exactly when fingers curl toward the palm, because that motion is along the camera axis. Small landmark noise then flips the winning template, and low light (`meanLuma < 48`) compounds it by blurring the thumb/finger boundary.

**What SignBridge does instead:** Rejects the frame rather than typing the wrong letter. The `exp(-0.22 × minAnatDist)` penalty pushes ambiguous handshapes below the 0.80 gate, the motion gate blocks frames with `Δmotion > 0.045` ("Hold sign steady"), and the low-light gate stops tracking below `meanLuma` 48 ("Lighting too low"). The text box stays directly editable by keyboard.

**Next step:** Temporal smoothing — a rolling window or majority vote across 5–8 frames — so a single glitched frame cannot pull down an otherwise correct sign.

### 2. Frame-level landmark glitches on correct signs

**What happens:** A correct sign is sometimes rejected mid-gesture.

**Why:** Per-frame hand landmark detection degrades when the hand briefly leaves frame, moves fast (motion blur), fingers occlude each other, or lighting changes suddenly. A single low-confidence frame can pull down the aggregate score.

**What SignBridge does instead:** The 5-frame `SignBuffer` debounce (~330 ms at 15 FPS) means one bad frame cannot commit a letter; it must be sustained.

**Next step:** Same temporal smoothing fix, plus a "hold steady" countdown in the UI.

### 3. Transitional frames between closed-fist letters

**What happens:** Moving from one closed-fist letter to another passes through shapes matching *neither* template.

**Why:** Fingerspelling transitions are not discrete; the intermediate pose is genuinely ambiguous.

**What SignBridge does instead:** No letter is emitted until 5 consecutive stable frames agree, and word boundaries require >500 ms of hand absence — so transitions never type garbage.

### Known non-failures

Left-handed signing is **not** a failure mode: the classifier computes both direct and X-mirrored distances across all 26 templates, so left and right hands score symmetrically.

See [Baseline.md](Baseline.md) for the full baseline comparison (17/26 standalone vs 26/26 integrated) and measurement methodology.
