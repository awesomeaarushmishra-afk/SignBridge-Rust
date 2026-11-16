import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeTextToBrf,
  decodeBrfToText,
  decodeUnicodeBrailleToText,
  generateMorseWavBytes,
} from './brfAndWav';
import {
  detectSpokenLanguage,
  convertBidirectionalOffline,
  textToSignFingerspellSequence,
} from './offlineTranslator';
import {
  LOCAL_MODEL_PRESETS,
  ONBOARDING_SLM_PRESETS,
  checkDualModelCompatibility,
  checkModelCompatibility,
} from './modelPresets';
import { answerOnboardingQuestion } from './onboardingSlm';
import {
  DEFAULT_HAND_CALIBRATION,
  analyzeVideoFrameMetrics,
  buildCalibratedLandmarks,
} from './localHandTracker';

test('Braille Unicode and BRF round-trip offline', () => {
  const { unicode, brf } = encodeTextToBrf('hello 42');
  assert.equal(decodeUnicodeBrailleToText(unicode), 'hello 42');
  assert.equal(decodeBrfToText(brf), 'hello 42');
  assert.equal(encodeTextToBrf('sos').brf, 'SOS');
});

test('Morse WAV export builds valid 16-bit mono RIFF PCM header and payload', () => {
  const wav = generateMorseWavBytes('... --- ...');
  const header = String.fromCharCode(...wav.slice(0, 4));
  const waveTag = String.fromCharCode(...wav.slice(8, 12));
  assert.equal(header, 'RIFF');
  assert.equal(waveTag, 'WAVE');
  assert.ok(wav.byteLength > 2000);
});

test('Offline NormalizedIR converts between Text, Braille, Morse, and Sign in all directions', () => {
  const spanishToEn = convertBidirectionalOffline({
    rawInput: 'gracias',
    sourceModality: 'text',
    targetModality: 'text',
    sourceLanguage: 'Auto-Detect',
    targetLanguage: 'English',
    modelPresetLabel: 'Gemma 4 E4B',
  });
  assert.equal(spanishToEn.ir.detectedLanguage, 'Spanish');
  assert.equal(spanishToEn.outputText, 'thank you');

  const textToBraille = convertBidirectionalOffline({
    rawInput: 'help',
    sourceModality: 'text',
    targetModality: 'braille',
    sourceLanguage: 'English',
    targetLanguage: 'English',
    modelPresetLabel: 'Gemma 4 E4B',
  });
  assert.equal(textToBraille.brailleBrf, 'HELP');

  const brailleToMorse = convertBidirectionalOffline({
    rawInput: textToBraille.brailleUnicode,
    sourceModality: 'braille',
    targetModality: 'morse',
    sourceLanguage: 'English',
    targetLanguage: 'English',
    modelPresetLabel: 'Gemma 4 E4B',
  });
  assert.equal(brailleToMorse.outputText, '.... . .-.. .--.');

  const morseToSign = convertBidirectionalOffline({
    rawInput: '.- -... -.-.',
    sourceModality: 'morse',
    targetModality: 'sign',
    sourceLanguage: 'English',
    targetLanguage: 'English',
    modelPresetLabel: 'Gemma 4 E4B',
  });
  assert.deepEqual(morseToSign.signSequence, ['A', 'B', 'C']);

  const signToBraille = convertBidirectionalOffline({
    rawInput: 'sos',
    sourceModality: 'sign',
    targetModality: 'braille',
    sourceLanguage: 'English',
    targetLanguage: 'English',
    modelPresetLabel: 'Gemma 4 E4B',
  });
  assert.equal(decodeUnicodeBrailleToText(signToBraille.outputText), 'sos');
});

test('Language detection and sign fingerspelling sequence helpers', () => {
  assert.equal(detectSpokenLanguage('bonjour merci'), 'French');
  assert.equal(detectSpokenLanguage('नमस्ते'), 'Hindi');
  assert.deepEqual(textToSignFingerspellSequence('a b'), ['A', 'SPACE', 'B']);
});

