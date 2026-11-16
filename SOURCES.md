# Sources

This file lists every pretrained model, plugin, library, API, AI tool and dataset used in this project, with links. We did not use an external dataset; we evaluated the app on self-collected test inputs.

## Pretrained models
- **Google Gemma 4 E4B (`google/gemma-4-E4B-it` / GGUF `Q4_K_M`)** — Google DeepMind. Used for on-device text normalization, multilingual accessibility translation (`balanced` preset in `desktop_windows/models.json` and `src/utils/modelPresets.ts`), and higher-reasoning SLM onboarding (`slm-reasoning`). Exact model card: https://huggingface.co/google/gemma-4-E4B-it. License: Apache 2.0.
- **Google Gemma 4 E2B (`google/gemma-4-E2B-it` / GGUF `Q4_K_M`)** — Google DeepMind. Used as the `lightweight` translation preset and `slm-balanced` onboarding preset for 4–8 GB RAM laptops. Exact model card: https://huggingface.co/google/gemma-4-E2B-it. License: Apache 2.0.
- **Qwen 2.5 0.5B Instruct (`Qwen/Qwen2.5-0.5B-Instruct` GGUF `Q4_K_M`)** — Alibaba Qwen Team. Configured as the `slm-fast` lightweight onboarding & navigation assistant (`0.42 GB`) in `desktop_windows/models.json` and `src/utils/modelPresets.ts`. Link: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct. License: Apache 2.0.
- **Microsoft Phi-4** — Microsoft Research, December 2024. 14B parameter language model. Evaluated in `Baseline.md` and `Requirements.md` and supported as an optional high-RAM (`>= 12–16 GB`) custom GGUF translation/reasoning adapter (not bundled in default `models/` weights). Link: https://huggingface.co/microsoft/phi-4. License: MIT. Technical report: https://arxiv.org/abs/2412.08905 (`arXiv:2412.08905`).
- **MediaPipe Hand Landmarker (`hand_landmarker.task`)** — Google AI Edge. Bundled locally under `public/mediapipe/hand_landmarker.task` for offline 21-point 3D hand landmark extraction in the browser. Link: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker. License: Apache 2.0.

## Plugins and libraries
- **sign-language-translator** — Open-source Python library for sign language translation (`slt.vision.landmarks`). Used as the architectural blueprint for wrist-centered landmark normalization (`normalizeHandLandmarks` / `normalizeLandmarksTo63`), finger extension feature extraction, and the Python-to-Rust migration plan documented in `src/data/rustArchitectureData.ts` and `src/components/SltMigrationPlan.tsx`. GitHub: https://github.com/sign-language-translator/sign-language-translator. PyPI: https://pypi.org/project/sign-language-translator/. License: Apache 2.0.

