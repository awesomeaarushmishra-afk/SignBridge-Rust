# SignBridge Offline — Keyboard-Only Accessibility & Onboarding User Guide

Every workflow—built-in SLM onboarding help, model swapping, webcam hand tracking calibration, typing normal text for automatic Braille/Morse/Sign conversion, reverse decoding, speech synthesis, and file export—is operable using a keyboard only.

## Global Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl+/` (Desktop: `F1`) | Open / close the Built-in Offline SLM Onboarding Assistant |
| `Alt+1..4` (Desktop: `Ctrl+1..4`) | Set Source Input (`Text`, `Braille`, `Morse`, `Sign Language`) |
| `Alt+Shift+1..4` (Desktop: `Alt+1..4`) | Set Target Output (`Text`, `Braille`, `Morse`, `Sign Language`) |
| `F5` / `Speak` | Speak converted output via local offline speech synthesizer |
| `F2` | Toggle collapsible Morse & Braille A–Z Reference Table |
| `Alt+H` | Toggle WCAG AAA High-Contrast palette |
| `Tab` / `Shift+Tab` | Move focus cleanly across every control and calibration slider |

## 1. Built-in SLM Onboarding Assistant (100% Offline)
- Open via **Assistant (`Ctrl+/` or `F1`)** in the top navigation bar.
- Ask questions such as *"How do I translate English to Braille?"*, *"How do I switch to Morse input?"*, *"How do I enable hand tracking?"*, or *"How do I change models?"*.
- Displays a clear **"NAVIGATION GUIDANCE ONLY (NOT TRANSLATION OUTPUT)"** banner and automatically falls back to static step-by-step help if local SLM weights are unavailable.

## 2. Switching Between Lightweight SLMs & Higher-Reasoning Models
- Open the **Models** tab (or desktop SLM / Translator dropdowns) to swap **Onboarding SLM** (`Lightweight SLM`, `Balanced SLM`, `Higher-Reasoning SLM`) separately from the **Main Translation Pipeline** (`Lightweight`, `Balanced`, `High Quality`, `Custom Local GGUF`) without editing code or reinstalling.

## 3. Local Webcam Hand Tracking & Calibration
- Select **Sign Language** source (`Alt+4` / `Ctrl+4`).
- Open **Calibrate Camera & Lighting** to configure camera mirror, hand scale, ambient lighting threshold, confidence gate, and debounce frames.
- Live status prompts (`"Move hands into frame"`, `"Lighting too low"`, `"Hold sign steady"`, `"Hand tracked cleanly"`) guide framing strictly on-device with zero uploads.
- Edit any recognized characters directly inside the **Active Input Buffer**, or fall back to A–Z pose triggers / standard keyboard typing (`Alt+1`).
