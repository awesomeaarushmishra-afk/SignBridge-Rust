# Hardware & Software Requirements (`Requirements.md`)

This document specifies the exact hardware, memory (RAM), storage, CPU/NPU, camera, audio, and software requirements needed to run **SignBridge Offline** across every supported local AI model tier — from lightweight 4 GB edge devices and **8 GB RAM laptops** up to 16–32 GB workstations running large reasoning models such as full **Microsoft Phi-4 (14B)** or **Gemma 4 12B**. The default supported reasoning tier is **Microsoft Phi-4-mini (3.8B)**, which fits comfortably on 8 GB.

---

## 1. Per-Model Hardware Requirements Matrix

### A. Onboarding & Navigation SLM Tiers (`desktop_windows/models.json` & `src/utils/modelPresets.ts`)

| Tier ID | Model Name | Quantization | Disk Size | Min RAM | Recommended RAM | Est. CPU Speed | Best Hardware Fit |
|---|---|---|---:|---:|---:|---|---|
| **`slm-fast`** *(Default)* | **Qwen 2.5 0.5B Instruct** | `Q4_K_M` (GGUF) | **0.42 GB** | **2 GB** | **4 GB** | ~115 tok/s | All PCs including 4 GB & **8 GB laptops** |
| **`slm-balanced`** | **Gemma 4 E2B Instruct** | `Q4_K_M` (GGUF) | **1.45 GB** | **4 GB** | **8 GB** | ~48 tok/s | 8–12 GB laptops when translator runs `lightweight` |
| **`slm-reasoning`** | **Gemma 4 E4B Instruct** | `Q4_K_M` (GGUF) | **2.78 GB** | **6 GB** | **12 GB** | ~22 tok/s | 12–16 GB+ desktops needing deep diagnostics |

### B. Main Translation & Sign Reasoning Tiers

| Tier ID | Model Name | Quantization | Disk Size | Min RAM | Recommended RAM | Context (`n_ctx`) | Est. Speed | Notes / Hardware Warning Trigger |
|---|---|---|---:|---:|---:|---:|---|---|
| **Deterministic / No-LLM** | Phrasebook + Braille/Morse LUT + MediaPipe WASM | — | **< 25 MB** | **2 GB** | **4 GB** | — | `< 2 ms` | Works immediately on any PC even with zero `.gguf` files |
| **`lightweight`** *(Best for 8 GB)* | **Gemma 4 E2B Instruct** | `Q4_K_M` (GGUF) | **1.45 GB** | **4 GB** | **4–8 GB** | `512` | ~48 tok/s CPU | Best balance when running simultaneously with webcam MediaPipe |
| **`balanced`** *(Default)* | **Gemma 4 E4B Instruct** | `Q4_K_M` (GGUF) | **2.78 GB** | **6 GB** | **8 GB** | `1024` | ~24 tok/s CPU / `145 ms` TTFT NPU | Close extra browser tabs if pairing with `slm-balanced` on 8 GB RAM |
| **`high-quality`** | **Gemma 4 12B / Qwen 2.5 7B** | `Q4_K_M` (GGUF) | **4.7–6.4 GB** | **10 GB** | **16 GB** | `2048` | ~8–12 tok/s CPU | Triggers RAM warning below 10 GB host RAM |
| **`custom` (Phi-4-mini 3.8B)** *(Default custom)* | **Microsoft Phi-4-mini (3.8B)** | `Q4_K_M` (GGUF) | **~2.3 GB** | **4 GB** | **8 GB** | `2048–4096` | ~20–30 tok/s CPU | Fits 8 GB laptops; stronger reasoning than Gemma 4 E2B without leaving the low-RAM budget |
| **`custom` (Phi-4 14B)** *(High-RAM only)* | **Microsoft Phi-4 (14B)** | `Q4_K_M` (GGUF) | **~8.4 GB** *(28 GB FP16)* | **12 GB** | **16–32 GB** *(or 10+ GB VRAM GPU)* | `2048–4096` | ~5–10 tok/s CPU / ~45+ tok/s GPU | Exceeds 8 GB laptops; use dedicated GPU (`n_gpu_layers > 0`) or `>=16 GB` RAM |

### C. Vision, Speech & Audio Auxiliary Modules

| Module | File / Runtime | Disk Size | RAM Overhead | Hardware Notes |
|---|---|---:|---:|---|
| **MediaPipe HandLandmarker** | `public/mediapipe/hand_landmarker.task` + WASM / `mediapipe` | ~12 MB | ~42–90 MB | Runs at **>=15 FPS** on dual-core AVX2 x86_64 or ARM64; WebGL GPU delegate optional |
| **Offline Speech-to-Text** | `vosk-model-small-en-us-0.15` *(optional)* | ~40 MB | ~120 MB | Standard 16 kHz microphone input |
| **Offline Text-to-Speech** | Windows SAPI5 (`pyttsx3`) / Browser `speechSynthesis` / Piper VITS ONNX | ~0–65 MB | ~20–68 MB | Built into Windows 10/11 (0 extra download needed on desktop) |