test('Swappable SLM and translation presets enforce RAM & installed status checks', () => {
  const slmFast = ONBOARDING_SLM_PRESETS.find((p) => p.id === 'slm-fast')!;
  const slmReason = ONBOARDING_SLM_PRESETS.find((p) => p.id === 'slm-reasoning')!;
  const lightweight = LOCAL_MODEL_PRESETS.find((p) => p.id === 'lightweight')!;
  const hq = LOCAL_MODEL_PRESETS.find((p) => p.id === 'high-quality')!;

  assert.equal(checkModelCompatibility(lightweight, 4).compatible, true);
  assert.equal(checkModelCompatibility(hq, 4).compatible, false);

  const dualOk = checkDualModelCompatibility(slmFast, lightweight, 8, ['slm-fast', 'lightweight']);
  assert.equal(dualOk.compatible, true);
  assert.equal(dualOk.level, 'nominal');

  const dualWarn = checkDualModelCompatibility(slmReason, hq, 4, ['slm-fast', 'lightweight']);
  assert.equal(dualWarn.compatible, false);
  assert.equal(dualWarn.level, 'incompatible');
});

test('Built-in offline SLM answers navigation questions with context & static fallback', () => {
  const slmReasoning = ONBOARDING_SLM_PRESETS.find((p) => p.id === 'slm-reasoning')!;
  const ctx = {
    activeSection: 'workbench',
    sourceModality: 'text' as const,
    targetModality: 'braille' as const,
    sourceLanguage: 'Auto-Detect' as const,
    targetLanguage: 'English' as const,
    cameraActive: false,
    slmAvailable: true,
    assistantPreset: slmReasoning,
  };

  const brailleHelp = answerOnboardingQuestion('How do I translate English to Braille?', ctx);
  assert.equal(brailleHelp.isGuidanceOnly, true);
  assert.equal(brailleHelp.isStaticFallback, false);
  assert.ok(brailleHelp.steps.some((s) => s.includes('Braille')));

  const handHelp = answerOnboardingQuestion('How do I enable hand tracking?', ctx);
  assert.ok(handHelp.steps.some((s) => s.includes('Calibrate')));

  const fallbackReply = answerOnboardingQuestion('How do I change models?', {
    ...ctx,
    slmAvailable: false,
  });
  assert.equal(fallbackReply.isStaticFallback, true);
  assert.ok(fallbackReply.engineLabel.includes('Static Offline Help'));
});

test('Local hand tracker detects low lighting, no-hand, unstable motion, and locked tracking', () => {
  const w = 16;
  const h = 16;
  // Dark frame -> Lighting too low
  const darkPixels = new Uint8ClampedArray(w * h * 4).fill(10);
  const darkRes = analyzeVideoFrameMetrics(darkPixels, w, h, null, DEFAULT_HAND_CALIBRATION);
  assert.equal(darkRes.guidanceMessage, 'Lighting too low');

  // Bright non-skin gray frame -> Move hands into frame
  const grayPixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < grayPixels.length; i += 4) {
    grayPixels[i] = 160;
    grayPixels[i + 1] = 160;
    grayPixels[i + 2] = 160;
    grayPixels[i + 3] = 255;
  }
  const noHandRes = analyzeVideoFrameMetrics(grayPixels, w, h, null, DEFAULT_HAND_CALIBRATION);
  assert.equal(noHandRes.guidanceMessage, 'Move hands into frame');

  // Bright skin-tone region steady vs moving
  const handPixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const inCenter = x >= 4 && x <= 11 && y >= 4 && y <= 11;
      handPixels[idx] = inCenter ? 210 : 120;
      handPixels[idx + 1] = inCenter ? 150 : 120;
      handPixels[idx + 2] = inCenter ? 120 : 120;
      handPixels[idx + 3] = 255;
    }
  }
  const unstable = analyzeVideoFrameMetrics(
    handPixels,
    w,
    h,
    { x: 0.1, y: 0.1 },
    DEFAULT_HAND_CALIBRATION
  );
  assert.equal(unstable.guidanceMessage, 'Hold sign steady');

  const locked = analyzeVideoFrameMetrics(
    handPixels,
    w,
    h,
    { x: unstable.centroidX, y: unstable.centroidY },
    DEFAULT_HAND_CALIBRATION
  );
  assert.equal(locked.guidanceMessage, 'Hand tracked cleanly');

  const scaled = buildCalibratedLandmarks('A', locked.centroidX, locked.centroidY, DEFAULT_HAND_CALIBRATION, 0);
  assert.equal(scaled.length, 21);
});
