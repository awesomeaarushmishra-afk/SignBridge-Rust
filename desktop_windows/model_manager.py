"""Swappable offline local AI model adapter & dual-pipeline configuration manager (SLM + Translation)."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def get_app_dir() -> Path:
    """Resolve the persistent application directory (exe folder when frozen via PyInstaller)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def resolve_runtime_path(path_str: str | Path, base_dir: Optional[Path] = None) -> Path:
    """Resolve relative runtime assets/models beside executable first, then PyInstaller _MEIPASS."""
    p = Path(path_str)
    if p.is_absolute():
        return p
    root = base_dir if base_dir is not None else get_app_dir()
    candidate = root / p
    if candidate.exists():
        return candidate
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        bundled = Path(meipass) / p
        if bundled.exists():
            return bundled
    return candidate


@dataclass
class SlmPreset:
    id: str
    tier_label: str
    model_name: str
    family: str
    quantization: str
    disk_size_gb: float
    model_file: str
    min_ram_gb: int
    recommended_ram_gb: int
    speed_tradeoff: str
    quality_tradeoff: str
    bundled: bool
    installed: bool
    license: str


@dataclass
class ModelPreset:
    id: str
    tier_label: str
    model_name: str
    family: str
    quantization: str
    disk_size_gb: float
    model_file: str
    min_ram_gb: int
    recommended_ram_gb: int
    context_length: int
    speed_tradeoff: str
    quality_tradeoff: str
    bundled: bool
    installed: bool
    license: str


DEFAULT_SLM_PRESETS: List[SlmPreset] = [
    SlmPreset(
        id="slm-fast",
        tier_label="Lightweight SLM",
        model_name="Qwen 2.5 0.5B Instruct (Fast SLM)",
        family="Qwen 2.5",
        quantization="Q4_K_M",
        disk_size_gb=0.42,
        model_file="models/qwen2.5-0.5b-instruct-q4_k_m.gguf",
        min_ram_gb=2,
        recommended_ram_gb=4,
        speed_tradeoff="Fastest (~115 tok/s CPU)",
        quality_tradeoff="Instant UI & shortcut help",
        bundled=True,
        installed=True,
        license="Apache-2.0",
    ),
    SlmPreset(
        id="slm-balanced",
        tier_label="Balanced SLM",
        model_name="Gemma 4 E2B Instruct (Assistant)",
        family="Gemma 4",
        quantization="Q4_K_M",
        disk_size_gb=1.45,
        model_file="models/gemma-4-e2b-q4_k_m.gguf",
        min_ram_gb=4,
        recommended_ram_gb=8,
        speed_tradeoff="Balanced (~48 tok/s CPU)",
        quality_tradeoff="Step-by-step guidance & calibration tips",
        bundled=False,
        installed=False,
        license="Gemma Terms of Use",
    ),
    SlmPreset(
        id="slm-reasoning",
        tier_label="Higher-Reasoning SLM",
        model_name="Gemma 4 E4B Instruct (Reasoning)",
        family="Gemma 4",
        quantization="Q4_K_M",
        disk_size_gb=2.78,
        model_file="models/gemma-4-e4b-q4_k_m.gguf",
        min_ram_gb=6,
        recommended_ram_gb=12,
        speed_tradeoff="Slower (~22 tok/s CPU)",
        quality_tradeoff="Higher-reasoning workflow troubleshooting",
        bundled=False,
        installed=False,
        license="Gemma Terms of Use",
    ),
]


