"""Offline Grade-1 Braille (Unicode + BRF) and ITU Morse encoder/decoder + PCM WAV exporter."""

from __future__ import annotations

import io
import math
import struct
import wave
from typing import Dict, List, Tuple

MASK_TO_BRF: List[str] = [
    " ", "A", "1", "B", "'", "K", "2", "L",
    "@", "C", "I", "F", "/", "M", "S", "P",
    '"', "E", "3", "H", "9", "O", "6", "R",
    "^", "D", "J", "G", ">", "N", "T", "Q",
    ",", "*", "5", "<", "-", "U", "8", "V",
    ".", "%", "[", "$", "+", "X", "!", "&",
    ";", ":", "4", "\\", "0", "Z", "7", "(",
    "_", "?", "W", "]", "#", "Y", ")", "=",
]
BRF_TO_MASK: Dict[str, int] = {ch: idx for idx, ch in enumerate(MASK_TO_BRF)}

NUMBER_SIGN_MASK = 0b111100  # dots 3,4,5,6
CAPITAL_SIGN_MASK = 0b100000  # dot 6


def dots_to_mask(dots: List[int]) -> int:
    mask = 0
    for d in dots:
        if 1 <= d <= 6:
            mask |= 1 << (d - 1)
    return mask


LETTER_TO_MASK: Dict[str, int] = {
    "a": dots_to_mask([1]),
    "b": dots_to_mask([1, 2]),
    "c": dots_to_mask([1, 4]),
    "d": dots_to_mask([1, 4, 5]),
    "e": dots_to_mask([1, 5]),
    "f": dots_to_mask([1, 2, 4]),
    "g": dots_to_mask([1, 2, 4, 5]),
    "h": dots_to_mask([1, 2, 5]),
    "i": dots_to_mask([2, 4]),
    "j": dots_to_mask([2, 4, 5]),
    "k": dots_to_mask([1, 3]),
    "l": dots_to_mask([1, 2, 3]),
    "m": dots_to_mask([1, 3, 4]),
    "n": dots_to_mask([1, 3, 4, 5]),
    "o": dots_to_mask([1, 3, 5]),
    "p": dots_to_mask([1, 2, 3, 4]),
    "q": dots_to_mask([1, 2, 3, 4, 5]),
    "r": dots_to_mask([1, 2, 3, 5]),
    "s": dots_to_mask([2, 3, 4]),
    "t": dots_to_mask([2, 3, 4, 5]),
    "u": dots_to_mask([1, 3, 6]),
    "v": dots_to_mask([1, 2, 3, 6]),
    "w": dots_to_mask([2, 4, 5, 6]),
    "x": dots_to_mask([1, 3, 4, 6]),
    "y": dots_to_mask([1, 3, 4, 5, 6]),
    "z": dots_to_mask([1, 3, 5, 6]),
}
MASK_TO_LETTER: Dict[int, str] = {m: ch for ch, m in LETTER_TO_MASK.items()}

PUNCT_TO_MASK: Dict[str, int] = {
    ",": dots_to_mask([2]),
    ";": dots_to_mask([2, 3]),
    ":": dots_to_mask([2, 5]),
    ".": dots_to_mask([2, 5, 6]),
    "!": dots_to_mask([2, 3, 5]),
    "?": dots_to_mask([2, 3, 6]),
    "-": dots_to_mask([3, 6]),
    "'": dots_to_mask([3]),
}
MASK_TO_PUNCT: Dict[int, str] = {m: ch for ch, m in PUNCT_TO_MASK.items()}

DIGIT_TO_LETTER: Dict[str, str] = {
    "1": "a", "2": "b", "3": "c", "4": "d", "5": "e",
    "6": "f", "7": "g", "8": "h", "9": "i", "0": "j",
}
LETTER_TO_DIGIT: Dict[str, str] = {v: k for k, v in DIGIT_TO_LETTER.items()}

MORSE_TABLE: Dict[str, str] = {
    ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E",
    "..-.": "F", "--.": "G", "....": "H", "..": "I", ".---": "J",
    "-.-": "K", ".-..": "L", "--": "M", "-.": "N", "---": "O",
    ".--.": "P", "--.-": "Q", ".-.": "R", "...": "S", "-": "T",
    "..-": "U", "...-": "V", ".--": "W", "-..-": "X", "-.--": "Y",
    "--..": "Z",
    "-----": "0", ".----": "1", "..---": "2", "...--": "3", "....-": "4",
    ".....": "5", "-....": "6", "--...": "7", "---..": "8", "----.": "9",
    ".-.-.-": ".", "--..--": ",", "..--..": "?", "-.-.--": "!",
}
CHAR_TO_MORSE: Dict[str, str] = {v: k for k, v in MORSE_TABLE.items()}