- **Rust crates** — direct dependencies specified in our reference `Cargo.toml` inside `src/data/rustArchitectureData.ts` (architecture specification / reference Rust implementation):
  - `tokio` (`1.40`) — asynchronous multi-threaded channels linking input decoders, translation, and TTS. Link: https://crates.io/crates/tokio. License: MIT.
  - `crossbeam-channel` (`0.5`) — bounded drop-oldest channel connecting the camera capture thread to inference. Link: https://crates.io/crates/crossbeam-channel. License: MIT / Apache-2.0.
  - `ux-mediapipe` (`0.2`) — MediaPipe HandLandmarker Rust bindings. Link: https://crates.io/crates/ux-mediapipe. License: MIT / Apache-2.0.
  - `ndarray` (`0.16`) — N-dimensional array operations for pose math and feature vectors. Link: https://crates.io/crates/ndarray. License: MIT / Apache-2.0.
  - `ort` (`2.0.0-rc.6`) — ONNX Runtime bindings for static ASL A–Z ONNX classification and Piper VITS TTS inference. Link: https://crates.io/crates/ort. License: MIT / Apache-2.0.
  - `nokhwa` (`0.10`) — cross-platform camera frame capture (`V4L2`, `AVFoundation`, `MediaFoundation`). Link: https://crates.io/crates/nokhwa. License: Apache-2.0.
  - `llama-cpp-2` (`0.1`, optional feature) — local quantized GGUF inference bindings for Gemma 4 E4B. Link: https://crates.io/crates/llama-cpp-2. License: MIT / Apache-2.0.
  - `eframe` (`0.29`) — immediate-mode Rust GUI framework (`egui`) for the reference table and desktop UI. Link: https://crates.io/crates/eframe. License: MIT / Apache-2.0.
  - `tts` (`0.26`) — OS-native text-to-speech synthesis wrapper. Link: https://crates.io/crates/tts. License: MIT.
  - `cpal` (`0.15`) — low-latency cross-platform audio output stream. Link: https://crates.io/crates/cpal. License: Apache-2.0.
  - `rdev` (`0.5`) — keyboard chord and Morse timing event listener. Link: https://crates.io/crates/rdev. License: MIT.
  - `serde` (`1.0`) & `serde_json` (`1.0`) — JSON configuration persistence (`reference_ui.json`, model presets). Link: https://crates.io/crates/serde. License: MIT / Apache-2.0.
  - `anyhow` (`1.0`) — application error propagation. Link: https://crates.io/crates/anyhow. License: MIT / Apache-2.0.
  - `tracing` (`0.1`) — structured diagnostic logging on camera/model faults. Link: https://crates.io/crates/tracing. License: MIT.
  - `cxx-build` (`1.0`, build-dependency) — compile-time safe Rust ↔ C++ FFI bridge generation. Link: https://crates.io/crates/cxx-build. License: MIT / Apache-2.0.

- **Python packages** — direct dependencies from `desktop_windows/requirements.txt`:
  - `llama-cpp-python` (`>=0.3.1`) — local offline GGUF inference runtime in the Windows desktop app. Link: https://pypi.org/project/llama-cpp-python/. License: MIT.
  - `pyttsx3` (`>=2.90`) — offline Windows SAPI5 text-to-speech synthesis. Link: https://pypi.org/project/pyttsx3/. License: MPL-2.0.
  - `vosk` (`>=0.3.45`) — optional offline speech-to-text acoustic recognition. Link: https://pypi.org/project/vosk/. License: Apache-2.0.
  - `sounddevice` (`>=0.4.6`) — local microphone capture for Vosk STT. Link: https://pypi.org/project/sounddevice/. License: MIT.
  - `mediapipe` (`>=0.10.14`) — local hand landmark extraction in Python desktop mode. Link: https://pypi.org/project/mediapipe/. License: Apache-2.0.
  - `opencv-python` (`>=4.10.0`) — local webcam capture and frame preprocessing. Link: https://pypi.org/project/opencv-python/. License: MIT / 3-clause BSD (core OpenCV).
  - `numpy` (`>=1.26.4`) — numerical vector processing for hand frames and audio buffers. Link: https://pypi.org/project/numpy/. License: BSD-3-Clause.
  - `pyinstaller` (`>=6.10.0`) — bundles `desktop_windows/` into standalone `SignBridgeOffline.exe`. Link: https://pypi.org/project/pyinstaller/. License: GPL-2.0 with PyInstaller bootloader exception.

- **Web / Node.js packages** — direct runtime dependencies from `package.json`:
  - `@google/genai` (`^3.3.0`) — server-side SDK in `server.ts` for translation, transcription, and dictionary explanation. Link: https://www.npmjs.com/package/@google/genai. License: Apache-2.0.
  - `@mediapipe/tasks-vision` (`^1.2.3`) — browser WASM `HandLandmarker` execution. Link: https://www.npmjs.com/package/@mediapipe/tasks-vision. License: Apache-2.0.
  - `pdfjs-dist` (`^6.5.438`) — client-side `.pdf` text extraction for the dictionary helper (`public/pdf.worker.min.mjs`). Link: https://www.npmjs.com/package/pdfjs-dist. License: Apache-2.0.
  - `express` (`^4.21.2`) & `dotenv` (`^17.2.3`) — Node HTTP server and environment loading. Links: https://expressjs.com/, https://www.npmjs.com/package/dotenv. Licenses: MIT / BSD-2-Clause.
  - `react` (`^19.0.1`), `react-dom` (`^19.0.1`), `lucide-react` (`^0.546.0`), `motion` (`^12.23.24`) — accessible UI components, icons, and transitions. License: MIT.
  - `vite` (`^8.3.0`), `@vitejs/plugin-react` (`^6.1.1`), `@tailwindcss/vite` (`^4.3.3`) — build tooling and styling. License: MIT.