---

## 2. Gemma 4 E4B Quantization Hardware Targets (`src/data/rustArchitectureData.ts`)

| Hardware Target | CPU / Accelerator | RAM Ceiling | Recommended Quant | Disk Size | Peak RAM | TTFT | Decode Speed |
|---|---|---:|---|---:|---:|---:|---:|
| **Embedded Edge Kiosk / Low-RAM PC** | Intel N100 / Cortex-A55 | 4 GB Strict | `IQ4_XS + Q8_0 KV` | 2.52 GB | 2.84 GB | 245 ms | 16.2 tok/s |
| **Embedded Linux SBC** | Raspberry Pi 5 (4× Cortex-A76 @ 2.4 GHz) | 8 GB LPDDR4X | `Q4_0_4_8` (ARM NEON) | 2.60 GB | 2.95 GB | 320 ms | 13.8 tok/s |
| **Midrange Android / Mobile NPU** | Snapdragon / Tensor AICore | 8–12 GB | `INT4` / `Q4_K_M` | 2.78 GB | ~2.90 GB | 145 ms | 28+ tok/s |
| **8 GB Windows 10/11 Laptop** | x86_64 4+ cores w/ AVX2 (Intel Core i5 / Ryzen 5) | 8 GB DDR4/DDR5 | **`Q4_K_M` (E2B or E4B)** | 1.45–2.78 GB | 2.2–3.2 GB | ~210–350 ms | 24–48 tok/s |

---

## 3. Recommended Laptop & PC Tiers

### Tier 1: **4 GB RAM Windows Laptop / Mini-PC (Minimum)**
- **Models**: `slm-fast` (`Qwen 2.5 0.5B Q4_K_M`) + Deterministic Phrasebook/Braille/Morse **OR** `lightweight` (`Gemma 4 E2B IQ3_M/Q4_K_M`, 512 ctx).
- **Free Disk Space**: 3 GB.
- **CPU**: 64-bit Intel/AMD with **AVX2** support (2015 or newer).

### Tier 2: **8 GB RAM Windows Laptop (Primary Target Configuration)**
- **Recommended Dual-Model Pairing**:
  1. Onboarding SLM: **`slm-fast` — Qwen 2.5 0.5B Instruct (`Q4_K_M`, 0.42 GB)**
  2. Main Translator: **`lightweight` — Gemma 4 E2B Instruct (`Q4_K_M`, 1.45 GB)** *(fastest concurrency with webcam tracking)* **or** **`balanced` — Gemma 4 E4B (`Q4_K_M`, 2.78 GB)** *(with extra browser tabs closed)*
- **RAM Math on 8 GB Windows**: Windows OS (~3.0 GB) + Qwen 0.5B (~0.7 GB) + Gemma 4 E2B (~2.2 GB) + MediaPipe/Tkinter (~0.25 GB) = **~6.15 GB total**, leaving ~1.8 GB safety headroom.
- **Free Disk Space**: 5 GB (10 GB if building `.exe` + Python `.venv`).

### Tier 3: **16 GB – 32 GB RAM Workstation / GPU PC (High-Reasoning Tier)**
- **Recommended Pairing**: `slm-balanced` or `slm-reasoning` (`Gemma 4 E2B/E4B`) + **Phi-4-mini (3.8B)** for reasoning-heavy work, **or** a full **Phi-4 (14B)** / **Gemma 4 12B** if you have 16–32 GB RAM.
- **GPU (Optional)**: NVIDIA RTX 3060 12 GB / 4070+ or Apple Silicon Unified Memory allows offloading all layers for **>40 tok/s** decode speed.
- **Free Disk Space**: 20 GB.

---

## 4. Peripheral & Software Prerequisites

- **Webcam (for Sign-to-Text)**: Any UVC webcam supporting `640 × 480` at `>= 15 FPS` under room lighting (`meanLuma >= 48/255`). Not required for Keyboard/Braille/Morse/Speech modes.
- **Microphone / Speakers**: Standard OS microphone & speakers/headphones for Voice Input, Morse audio tones, and TTS playback.
- **Windows Desktop Build Software**:
  - Windows 10 or Windows 11 (x64)
  - Python **3.11 or 3.12 (64-bit)** with **Tcl/Tk (`tkinter`)** enabled
  - Optional: **Inno Setup 6** (`ISCC.exe`) for building `SignBridgeOfflineSetup-x64.exe`
- **Web Workbench Software**:
  - **Node.js 20+ or 22+** and modern Chromium/Edge/Chrome browser
  - Optional: `GEMINI_API_KEY` in `.env` for cloud/server-proxied Gemma 4 / Gemini translation & audio transcription