def encode_text_to_braille(text: str) -> Tuple[str, str]:
    masks: List[int] = []
    in_number = False
    for ch in text:
        if ch == " ":
            masks.append(0)
            in_number = False
            continue
        if "0" <= ch <= "9":
            if not in_number:
                masks.append(NUMBER_SIGN_MASK)
                in_number = True
            masks.append(LETTER_TO_MASK[DIGIT_TO_LETTER[ch]])
            continue
        in_number = False
        low = ch.lower()
        if low in LETTER_TO_MASK:
            if ch != low:
                masks.append(CAPITAL_SIGN_MASK)
            masks.append(LETTER_TO_MASK[low])
        elif ch in PUNCT_TO_MASK:
            masks.append(PUNCT_TO_MASK[ch])

    unicode_out = "".join(chr(0x2800 + (m & 0x3F)) for m in masks)
    brf_out = "".join(MASK_TO_BRF[m & 0x3F] for m in masks)
    return unicode_out, brf_out


def decode_braille_masks(masks: List[int]) -> str:
    out: List[str] = []
    number_mode = False
    cap_next = False
    for raw in masks:
        cell = raw & 0x3F
        if cell == 0:
            out.append(" ")
            number_mode = False
            cap_next = False
        elif cell == NUMBER_SIGN_MASK:
            number_mode = True
            cap_next = False
        elif cell == CAPITAL_SIGN_MASK:
            cap_next = True
            number_mode = False
        elif cell in MASK_TO_LETTER:
            letter = MASK_TO_LETTER[cell]
            if number_mode and letter in LETTER_TO_DIGIT:
                out.append(LETTER_TO_DIGIT[letter])
            else:
                number_mode = False
                out.append(letter.upper() if cap_next else letter)
                cap_next = False
        elif cell in MASK_TO_PUNCT:
            number_mode = False
            cap_next = False
            out.append(MASK_TO_PUNCT[cell])
    return "".join(out)


def decode_braille_to_text(braille_text: str) -> str:
    if any(0x2800 <= ord(ch) <= 0x283F for ch in braille_text):
        masks = [ord(ch) - 0x2800 if 0x2800 <= ord(ch) <= 0x283F else 0 for ch in braille_text]
    else:
        masks = [BRF_TO_MASK.get(ch.upper(), 0) for ch in braille_text]
    return decode_braille_masks(masks)


def encode_text_to_morse(text: str) -> str:
    words = text.upper().strip().split()
    encoded_words: List[str] = []
    for w in words:
        tokens = [CHAR_TO_MORSE[c] for c in w if c in CHAR_TO_MORSE]
        if tokens:
            encoded_words.append(" ".join(tokens))
    return " / ".join(encoded_words)


def decode_morse_to_text(morse: str) -> str:
    norm = morse.strip().replace("·", ".").replace("−", "-").replace("—", "-")
    if not norm:
        return ""
    words = [w.strip() for w in norm.split("/")]
    decoded_words: List[str] = []
    for w in words:
        chars = [MORSE_TABLE.get(tok, "?") for tok in w.split() if tok]
        if chars:
            decoded_words.append("".join(chars))
    return " ".join(decoded_words).lower()


def generate_morse_wav_bytes(morse: str, wpm: int = 14, freq_hz: int = 650) -> bytes:
    sample_rate = 22050
    dot_ms = 1200.0 / max(5, min(40, wpm))
    dot_samples = int((dot_ms / 1000.0) * sample_rate)
    norm = morse.strip().replace("·", ".").replace("−", "-").replace("—", "-")

    pcm: List[int] = []
    for ch in norm:
        if ch == ".":
            for i in range(dot_samples):
                pcm.append(int(math.sin(2 * math.pi * freq_hz * i / sample_rate) * 0.45 * 32767))
            pcm.extend([0] * dot_samples)
        elif ch == "-":
            for i in range(dot_samples * 3):
                pcm.append(int(math.sin(2 * math.pi * freq_hz * i / sample_rate) * 0.45 * 32767))
            pcm.extend([0] * dot_samples)
        elif ch == " ":
            pcm.extend([0] * (dot_samples * 2))
        elif ch == "/":
            pcm.extend([0] * (dot_samples * 4))

    if not pcm:
        pcm = [0] * (sample_rate // 4)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack("<" + "h" * len(pcm), *pcm))
    return buf.getvalue()
