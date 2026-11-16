"""Acceptance test suite covering bidirectional conversion, built-in SLM assistant, dual model switching, calibration, and fallback paths."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from braille_morse import (  # noqa: E402
    decode_braille_to_text,
    decode_morse_to_text,
    generate_morse_wav_bytes,
)
from model_manager import LocalModelManager  # noqa: E402
from onboarding_slm import AssistantContext, OnboardingSlmAssistant  # noqa: E402
from sign_avatar import (  # noqa: E402
    HandCalibrationConfig,
    SignBuffer,
    analyze_hand_frame_status,
    normalize_landmarks_63,
)
from translator_core import convert_bidirectional  # noqa: E402


class TestOfflineAcceptanceSuite(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.cfg_path = Path(self.tmp.name) / "models.json"
        self.cfg_path.write_text(
            json.dumps(
                {
                    "activeTierId": "balanced",
                    "activeAssistantTierId": "slm-fast",
                    "hostRamGb": 8,
                    "offlineOnlyMode": True,
                    "slmAvailable": True,
                }
            ),
            encoding="utf-8",
        )
        self.mgr = LocalModelManager(self.cfg_path, host_ram_gb=8)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_spoken_to_text_and_spoken_translation(self) -> None:
        res = convert_bidirectional("hello", "text", "text", "English", "Spanish", self.mgr)
        self.assertEqual(res.ir.canonical_english, "hello")
        self.assertEqual(res.output_text, "hola")

        rev = convert_bidirectional("hola", "text", "text", "Auto-Detect", "English", self.mgr)
        self.assertEqual(rev.ir.detected_language, "Spanish")
        self.assertEqual(rev.output_text, "hello")

    def test_spoken_bidirectional_braille_and_brf(self) -> None:
        res = convert_bidirectional("help", "text", "braille", "English", "English", self.mgr)
        self.assertEqual(res.output_text, "⠓⠑⠇⠏")
        self.assertEqual(res.braille_brf, "HELP")

        rev = convert_bidirectional("⠓⠑⠇⠏", "braille", "text", "Auto-Detect", "English", self.mgr)
        self.assertEqual(rev.output_text, "help")

    def test_spoken_bidirectional_morse_and_wav_export(self) -> None:
        res = convert_bidirectional("sos", "text", "morse", "English", "English", self.mgr)
        self.assertEqual(res.morse_code, "... --- ...")
        wav = generate_morse_wav_bytes(res.morse_code)
        self.assertEqual(wav[:4], b"RIFF")
        self.assertGreater(len(wav), 2000)

        rev = convert_bidirectional("... --- ...", "morse", "text", "Auto-Detect", "English", self.mgr)
        self.assertEqual(rev.output_text, "sos")

    def test_cross_modal_braille_morse_sign(self) -> None:
        b_to_m = convert_bidirectional("⠓⠑⠇⠏", "braille", "morse", "English", "English", self.mgr)
        self.assertEqual(b_to_m.output_text, ".... . .-.. .--.")
        m_to_b = convert_bidirectional(".... . .-.. .--.", "morse", "braille", "English", "English", self.mgr)
        self.assertEqual(m_to_b.output_text, "⠓⠑⠇⠏")
        s_to_b = convert_bidirectional("sos", "sign", "braille", "English", "English", self.mgr)
        self.assertEqual(decode_braille_to_text(s_to_b.output_text), "sos")
        s_to_m = convert_bidirectional("sos", "sign", "morse", "English", "English", self.mgr)
        self.assertEqual(decode_morse_to_text(s_to_m.output_text), "sos")

    def test_dual_model_switching_and_ram_warnings(self) -> None:
        self.mgr.select_slm_preset("slm-reasoning")
        self.mgr.select_preset("high-quality")
        self.assertEqual(self.mgr.active_slm_preset().id, "slm-reasoning")
        self.assertEqual(self.mgr.active_preset().id, "high-quality")

        self.mgr.host_ram_gb = 4
        ok_hq, msg = self.mgr.compatibility_status()
        self.assertFalse(ok_hq)
        self.assertIn("Insufficient RAM", msg)

        self.mgr.save_config()
        reloaded = LocalModelManager(self.cfg_path, host_ram_gb=4)
        self.assertEqual(reloaded.active_slm_id, "slm-reasoning")
        self.assertEqual(reloaded.active_id, "high-quality")

    def test_onboarding_slm_context_and_static_fallback(self) -> None:
        assistant = OnboardingSlmAssistant()
        ctx = AssistantContext(
            active_screen="workbench",
            source_modality="text",
            target_modality="braille",
            source_language="English",
            target_language="English",
            slm_available=True,
            slm_preset=self.mgr.active_slm_preset(),
        )
        reply_braille = assistant.answer("How do I translate English to Braille?", ctx)
        self.assertTrue(reply_braille.is_guidance_only)
        self.assertFalse(reply_braille.is_static_fallback)
        self.assertTrue(any("Braille" in s for s in reply_braille.steps))

        reply_morse = assistant.answer("How do I switch to Morse input?", ctx)
        self.assertTrue(any("Morse" in s for s in reply_morse.steps))

        reply_hand = assistant.answer("How do I enable hand tracking?", ctx)
        self.assertTrue(any("Sign Language" in s or "hand" in s.lower() for s in reply_hand.steps))

        # Static help fallback when SLM unavailable does not fail or block
        ctx_off = AssistantContext(**{**ctx.__dict__, "slm_available": False})
        reply_fallback = assistant.answer("How do I change models?", ctx_off)
        self.assertTrue(reply_fallback.is_static_fallback)
        self.assertGreater(len(reply_fallback.steps), 0)

    def test_hand_tracking_calibration_and_sign_buffer(self) -> None:
        calib = HandCalibrationConfig(lighting_min_luma=50.0, confidence_threshold=0.82, debounce_frames=4)
        self.assertEqual(analyze_hand_frame_status(30.0, True, 0.01, calib).guidance_message, "Lighting too low")
        self.assertEqual(analyze_hand_frame_status(120.0, False, 0.0, calib).guidance_message, "Move hands into frame")
        self.assertEqual(analyze_hand_frame_status(120.0, True, 0.08, calib).guidance_message, "Hold sign steady")
        self.assertEqual(analyze_hand_frame_status(120.0, True, 0.01, calib).guidance_message, "Hand tracked cleanly")

        pts = [(1.0 + i * 0.1, 2.0 + i * 0.05, 0.0) for i in range(21)]
        norm = normalize_landmarks_63(pts)
        self.assertEqual(len(norm), 63)
        self.assertEqual(norm[:3], [0.0, 0.0, 0.0])

        buf = SignBuffer(calib=calib)
        for f in range(4):
            buf.ingest_frame(("a", 0.90), f * 70)
        self.assertEqual(buf.buffer, "a")
        buf.ingest_frame(None, 900)
        self.assertEqual(buf.buffer, "a ")

    def test_frozen_exe_path_resolution_and_16_languages(self) -> None:
        from unittest.mock import patch
        import model_manager as mm

        fake_exe = Path(self.tmp.name) / "SignBridgeOffline.exe"
        fake_exe.write_text("", encoding="utf-8")
        models_dir = Path(self.tmp.name) / "models"
        models_dir.mkdir(exist_ok=True)
        fake_gguf = models_dir / "qwen2.5-0.5b-instruct-q4_k_m.gguf"
        fake_gguf.write_text("dummy", encoding="utf-8")

        with patch.object(sys, "frozen", True, create=True), patch.object(sys, "executable", str(fake_exe)):
            self.assertEqual(mm.get_app_dir(), Path(self.tmp.name).resolve())
            resolved = mm.resolve_runtime_path("models/qwen2.5-0.5b-instruct-q4_k_m.gguf")
            self.assertEqual(resolved, fake_gguf.resolve())

        ja_res = convert_bidirectional("hello", "text", "text", "English", "Japanese", self.mgr)
        self.assertEqual(ja_res.output_text, "こんにちは")

        ar_rev = convert_bidirectional("مرحبا", "text", "text", "Auto-Detect", "Spanish", self.mgr)
        self.assertEqual(ar_rev.ir.detected_language, "Arabic")
        self.assertEqual(ar_rev.output_text, "hola")


if __name__ == "__main__":
    unittest.main()
