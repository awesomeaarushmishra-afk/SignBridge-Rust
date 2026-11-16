Place your local offline GGUF model files in this folder:

1. Onboarding & Navigation SLM (pick one, or fast default):
   - qwen2.5-0.5b-instruct-q4_k_m.gguf   (Lightweight fast SLM, ~0.42 GB)
   - gemma-4-e2b-q4_k_m.gguf             (Balanced SLM, ~1.45 GB)

2. Main Language Translator (pick one, or balanced default):
   - gemma-4-e4b-q4_k_m.gguf             (Balanced Gemma 4 E4B Translator, ~2.78 GB)
   - gemma-4-e2b-q4_k_m.gguf             (Lightweight Translator, ~1.45 GB)
   - gemma-4-12b-q4_k_m.gguf             (High-Quality Translator, ~6.40 GB)

Note: Large `.gguf` files are excluded from Git via `.gitignore` so GitHub pushes stay fast and clean.
Before packaging an offline Windows installer (`build_windows.ps1`), copy the two `.gguf` files into this `models/` folder (or next to `SignBridgeOffline.exe` inside `portable/models/`).
