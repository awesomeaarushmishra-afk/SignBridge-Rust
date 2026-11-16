"""SignBridge Offline Windows Desktop Accessibility Translator (tkinter, keyboard-first)."""

from __future__ import annotations

import shutil
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Dict, List

from braille_morse import generate_morse_wav_bytes
from model_manager import (
    DEFAULT_PRESETS,
    DEFAULT_SLM_PRESETS,
    LocalModelManager,
    get_app_dir,
    resolve_runtime_path,
)
from onboarding_slm import AssistantContext, OnboardingSlmAssistant
from sign_avatar import HandCalibrationConfig
from translator_core import convert_bidirectional

APP_DIR = get_app_dir()
MODELS_CONFIG = APP_DIR / "models.json"
if not MODELS_CONFIG.exists():
    bundled_cfg = resolve_runtime_path("models.json", APP_DIR)
    if bundled_cfg.exists() and bundled_cfg != MODELS_CONFIG:
        try:
            shutil.copyfile(bundled_cfg, MODELS_CONFIG)
        except OSError:
            MODELS_CONFIG = bundled_cfg

LANGUAGES = [
    "Auto-Detect",
    "English",
    "Spanish",
    "Japanese",
    "Mandarin Chinese",
    "Hindi",
    "French",
    "German",
    "Arabic",
    "Portuguese",
    "Korean",
    "Italian",
    "Russian",
    "Bengali",
    "Tamil",
    "Vietnamese",
    "Turkish",
]

TARGET_LANGUAGES = [lang for lang in LANGUAGES if lang != "Auto-Detect"]

MODALITIES = [
    ("text", "Text / Speech"),
    ("braille", "Braille (Unicode + BRF)"),
    ("morse", "Morse Code (Visual + WAV)"),
    ("sign", "Sign Language (Webcam + Fallback)"),
]

THEMES: Dict[str, Dict[str, str]] = {
    "standard": {
        "bg": "#F8FAFC",
        "panel": "#FFFFFF",
        "fg": "#0F172A",
        "muted": "#475569",
        "accent": "#2563EB",
        "border": "#CBD5E1",
    },
    "high_contrast": {
        "bg": "#000000",
        "panel": "#09090B",
        "fg": "#FFFFFF",
        "muted": "#FDE047",
        "accent": "#38BDF8",
        "border": "#FFFFFF",
    },
}


class SignBridgeDesktopApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("SignBridge Offline Accessibility Translator")
        self.root.geometry("1240x840")

        self.model_manager = LocalModelManager(MODELS_CONFIG, host_ram_gb=8)
        self.assistant = OnboardingSlmAssistant()
        self.hand_calibration = HandCalibrationConfig()

        self.high_contrast = tk.BooleanVar(value=False)
        self.font_size = tk.IntVar(value=12)
        self.source_modality = tk.StringVar(value="text")
        self.target_modality = tk.StringVar(value="braille")
        self.source_language = tk.StringVar(value="Auto-Detect")
        self.target_language = tk.StringVar(value="English")
        self.active_model_tier = tk.StringVar(value=self.model_manager.active_id)
        self.active_slm_tier = tk.StringVar(value=self.model_manager.active_slm_id)
        self.slm_question = tk.StringVar(value="How do I translate English to Braille?")
        self.status_text = tk.StringVar(value="Offline mode ready. Type anywhere to auto-convert. Press F1 for SLM Help.")
        self.ref_visible = tk.BooleanVar(value=False)
        self.assistant_visible = tk.BooleanVar(value=False)
        self.last_result = None

        self._build_ui()
        self._bind_shortcuts()
        self._apply_theme()
        self._run_conversion()

    def _build_ui(self) -> None:
        self.container = tk.Frame(self.root, padx=16, pady=12)
        self.container.pack(fill=tk.BOTH, expand=True)

        # Header & Accessibility + Dual Model Switcher
        top_bar = tk.Frame(self.container)
        top_bar.pack(fill=tk.X, pady=(0, 10))

        self.title_lbl = tk.Label(
            top_bar,
            text="SignBridge Offline Accessibility Translator",
            font=("Segoe UI", 15, "bold"),
        )
        self.title_lbl.pack(side=tk.LEFT)

        acc_frame = tk.Frame(top_bar)
        acc_frame.pack(side=tk.RIGHT)

        tk.Button(
            acc_frame,
            text="Assistant (F1)",
            command=self._toggle_assistant,
        ).pack(side=tk.LEFT, padx=4)

        tk.Checkbutton(
            acc_frame,
            text="High Contrast (Alt+H)",
            variable=self.high_contrast,
            command=self._apply_theme,
        ).pack(side=tk.LEFT, padx=4)

        tk.Label(acc_frame, text="Font:").pack(side=tk.LEFT)
        ttk.Combobox(
            acc_frame,
            values=[11, 13, 16, 20],
            width=4,
            textvariable=self.font_size,
            state="readonly",
        ).pack(side=tk.LEFT, padx=3)
        self.font_size.trace_add("write", lambda *_: self._apply_theme())

        tk.Label(acc_frame, text="SLM:").pack(side=tk.LEFT, padx=(6, 2))
        slm_box = ttk.Combobox(
            acc_frame,
            values=[p.id for p in DEFAULT_SLM_PRESETS],
            width=13,
            textvariable=self.active_slm_tier,
            state="readonly",
        )
        slm_box.pack(side=tk.LEFT)
        slm_box.bind("<<ComboboxSelected>>", self._on_model_changed)

        tk.Label(acc_frame, text="Translator:").pack(side=tk.LEFT, padx=(6, 2))
        model_box = ttk.Combobox(
            acc_frame,
            values=[p.id for p in DEFAULT_PRESETS],
            width=12,
            textvariable=self.active_model_tier,
            state="readonly",
        )
        model_box.pack(side=tk.LEFT)
        model_box.bind("<<ComboboxSelected>>", self._on_model_changed)

        # Collapsible Built-in SLM Onboarding Assistant Drawer
        self.assistant_frame = tk.LabelFrame(
            self.container,
            text="Built-in Offline SLM Onboarding & Navigation Guide (GUIDANCE ONLY - NOT TRANSLATION OUTPUT)",
            padx=10,
            pady=8,
        )
        q_row = tk.Frame(self.assistant_frame)
        q_row.pack(fill=tk.X, pady=(0, 6))
        tk.Entry(q_row, textvariable=self.slm_question).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        tk.Button(q_row, text="Ask SLM", command=self._ask_assistant).pack(side=tk.LEFT, padx=2)
        for sample_q, lbl in [
            ("How do I translate English to Braille?", "English->Braille"),
            ("How do I switch to Morse input?", "Morse Input"),
            ("How do I enable hand tracking?", "Hand Tracking"),
            ("How do I change models?", "Change Models"),
        ]:
            tk.Button(
                q_row,
                text=lbl,
                command=lambda sq=sample_q: self._ask_preset(sq),
            ).pack(side=tk.LEFT, padx=2)

        self.assistant_out = tk.Text(self.assistant_frame, height=6, wrap=tk.WORD)
        self.assistant_out.pack(fill=tk.X)

        # Mode selectors (Source & Target)
        self.modes_bar = tk.Frame(self.container)
        self.modes_bar.pack(fill=tk.X, pady=(0, 10))

        src_grp = tk.LabelFrame(self.modes_bar, text="Source Input (Ctrl+1..4)", padx=8, pady=6)
        src_grp.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        for val, label in MODALITIES:
            tk.Radiobutton(
                src_grp,
                text=label,
                variable=self.source_modality,
                value=val,
                command=self._run_conversion,
            ).pack(side=tk.LEFT, padx=4)

        src_lang_box = ttk.Combobox(
            src_grp,
            values=LANGUAGES,
            width=15,
            textvariable=self.source_language,
            state="readonly",
        )
        src_lang_box.pack(side=tk.RIGHT, padx=4)
        src_lang_box.bind("<<ComboboxSelected>>", lambda *_: self._run_conversion())

        tgt_grp = tk.LabelFrame(self.modes_bar, text="Target Output (Alt+1..4)", padx=8, pady=6)
        tgt_grp.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(6, 0))
        for val, label in MODALITIES:
            tk.Radiobutton(
                tgt_grp,
                text=label,
                variable=self.target_modality,
                value=val,
                command=self._run_conversion,
            ).pack(side=tk.LEFT, padx=4)

        tgt_lang_box = ttk.Combobox(
            tgt_grp,
            values=TARGET_LANGUAGES,
            width=15,
            textvariable=self.target_language,
            state="readonly",
        )
        tgt_lang_box.pack(side=tk.RIGHT, padx=4)
        tgt_lang_box.bind("<<ComboboxSelected>>", lambda *_: self._run_conversion())

        # Main split pane: Input left, Output + Sign Avatar right
        body = tk.Frame(self.container)
        body.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(body)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 8))

        tk.Label(
            left,
            text="Editable Input / Sign Transcript Buffer (all camera & hand tracking stays on-device):",
        ).pack(anchor=tk.W)
        self.input_box = tk.Text(left, height=9, wrap=tk.WORD, padx=10, pady=8)
        self.input_box.pack(fill=tk.BOTH, expand=True, pady=(4, 8))
        self.input_box.insert("1.0", "hello please help")
        self.input_box.bind("<KeyRelease>", lambda *_: self._run_conversion())

        right = tk.Frame(body)
        right.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(8, 0))

        tk.Label(right, text="Converted Translation Output (Text / Braille+BRF / Morse / Sign):").pack(anchor=tk.W)
        self.output_box = tk.Text(right, height=7, wrap=tk.WORD, padx=10, pady=8)
        self.output_box.pack(fill=tk.BOTH, expand=True, pady=(4, 8))

        self.meta_lbl = tk.Label(right, text="", anchor=tk.W, justify=tk.LEFT)
        self.meta_lbl.pack(fill=tk.X, pady=(0, 6))

        self.avatar_canvas = tk.Canvas(right, height=130, bg="#0F172A", highlightthickness=1)
        self.avatar_canvas.pack(fill=tk.X, pady=(0, 8))

        # Action & Export Bar
        actions = tk.Frame(self.container)
        actions.pack(fill=tk.X, pady=(8, 4))

        tk.Button(actions, text="Speak (F5)", command=self._speak_output).pack(side=tk.LEFT, padx=4)
        tk.Button(actions, text="Copy Output (Ctrl+Shift+C)", command=self._copy_output).pack(side=tk.LEFT, padx=4)
        tk.Button(actions, text="Save .txt", command=self._export_txt).pack(side=tk.LEFT, padx=4)
        tk.Button(actions, text="Export .brf", command=self._export_brf).pack(side=tk.LEFT, padx=4)
        tk.Button(actions, text="Export Morse .wav", command=self._export_wav).pack(side=tk.LEFT, padx=4)
        tk.Button(actions, text="Toggle Reference Table (F2)", command=self._toggle_ref).pack(side=tk.RIGHT, padx=4)

        self.ref_frame = tk.LabelFrame(self.container, text="Morse & Braille Reference (A-Z)", padx=8, pady=6)
        self.ref_text = tk.Text(self.ref_frame, height=4, wrap=tk.WORD)
        self.ref_text.insert(
            "1.0",
            "A .-   B -...  C -.-.  D -..   E .     F ..-.  G --.   H ....  I ..    J .---\n"
            "K -.-  L .-..  M --    N -.    O ---   P .--.  Q --.-  R .-.   S ...   T -\n"
            "U ..-  V ...-  W .--   X -..-  Y -.--  Z --..",
        )
        self.ref_text.config(state=tk.DISABLED)
        self.ref_text.pack(fill=tk.X)

        self.status_bar = tk.Label(self.container, textvariable=self.status_text, anchor=tk.W)
        self.status_bar.pack(fill=tk.X, pady=(4, 0))

    def _bind_shortcuts(self) -> None:
        for idx, (mod, _) in enumerate(MODALITIES, start=1):
            self.root.bind(f"<Control-Key-{idx}>", lambda _e, m=mod: self._set_source(m))
            self.root.bind(f"<Alt-Key-{idx}>", lambda _e, m=mod: self._set_target(m))
        self.root.bind("<F1>", lambda _e: self._toggle_assistant())
        self.root.bind("<F5>", lambda _e: self._speak_output())
        self.root.bind("<F2>", lambda _e: self._toggle_ref())
        self.root.bind("<Alt-h>", lambda _e: self._toggle_contrast())

    def _toggle_assistant(self) -> None:
        if self.assistant_visible.get():
            self.assistant_frame.pack_forget()
            self.assistant_visible.set(False)
        else:
            self.assistant_frame.pack(fill=tk.X, pady=(0, 8), before=self.modes_bar)
            self.assistant_visible.set(True)
            self._ask_assistant()

    def _ask_preset(self, q: str) -> None:
        self.slm_question.set(q)
        self._ask_assistant()

    def _ask_assistant(self) -> None:
        ctx = AssistantContext(
            active_screen="Main Workbench",
            source_modality=self.source_modality.get(),
            target_modality=self.target_modality.get(),
            source_language=self.source_language.get(),
            target_language=self.target_language.get(),
            slm_available=self.model_manager.slm_available,
            slm_preset=self.model_manager.active_slm_preset(),
        )
        reply = self.assistant.answer(self.slm_question.get(), ctx)
        lines = [
            f"[{reply.engine_label}] - {reply.title}",
            reply.summary,
            *reply.steps,
            f"Context: {reply.context_tip}",
        ]
        self.assistant_out.delete("1.0", tk.END)
        self.assistant_out.insert("1.0", "\n".join(lines))

    def _set_source(self, mod: str) -> None:
        self.source_modality.set(mod)
        self._run_conversion()

    def _set_target(self, mod: str) -> None:
        self.target_modality.set(mod)
        self._run_conversion()

    def _toggle_contrast(self) -> None:
        self.high_contrast.set(not self.high_contrast.get())
        self._apply_theme()

    def _toggle_ref(self) -> None:
        if self.ref_visible.get():
            self.ref_frame.pack_forget()
            self.ref_visible.set(False)
        else:
            self.ref_frame.pack(fill=tk.X, pady=(6, 0))
            self.ref_visible.set(True)

    def _on_model_changed(self, _evt=None) -> None:
        self.model_manager.select_slm_preset(self.active_slm_tier.get())
        preset = self.model_manager.select_preset(self.active_model_tier.get())
        self.model_manager.save_config()
        ok, msg = self.model_manager.compatibility_status()
        self.status_text.set(f"Switched adapters -> SLM:{self.active_slm_tier.get()} | Trans:{preset.model_name} | {msg}")
        if not ok:
            messagebox.showwarning("Hardware Warning", msg)
        if self.assistant_visible.get():
            self._ask_assistant()
        self._run_conversion()

    def _apply_theme(self) -> None:
        theme = THEMES["high_contrast" if self.high_contrast.get() else "standard"]
        sz = max(10, int(self.font_size.get()))
        self.root.configure(bg=theme["bg"])
        self.container.configure(bg=theme["bg"])
        self.input_box.configure(bg=theme["panel"], fg=theme["fg"], insertbackground=theme["fg"], font=("Consolas", sz))
        self.output_box.configure(bg=theme["panel"], fg=theme["fg"], font=("Segoe UI", sz))
        self.status_bar.configure(bg=theme["bg"], fg=theme["muted"], font=("Segoe UI", max(9, sz - 2)))
        self.meta_lbl.configure(bg=theme["bg"], fg=theme["muted"], font=("Consolas", max(9, sz - 2)))

    def _draw_sign_preview(self, sequence: List[str]) -> None:
        self.avatar_canvas.delete("all")
        if not sequence:
            self.avatar_canvas.create_text(18, 65, anchor="w", fill="#94A3B8", text="Sign Avatar Ready (on-device ASL fingerspelling)")
            return
        x = 26
        for token in sequence[:16]:
            color = "#38BDF8" if token != "SPACE" else "#64748B"
            self.avatar_canvas.create_oval(x - 14, 34, x + 14, 62, outline=color, width=2)
            self.avatar_canvas.create_text(x, 48, fill="#F8FAFC", text="." if token == "SPACE" else token, font=("Consolas", 11, "bold"))
            x += 40
        self.avatar_canvas.create_text(
            16, 108, anchor="w", fill="#CBD5E1",
            text=f"Sign Sequence ({len(sequence)} gloss tokens) - Local ASL Fingerspelling Preview",
            font=("Segoe UI", 9),
        )

    def _run_conversion(self) -> None:
        raw = self.input_box.get("1.0", tk.END).strip()
        res = convert_bidirectional(
            raw_input=raw,
            source_modality=self.source_modality.get(),
            target_modality=self.target_modality.get(),
            source_language=self.source_language.get(),
            target_language=self.target_language.get(),
            model_manager=self.model_manager,
        )
        self.last_result = res
        self.output_box.delete("1.0", tk.END)
        self.output_box.insert("1.0", res.output_text)
        self.meta_lbl.config(
            text=f"IR: '{res.ir.canonical_english}' ({res.ir.detected_language}) | BRF: {res.braille_brf} | Morse: {res.morse_code}"
        )
        self._draw_sign_preview(res.sign_sequence)

    def _speak_output(self) -> None:
        if not self.last_result:
            return
        text = self.last_result.output_text or self.last_result.ir.canonical_english
        try:
            import pyttsx3  # type: ignore

            engine = pyttsx3.init()
            engine.say(text)
            engine.runAndWait()
            self.status_text.set("Spoke output via Windows SAPI5 offline TTS.")
        except Exception:
            self.status_text.set(f"Offline TTS simulated (install pyttsx3 on Windows): '{text}'")

    def _copy_output(self) -> None:
        if not self.last_result:
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(self.last_result.output_text)
        self.status_text.set("Copied converted output to clipboard.")

    def _export_txt(self) -> None:
        if not self.last_result:
            return
        path = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Text", "*.txt")])
        if path:
            Path(path).write_text(self.last_result.output_text, encoding="utf-8")
            self.status_text.set(f"Exported {path}")

    def _export_brf(self) -> None:
        if not self.last_result:
            return
        path = filedialog.asksaveasfilename(defaultextension=".brf", filetypes=[("Braille Ready Format", "*.brf")])
        if path:
            Path(path).write_text(self.last_result.braille_brf, encoding="ascii", errors="ignore")
            self.status_text.set(f"Exported BRF {path}")

    def _export_wav(self) -> None:
        if not self.last_result:
            return
        path = filedialog.asksaveasfilename(defaultextension=".wav", filetypes=[("WAVE Audio", "*.wav")])
        if path:
            wav_bytes = generate_morse_wav_bytes(self.last_result.morse_code)
            Path(path).write_bytes(wav_bytes)
            self.status_text.set(f"Exported Morse WAV {path}")


def main() -> None:
    root = tk.Tk()
    SignBridgeDesktopApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
