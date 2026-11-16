"""Built-in offline Small Language Model (SLM) onboarding & navigation assistant with static fallback."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

from model_manager import SlmPreset, resolve_runtime_path


@dataclass
class AssistantContext:
    active_screen: str
    source_modality: str
    target_modality: str
    source_language: str
    target_language: str
    slm_available: bool
    slm_preset: SlmPreset


@dataclass
class AssistantReply:
    question: str
    title: str
    summary: str
    steps: List[str]
    context_tip: str
    engine_label: str
    is_static_fallback: bool
    is_guidance_only: bool = True


class OnboardingSlmAssistant:
    """100% offline onboarding assistant; never blocks translation when local SLM weights are absent."""

    def answer(self, question: str, ctx: AssistantContext) -> AssistantReply:
        q = question.strip()
        low = q.lower()
        fallback = not ctx.slm_available
        slm_weights_path = resolve_runtime_path(ctx.slm_preset.model_file)
        engine_label = (
            "Static Offline Help Fallback (SLM Unavailable - Translation Operational)"
            if fallback
            else f"Local Offline SLM ({ctx.slm_preset.model_name})"
        )

        # Optional local llama-cpp-python runtime hook if weights exist beside executable
        if ctx.slm_available and slm_weights_path.exists():
            try:
                from llama_cpp import Llama  # type: ignore  # pragma: no cover

                _ = Llama
            except Exception:
                pass

        context_tip = (
            f"Current screen: {ctx.active_screen} | Source: {ctx.source_modality} ({ctx.source_language}) "
            f"-> Target: {ctx.target_modality} ({ctx.target_language})"
        )

        if "braille" in low or ("english" in low and "morse" not in low):
            steps = [
                "1. Press Ctrl+1 to set Source Input to Text / Speech.",
                "2. Press Alt+2 to set Target Output to Braille (Unicode + BRF).",
                "3. Type normal English in the Keyboard Input Buffer; Unicode Braille & ASCII BRF update automatically.",
                "4. Click 'Export .brf' or 'Save .txt' to write embosser-ready Braille offline.",
            ]
            if ctx.slm_preset.id == "slm-reasoning":
                steps.append("5. Reasoning tip: For Braille -> English reverse decoding, press Ctrl+2 then Alt+1.")
            return AssistantReply(
                question=q,
                title="Translate English to Braille Offline",
                summary="Type normal text and convert live into Grade-1 Unicode Braille and ASCII BRF.",
                steps=steps,
                context_tip=context_tip,
                engine_label=engine_label,
                is_static_fallback=fallback,
            )

        if "morse" in low:
            return AssistantReply(
                question=q,
                title="Switch to Morse Input or Output",
                summary="Key dots/dashes directly or convert plain text to visual Morse & 22.05 kHz WAV.",
                steps=[
                    "1. Press Ctrl+3 to switch Source Input to Morse Code.",
                    "2. Enter dots (.) and dashes (-) separated by '/' between words.",
                    "3. Or press Alt+3 with Source=Text to auto-convert typing to Morse and click 'Export Morse .wav'.",
                ],
                context_tip=context_tip,
                engine_label=engine_label,
                is_static_fallback=fallback,
            )

        if any(k in low for k in ("hand", "sign", "camera", "webcam", "track", "calibrat")):
            return AssistantReply(
                question=q,
                title="Enable Local Webcam Hand Tracking & Calibration",
                summary="All camera frames stay strictly on-device with zero network uploads.",
                steps=[
                    "1. Press Ctrl+4 to set Source Input to Sign Language.",
                    "2. Place your hand in front of the webcam with good lighting.",
                    "3. Hold a supported static ASL A-Z pose steady inside the frame for 5 frames.",
                    "4. Edit any recognized character in the transcript box before converting, or type directly via Ctrl+1.",
                ],
                context_tip=context_tip,
                engine_label=engine_label,
                is_static_fallback=fallback,
            )

        if any(k in low for k in ("model", "slm", "switch", "swap", "reason")):
            return AssistantReply(
                question=q,
                title="Switch Between Lightweight SLMs & Higher-Reasoning Models",
                summary="Change both the Onboarding SLM and main Translation model directly from UI dropdowns.",
                steps=[
                    "1. Choose Onboarding SLM tier ('slm-fast', 'slm-balanced', 'slm-reasoning') in the header.",
                    "2. Choose Main Translation Model tier ('lightweight', 'balanced', 'high-quality') separately.",
                    "3. Review RAM compatibility warnings and installed status without restarting or editing code.",
                ],
                context_tip=context_tip,
                engine_label=engine_label,
                is_static_fallback=fallback,
            )

        return AssistantReply(
            question=q or "Help",
            title="Offline Accessibility Navigation Help",
            summary="Use Ctrl+1..4 for Source, Alt+1..4 for Target, F5 to Speak, and Alt+H for High Contrast.",
            steps=[
                "1. Select Source & Target modes using keyboard shortcuts or radio controls.",
                "2. Type or paste input; converted output and NormalizedIR update offline in real time.",
                "3. Export results via Save .txt, Export .brf, or Export Morse .wav.",
            ],
            context_tip=context_tip,
            engine_label=engine_label,
            is_static_fallback=fallback,
        )