DEFAULT_PRESETS: List[ModelPreset] = [
    ModelPreset(
        id="lightweight",
        tier_label="Lightweight",
        model_name="Gemma 4 E2B Instruct",
        family="Gemma 4",
        quantization="Q4_K_M",
        disk_size_gb=1.45,
        model_file="models/gemma-4-e2b-q4_k_m.gguf",
        min_ram_gb=4,
        recommended_ram_gb=4,
        context_length=512,
        speed_tradeoff="Fast (~48 tok/s CPU)",
        quality_tradeoff="Concise phrase & sign-gloss translation",
        bundled=True,
        installed=True,
        license="Gemma Terms of Use",
    ),
    ModelPreset(
        id="balanced",
        tier_label="Balanced",
        model_name="Gemma 4 E4B Instruct",
        family="Gemma 4",
        quantization="Q4_K_M",
        disk_size_gb=2.78,
        model_file="models/gemma-4-e4b-q4_k_m.gguf",
        min_ram_gb=6,
        recommended_ram_gb=8,
        context_length=1024,
        speed_tradeoff="Moderate (~24 tok/s CPU)",
        quality_tradeoff="Strong multilingual accuracy",
        bundled=True,
        installed=True,
        license="Gemma Terms of Use",
    ),
    ModelPreset(
        id="high-quality",
        tier_label="High Quality",
        model_name="Gemma 4 12B / Qwen 2.5 7B",
        family="Gemma 4 / Qwen 2.5",
        quantization="Q4_K_M",
        disk_size_gb=6.40,
        model_file="models/gemma-4-12b-q4_k_m.gguf",
        min_ram_gb=10,
        recommended_ram_gb=16,
        context_length=2048,
        speed_tradeoff="Slow on CPU (~8 tok/s)",
        quality_tradeoff="Highest translation nuance",
        bundled=False,
        installed=False,
        license="Gemma Terms / Apache-2.0",
    ),
]


