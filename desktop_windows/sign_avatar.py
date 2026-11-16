"""Offline sign-language landmark normalizer, calibration/lighting analyzer, SignBuffer, and fingerspelling avatar."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Tuple

CONFIDENCE_THRESHOLD = 0.80
CONSECUTIVE_FRAMES = 5
WORD_BOUNDARY_MS = 500


@dataclass
class HandCalibrationConfig:
    mirror_camera: bool = True
    hand_size_scale: float = 1.0
    lighting_min_luma: float = 48.0
    confidence_threshold: float = 0.80
    debounce_frames: int = 5


@dataclass
class HandTrackingFeedback:
    lighting_ok: bool
    hand_detected: bool
    guidance_message: str
    status: str  # "low-light" | "no-hand" | "unstable" | "locked"


def analyze_hand_frame_status(
    mean_luma: float,
    hand_present: bool,
    motion_delta: float,
    calib: Optional[HandCalibrationConfig] = None,
) -> HandTrackingFeedback:
    cfg = calib or HandCalibrationConfig()
    if mean_luma < cfg.lighting_min_luma:
        return HandTrackingFeedback(
            lighting_ok=False,
            hand_detected=hand_present,
            guidance_message="Lighting too low",
            status="low-light",
        )
    if not hand_present:
        return HandTrackingFeedback(
            lighting_ok=True,
            hand_detected=False,
            guidance_message="Move hands into frame",
            status="no-hand",
        )
    if motion_delta > 0.045:
        return HandTrackingFeedback(
            lighting_ok=True,
            hand_detected=True,
            guidance_message="Hold sign steady",
            status="unstable",
        )
    return HandTrackingFeedback(
        lighting_ok=True,
        hand_detected=True,
        guidance_message="Hand tracked cleanly",
        status="locked",
    )


def normalize_landmarks_63(landmarks: List[Tuple[float, float, float]]) -> List[float]:
    if len(landmarks) != 21:
        return [0.0] * 63
    wx, wy, wz = landmarks[0]
    max_dist = 1e-5
    shifted: List[Tuple[float, float, float]] = []
    for x, y, z in landmarks:
        dx, dy, dz = x - wx, y - wy, z - wz
        d = math.sqrt(dx * dx + dy * dy + dz * dz)
        if d > max_dist:
            max_dist = d
        shifted.append((dx, dy, dz))
    flat: List[float] = []
    for dx, dy, dz in shifted:
        flat.extend([dx / max_dist, dy / max_dist, dz / max_dist])
    return flat


class SignBuffer:
    def __init__(self, calib: Optional[HandCalibrationConfig] = None) -> None:
        self.calib = calib or HandCalibrationConfig()
        self.buffer: str = ""
        self._cand: Optional[str] = None
        self._streak: int = 0
        self._last_committed: Optional[str] = None
        self._last_seen_ms: Optional[int] = None
        self._space_sent: bool = False

    def push_letter(self, ch: str) -> None:
        self.buffer += ch.lower()

    def commit_word(self) -> None:
        if self.buffer and not self.buffer.endswith(" "):
            self.buffer += " "
        self._last_committed = None

    def backspace(self) -> None:
        self.buffer = self.buffer[:-1]
        self._last_committed = None

    def clear(self) -> None:
        self.buffer = ""
        self._cand = None
        self._streak = 0
        self._last_committed = None
        self._last_seen_ms = None
        self._space_sent = False

    def ingest_frame(self, detection: Optional[Tuple[str, float]], now_ms: int) -> Optional[str]:
        if detection is None:
            self._cand = None
            self._streak = 0
            if (
                self._last_seen_ms is not None
                and not self._space_sent
                and (now_ms - self._last_seen_ms) > WORD_BOUNDARY_MS
            ):
                self._space_sent = True
                if self.buffer and not self.buffer.endswith(" "):
                    self.commit_word()
                    return " "
            return None

        self._last_seen_ms = now_ms
        self._space_sent = False
        letter, conf = detection
        if conf < self.calib.confidence_threshold:
            self._cand = None
            self._streak = 0
            return None

        low = letter.lower()
        if self._cand == low:
            self._streak += 1
        else:
            self._cand = low
            self._streak = 1
            self._last_committed = None

        if self._streak >= self.calib.debounce_frames and self._last_committed != low:
            self.push_letter(low)
            self._last_committed = low
            return low
        return None


def text_to_sign_gloss_sequence(text: str) -> List[str]:
    """Converts normalized text to an ASL fingerspelling + gloss sequence for the 2D skeletal avatar."""
    seq: List[str] = []
    for ch in text.upper():
        if ch == " ":
            if seq and seq[-1] != "SPACE":
                seq.append("SPACE")
        elif "A" <= ch <= "Z":
            seq.append(ch)
    return seq