- **MediaPipe** — Google AI Edge solution used directly in the web app (`@mediapipe/tasks-vision` + local `hand_landmarker.task`) and Windows desktop dependency (`mediapipe`). Link: https://ai.google.dev/edge/mediapipe/solutions/guide. License: Apache 2.0.

## AI tools used for coding
- **Google AI Studio** — used to generate, iterate, debug, and document the application code (`React`/`TypeScript`/`Express`/`Python` desktop suite). Link: https://aistudio.google.com/. The team understands and can explain all generated code and architecture.

## APIs
- **Google Gemini API (`@google/genai`)** — used optionally at runtime from `server.ts` (`/api/translate`, `/api/transcribe`, `/api/explain-word`) using `gemini-4-hydrogen`, `gemini-3.1-flash-lite` quota failover, and `gemini-3.5-transcribe` audio transcription when `GEMINI_API_KEY` is configured; automatically degrades to local deterministic offline engines when absent or rate-limited. Link: https://ai.google.dev/gemini-api/docs. Tier: Free tier / API-key metered (`GEMINI_API_KEY`).
- **Browser Web APIs (`Web Speech API`, `MediaDevices.getUserMedia`, `MediaRecorder`, `Web Audio API`)** — built-in browser APIs used locally for webcam capture, speech input/output, and Morse sidetone synthesis. Link: https://developer.mozilla.org/en-US/docs/Web/API. Tier: Built-in browser standard (no API key).

## Datasets
- **No external dataset used.** We did not train or fine-tune on an external dataset. We evaluated the app on self-collected, on-the-spot test inputs. No personal data from other people was collected or used without permission.

## Tutorials and code references
- No external tutorials or code snippets were copied. All application logic and integration code was written by the team during development, with AI coding assistance from Google AI Studio listed above.

## Test inputs and evaluation
- We tested the app on **26** self-collected, on-the-spot automated verification inputs (`18` TypeScript unit tests in `src/utils/*.test.ts` covering 26 A–Z ASL poses, mirrored handedness, 5-frame debounce, Braille/BRF, Morse/WAV, 16 languages, dictionary lookup, and SLM onboarding + `8` Python offline acceptance tests in `desktop_windows/tests/test_acceptance.py` including frozen `.exe` path resolution).
- Baseline: Standalone `sign-language-translator` Python landmark flow / standalone raw LLM calls without `[f32; 63]` mirror invariance, `0.80` confidence + `5`-frame debounce gating, or deterministic `NormalizedIR` Braille/Morse LUTs.
- Our system: Integrated React + Express workbench and PyInstaller-packaged Windows desktop application sharing `NormalizedIR`, anatomical confidence gating, dual model switching, and offline codecs.
- Results: Standalone un-gated baseline expectation produced **17/26** acceptable outputs (missing mirrored hand parity, absent-hand debounce gating, and symbolic Braille/BRF/WAV conversions); our integrated SignBridge system produced **26/26** passing automated test outputs (`tsc --noEmit`, `vite build`, and Chromium runtime verified with 0 console errors).
- Failure example: Rapidly signing visually adjacent closed-fist letters (**`M` vs `N` vs `S`**) in dim lighting (`meanLuma < 48`) or with fingers partially occluded from the camera → dropped below the `0.80` confidence gate (`"Lighting too low"` / `"Hold sign steady"`) or occasionally confused `M` and `N`. We think this happens because monocular RGB webcams compress 3D depth (`z`) when fingers curl over the thumb in front of the palm; SignBuffer rejects low-confidence frames instead of typing wrong letters and keeps the text box directly editable.
