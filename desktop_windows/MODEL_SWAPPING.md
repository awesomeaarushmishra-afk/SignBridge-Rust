# Swappable Local AI Model Guide (Dual Pipeline: Onboarding SLM + Translation)

SignBridge decouples both **Onboarding SLM Q&A** and **Translation / Sign Reasoning** behind `LocalModelManager` (`models.json` + UI controls). Switch between faster low-RAM models and higher-reasoning models without editing code or reinstalling.

## 1. Onboarding & Navigation SLM Tiers
| Tier | Model | Disk Size | Min / Rec RAM | Speed / Quality Tradeoff | License | Bundled |
|---|---|---|---|---|---|---|
| Lightweight SLM | Qwen 2.5 0.5B Instruct (Q4_K_M) | 0.42 GB | 2 / 4 GB | Fastest (~115 tok/s CPU) · Instant UI help | Apache-2.0 | Yes |
| Balanced SLM | Gemma 4 E2B Instruct (Q4_K_M) | 1.45 GB | 4 / 8 GB | Balanced (~48 tok/s CPU) · Multi-step help | Gemma Terms | Optional |
| Higher-Reasoning SLM | Gemma 4 E4B Instruct (Q4_K_M) | 2.78 GB | 6 / 12 GB | Slower (~22 tok/s CPU) · Complex diagnostics | Gemma Terms | Optional |

## 2. Main Translation & Sign Pipeline Tiers
| Tier | Model | Disk Size | Min / Rec RAM | Speed / Quality Tradeoff | License | Bundled |
|---|---|---|---|---|---|---|
| Lightweight | Gemma 4 E2B Instruct | 1.45 GB | 4 / 4 GB | Fast (~48 tok/s CPU) · Concise phrases | Gemma Terms | Yes |
| Balanced (Default) | Gemma 4 E4B Instruct | 2.78 GB | 6 / 8 GB | Moderate (~24 tok/s CPU) · Strong accuracy | Gemma Terms | Yes |
| High Quality | Gemma 4 12B / Qwen 2.5 7B | 6.40 GB | 10 / 16 GB | Slower (~8 tok/s CPU) · Highest nuance | Gemma / Apache-2.0 | Manual GGUF |
| Custom | Any `llama.cpp` GGUF | Variable | 6 / 8+ GB | User GGUF checkpoint | Per model | Manual GGUF |

## Hardware Warnings & Offline Guarantees
- Changing tiers in the **Models** screen evaluates host RAM against `minRamGb` and `recommendedRamGb` for both active models and surfaces clear memory or slow-performance warnings before inference.
- Core Braille, Morse, BRF, PCM `.wav`, hand-tracking normalization, and static onboarding fallback continue operating even if optional `.gguf` weights are not installed.