OFFLINE_PHRASEBOOK: Dict[str, Dict[str, str]] = {
    "hello": {
        "English": "hello",
        "Spanish": "hola",
        "Japanese": "こんにちは",
        "Mandarin Chinese": "你好",
        "Hindi": "नमस्ते",
        "French": "bonjour",
        "German": "hallo",
        "Arabic": "مرحبا",
        "Portuguese": "olá",
        "Korean": "안녕하세요",
        "Italian": "ciao",
        "Russian": "привет",
        "Bengali": "হ্যালো",
        "Tamil": "வணக்கம்",
        "Vietnamese": "xin chào",
        "Turkish": "merhaba",
    },
    "hello world": {
        "English": "hello world",
        "Spanish": "hola mundo",
        "Japanese": "こんにちは世界",
        "Mandarin Chinese": "你好世界",
        "Hindi": "नमस्ते दुनिया",
        "French": "bonjour le monde",
        "German": "hallo welt",
        "Arabic": "مرحبا بالعالم",
        "Portuguese": "olá mundo",
        "Korean": "안녕 세상",
        "Italian": "ciao mondo",
        "Russian": "привет мир",
        "Bengali": "হ্যালো বিশ্ব",
        "Tamil": "வணக்கம் உலகம்",
        "Vietnamese": "xin chào thế giới",
        "Turkish": "merhaba dünya",
    },
    "thank you": {
        "English": "thank you",
        "Spanish": "gracias",
        "Japanese": "ありがとうございます",
        "Mandarin Chinese": "谢谢",
        "Hindi": "धन्यवाद",
        "French": "merci",
        "German": "danke",
        "Arabic": "شكرا لك",
        "Portuguese": "obrigado",
        "Korean": "감사합니다",
        "Italian": "grazie",
        "Russian": "спасибо",
        "Bengali": "ধন্যবাদ",
        "Tamil": "நன்றி",
        "Vietnamese": "cảm ơn",
        "Turkish": "teşekkür ederim",
    },
    "please": {
        "English": "please",
        "Spanish": "por favor",
        "Japanese": "お願いします",
        "Mandarin Chinese": "请",
        "Hindi": "कृपया",
        "French": "s'il vous plaît",
        "German": "bitte",
        "Arabic": "من فضلك",
        "Portuguese": "por favor",
        "Korean": "제발",
        "Italian": "per favore",
        "Russian": "пожалуйста",
        "Bengali": "দয়া করে",
        "Tamil": "தயவு செய்து",
        "Vietnamese": "làm ơn",
        "Turkish": "lütfen",
    },
    "help": {
        "English": "help",
        "Spanish": "ayuda",
        "Japanese": "助けて",
        "Mandarin Chinese": "帮助",
        "Hindi": "मदद",
        "French": "aide",
        "German": "hilfe",
        "Arabic": "مساعدة",
        "Portuguese": "ajuda",
        "Korean": "도와주세요",
        "Italian": "aiuto",
        "Russian": "помощь",
        "Bengali": "সাহায্য",
        "Tamil": "உதவி",
        "Vietnamese": "giúp đỡ",
        "Turkish": "yardım",
    },
    "help me": {
        "English": "help me",
        "Spanish": "ayúdame",
        "Japanese": "助けてください",
        "Mandarin Chinese": "帮帮我",
        "Hindi": "मेरी मदद करें",
        "French": "aidez-moi",
        "German": "hilf mir",
        "Arabic": "ساعدني",
        "Portuguese": "me ajude",
        "Korean": "저를 도와주세요",
        "Italian": "aiutami",
        "Russian": "помогите мне",
        "Bengali": "আমাকে সাহায্য করুন",
        "Tamil": "எனக்கு உதவுங்கள்",
        "Vietnamese": "giúp tôi với",
        "Turkish": "bana yardım edin",
    },
    "hello please help": {
        "English": "hello please help",
        "Spanish": "hola por favor ayuda",
        "Japanese": "こんにちは 助けてください",
        "Mandarin Chinese": "你好 请帮忙",
        "Hindi": "नमस्ते कृपया मदद करें",
        "French": "bonjour s'il vous plaît aidez-moi",
        "German": "hallo bitte helfen sie mir",
        "Arabic": "مرحبا من فضلك ساعدني",
        "Portuguese": "olá por favor ajuda",
        "Korean": "안녕하세요 도와주세요",
        "Italian": "ciao per favore aiuta",
        "Russian": "привет пожалуйста помогите",
        "Bengali": "হ্যালো দয়া করে সাহায্য করুন",
        "Tamil": "வணக்கம் தயவு செய்து உதவுங்கள்",
        "Vietnamese": "xin chào làm ơn giúp tôi",
        "Turkish": "merhaba lütfen yardım edin",
    },
    "water": {
        "English": "water",
        "Spanish": "agua",
        "Japanese": "水",
        "Mandarin Chinese": "水",
        "Hindi": "पानी",
        "French": "eau",
        "German": "wasser",
        "Arabic": "ماء",
        "Portuguese": "água",
        "Korean": "물",
        "Italian": "acqua",
        "Russian": "вода",
        "Bengali": "জল",
        "Tamil": "தண்ணீர்",
        "Vietnamese": "nước",
        "Turkish": "su",
    },
    "yes": {
        "English": "yes",
        "Spanish": "sí",
        "Japanese": "はい",
        "Mandarin Chinese": "是",
        "Hindi": "हाँ",
        "French": "oui",
        "German": "ja",
        "Arabic": "نعم",
        "Portuguese": "sim",
        "Korean": "네",
        "Italian": "sì",
        "Russian": "да",
        "Bengali": "হ্যাঁ",
        "Tamil": "ஆம்",
        "Vietnamese": "vâng",
        "Turkish": "evet",
    },
    "no": {
        "English": "no",
        "Spanish": "no",
        "Japanese": "いいえ",
        "Mandarin Chinese": "不",
        "Hindi": "नहीं",
        "French": "non",
        "German": "nein",
        "Arabic": "لا",
        "Portuguese": "não",
        "Korean": "아니요",
        "Italian": "no",
        "Russian": "нет",
        "Bengali": "না",
        "Tamil": "இல்லை",
        "Vietnamese": "không",
        "Turkish": "hayır",
    },
}


