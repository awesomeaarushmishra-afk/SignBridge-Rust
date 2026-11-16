"""Normalized Intermediate Representation (NormalizedIR) bidirectional router for offline Windows desktop."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

from braille_morse import (
    decode_braille_to_text,
    decode_morse_to_text,
    encode_text_to_braille,
    encode_text_to_morse,
)
from model_manager import OFFLINE_PHRASEBOOK, LocalModelManager
from sign_avatar import text_to_sign_gloss_sequence


@dataclass
class NormalizedIR:
    canonical_english: str
    source_text: str
    detected_language: str
    source_modality: str
    sign_glosses: List[str]


@dataclass
class ConversionResult:
    ir: NormalizedIR
    target_modality: str
    target_language: str
    output_text: str
    braille_unicode: str
    braille_brf: str
    morse_code: str
    sign_sequence: List[str]


def detect_language(text: str) -> str:
    t = text.strip()
    if not t:
        return "English"
    if re.search(r"[\u0900-\u097F]", t):
        return "Hindi"
    if re.search(r"[\u0980-\u09FF]", t):
        return "Bengali"
    if re.search(r"[\u0B80-\u0BFF]", t):
        return "Tamil"
    if re.search(r"[\u3040-\u30FF]", t):
        return "Japanese"
    if re.search(r"[\uAC00-\uD7AF\u1100-\u11FF]", t):
        return "Korean"
    if re.search(r"[\u4E00-\u9FFF]", t):
        return "Mandarin Chinese"
    if re.search(r"[\u0600-\u06FF]", t):
        return "Arabic"
    if re.search(r"[\u0400-\u04FF]", t):
        return "Russian"

    low = t.lower()
    if re.search(r"[ăâđêôơưàáảãạằắẳẵặầấẩẫậ]|\b(xin chào|cảm ơn|làm ơn|giúp tôi)\b", low):
        return "Vietnamese"
    if re.search(r"[çğıİöşü]|\b(merhaba|teşekkür|lütfen|yardım)\b", low):
        return "Turkish"
    if re.search(r"\b(hola|gracias|por favor|ayuda|agua|adiós|buenos)\b", low):
        return "Spanish"
    if re.search(r"\b(bonjour|merci|aide|eau|oui|au revoir)\b", low):
        return "French"
    if re.search(r"\b(hallo|danke|bitte|hilfe|wasser|nein)\b", low):
        return "German"
    if re.search(r"\b(olá|obrigado|ajuda|água|não)\b", low):
        return "Portuguese"
    if re.search(r"\b(ciao|grazie|per favore|aiuto|acqua)\b", low):
        return "Italian"
    return "English"


def reverse_to_english(text: str, source_lang: str) -> str:
    low = text.strip().lower()
    if not low or source_lang == "English":
        return text.strip()
    for eng, mapping in OFFLINE_PHRASEBOOK.items():
        if mapping.get(source_lang, "").lower() == low:
            return eng
    words = [
        next(
            (eng for eng, m in OFFLINE_PHRASEBOOK.items() if " " not in eng and m.get(source_lang, "").lower() == w),
            w,
        )
        for w in low.split()
    ]
    return " ".join(words)


def convert_bidirectional(
    raw_input: str,
    source_modality: str,
    target_modality: str,
    source_language: str,
    target_language: str,
    model_manager: LocalModelManager,
) -> ConversionResult:
    trimmed = raw_input.strip()
    plain = trimmed

    if source_modality == "braille":
        plain = decode_braille_to_text(trimmed)
    elif source_modality == "morse":
        if re.fullmatch(r"[.\-·−—_\s/]+", trimmed):
            plain = decode_morse_to_text(trimmed)
    elif source_modality == "sign":
        plain = trimmed

    detected = detect_language(plain) if source_language == "Auto-Detect" else source_language
    canonical_english = reverse_to_english(plain, detected)
    sign_glosses = text_to_sign_gloss_sequence(canonical_english)

    ir = NormalizedIR(
        canonical_english=canonical_english,
        source_text=plain,
        detected_language=detected,
        source_modality=source_modality,
        sign_glosses=sign_glosses,
    )

    if detected == target_language:
        translated = plain
    else:
        translated = model_manager.translate_offline(canonical_english, target_language, "English")

    braille_basis = canonical_english if target_language == "English" else translated
    braille_unicode, braille_brf = encode_text_to_braille(braille_basis)
    morse_code = encode_text_to_morse(braille_basis)
    sign_seq = text_to_sign_gloss_sequence(canonical_english)

    if target_modality == "braille":
        output_text = braille_unicode
    elif target_modality == "morse":
        output_text = morse_code
    elif target_modality == "sign":
        output_text = " ".join("·" if s == "SPACE" else s for s in sign_seq)
    else:
        output_text = translated

    return ConversionResult(
        ir=ir,
        target_modality=target_modality,
        target_language=target_language,
        output_text=output_text,
        braille_unicode=braille_unicode,
        braille_brf=braille_brf,
        morse_code=morse_code,
        sign_sequence=sign_seq,
    )
