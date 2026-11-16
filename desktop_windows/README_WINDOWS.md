# SignBridge Offline — Windows Desktop Build & Setup Guide

## Architecture Overview
SignBridge Desktop (`desktop_windows/`) is a 100% offline Windows accessibility suite that translates in both directions between **Spoken languages**, **Braille (Unicode + BRF)**, **ITU Morse code (visual + PCM `.wav`)**, and **Sign language (webcam landmark input + 2D skeletal fingerspelling avatar)** using a normalized intermediate representation (`NormalizedIR`).

- **Zero runtime internet access**: All Braille, Morse, BRF, PCM `.wav` audio, sign normalization, offline phrasebook, and local GGUF inference (`llama-cpp-python`) + Windows SAPI5 (`pyttsx3`) / `vosk` STT run strictly on localhost/disk.
- **Note on `.exe` compilation environment**: PyInstaller and Inno Setup produce native Windows PE binaries and must be executed on Windows 10/11 x64 (`build_windows.ps1`). Cross-platform pure logic tests execute identically via `python3 -m unittest`.

## Prerequisites (Windows 10 / 11 x64)
1. Python 3.11 or 3.12 (with Tk/Tcl checked during installation).
2. Optional for full setup installer: Inno Setup 6 (`ISCC.exe`).
3. Optional local GGUF weights copied once into `desktop_windows/models/`:
   - `gemma-4-e2b-q4_k_m.gguf` (Lightweight, 4 GB RAM)
   - `gemma-4-e4b-q4_k_m.gguf` (Balanced default, 6–8 GB RAM)
   - `gemma-4-12b-q4_k_m.gguf` or `qwen2.5-7b-instruct-q4_k_m.gguf` (High Quality, 10–16 GB RAM)
   - Optional `vosk-model-small-en-us-0.15/` folder for offline microphone speech-to-text.

## One-Command Windows Packaging
```powershell
cd desktop_windows
powershell -ExecutionPolicy Bypass -File .\build_windows.ps1
```
Outputs:
- Portable executable: `desktop_windows\dist\SignBridgeOffline.exe`
- Windows installer (if Inno Setup 6 is installed): `desktop_windows\dist\SignBridgeOfflineSetup-x64.exe`