class LocalModelManager:
    """Loads presets from models.json and switches both Onboarding SLM and Main Translator cleanly."""

    def __init__(self, config_path: Path, host_ram_gb: int = 8) -> None:
        self.config_path = config_path
        self.base_dir = config_path.parent
        self.host_ram_gb = host_ram_gb
        self.presets: Dict[str, ModelPreset] = {p.id: p for p in DEFAULT_PRESETS}
        self.slm_presets: Dict[str, SlmPreset] = {p.id: p for p in DEFAULT_SLM_PRESETS}
        self.active_id: str = "balanced"
        self.active_slm_id: str = "slm-fast"
        self.custom_gguf_path: Optional[str] = None
        self.slm_available: bool = True
        self._llama = None
        if config_path.exists():
            self.load_config()

    def resolve_path(self, path_str: str | Path) -> Path:
        return resolve_runtime_path(path_str, self.base_dir)

    def load_config(self) -> None:
        raw = json.loads(self.config_path.read_text(encoding="utf-8"))
        self.active_id = raw.get("activeTierId", "balanced")
        self.active_slm_id = raw.get("activeAssistantTierId", "slm-fast")
        self.custom_gguf_path = raw.get("customModelPath")
        self.host_ram_gb = int(raw.get("hostRamGb", self.host_ram_gb))
        self.slm_available = bool(raw.get("slmAvailable", True))
        installed_ids = set(raw.get("installedModelIds", ["slm-fast", "lightweight", "balanced"]))
        for pid, p in self.presets.items():
            p.installed = pid in installed_ids or self.resolve_path(p.model_file).exists()
        for sid, s in self.slm_presets.items():
            s.installed = sid in installed_ids or self.resolve_path(s.model_file).exists()

    def save_config(self) -> None:
        installed = [k for k, v in self.presets.items() if v.installed] + [
            k for k, v in self.slm_presets.items() if v.installed
        ]
        payload = {
            "activeTierId": self.active_id,
            "activeAssistantTierId": self.active_slm_id,
            "customModelPath": self.custom_gguf_path or "models/custom-local-model.gguf",
            "hostRamGb": self.host_ram_gb,
            "offlineOnlyMode": True,
            "slmAvailable": self.slm_available,
            "installedModelIds": installed,
        }
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        self.config_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def select_preset(self, preset_id: str) -> ModelPreset:
        if preset_id not in self.presets:
            raise ValueError(f"Unknown model preset: {preset_id}")
        self.active_id = preset_id
        self._llama = None
        return self.presets[preset_id]

    def select_slm_preset(self, slm_id: str) -> SlmPreset:
        if slm_id not in self.slm_presets:
            raise ValueError(f"Unknown SLM preset: {slm_id}")
        self.active_slm_id = slm_id
        return self.slm_presets[slm_id]

    def active_preset(self) -> ModelPreset:
        return self.presets.get(self.active_id, self.presets["balanced"])

    def active_slm_preset(self) -> SlmPreset:
        return self.slm_presets.get(self.active_slm_id, self.slm_presets["slm-fast"])

    def active_gguf_weights_present(self) -> bool:
        return self.resolve_path(self.active_preset().model_file).exists()

    def compatibility_status(self) -> Tuple[bool, str]:
        p = self.active_preset()
        s = self.active_slm_preset()
        if self.host_ram_gb < p.min_ram_gb or self.host_ram_gb < s.min_ram_gb:
            return False, f"Insufficient RAM: {p.model_name} ({p.min_ram_gb} GB) + {s.tier_label} exceed {self.host_ram_gb} GB"
        if self.host_ram_gb < p.recommended_ram_gb:
            return True, f"Slow performance warning: {p.recommended_ram_gb} GB RAM recommended"
        return True, f"Ready ({s.tier_label} + {p.tier_label}: {p.model_name})"

    def translate_offline(self, text: str, target_lang: str, source_lang: str = "English") -> str:
        trimmed = text.strip()
        if not trimmed or target_lang == source_lang:
            return trimmed

        model_path = self.resolve_path(self.active_preset().model_file)
        if not model_path.exists() and self.custom_gguf_path:
            custom_candidate = self.resolve_path(self.custom_gguf_path)
            if custom_candidate.exists():
                model_path = custom_candidate

        if model_path.exists():
            try:
                from llama_cpp import Llama  # type: ignore

                if self._llama is None:
                    self._llama = Llama(
                        model_path=str(model_path),
                        n_ctx=self.active_preset().context_length,
                        n_threads=4,
                        verbose=False,
                    )
                prompt = (
                    f"<start_of_turn>user\nTranslate from {source_lang} concisely to {target_lang} "
                    f"(translation only): {trimmed}\n<end_of_turn>\n<start_of_turn>model\n"
                )
                out = self._llama(prompt, max_tokens=160, stop=["<end_of_turn>"])
                generated = out["choices"][0]["text"].strip()
                if generated:
                    return generated
            except Exception:
                pass

        low = trimmed.lower()
        if low in OFFLINE_PHRASEBOOK and target_lang in OFFLINE_PHRASEBOOK[low]:
            return OFFLINE_PHRASEBOOK[low][target_lang]
        if target_lang == "English":
            return trimmed
        words = [OFFLINE_PHRASEBOOK.get(w, {}).get(target_lang, w) for w in low.split()]
        return " ".join(words)
