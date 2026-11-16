import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASL_ALPHABET_SPECS,
  SignBuffer,
  classifyAslLandmarks,
  generateAslLetterLandmarks,
  normalizeLandmarksTo63,
} from './aslClassifier';
import { MORSE_BRAILLE_REFERENCE_TABLE } from './referenceTableData';

test('normalizeLandmarksTo63 places wrist at origin and scales by max distance across 21 points', () => {
  const raw = generateAslLetterLandmarks('A', 0);
  const shifted = raw.map((pt) => ({ x: pt.x + 1.5, y: pt.y - 0.7, z: pt.z + 0.3 }));
  const scaled = raw.map((pt) => ({ x: pt.x * 3.2, y: pt.y * 3.2, z: pt.z * 3.2 }));

  const vRaw = normalizeLandmarksTo63(raw);
  const vShifted = normalizeLandmarksTo63(shifted);
  const vScaled = normalizeLandmarksTo63(scaled);

  assert.equal(vRaw.length, 63);
  assert.equal(vRaw[0], 0);
  assert.equal(vRaw[1], 0);
  assert.equal(vRaw[2], 0);

  // Translation invariance
  for (let i = 0; i < 63; i++) {
    assert.ok(Math.abs(vRaw[i] - vShifted[i]) < 1e-5);
  }

  // Max Euclidean radius across all 21 points is 1.0
  let maxRadius = 0;
  for (let i = 0; i < 21; i++) {
    const r = Math.hypot(vScaled[i * 3], vScaled[i * 3 + 1], vScaled[i * 3 + 2]);
    if (r > maxRadius) maxRadius = r;
  }
  assert.ok(Math.abs(maxRadius - 1.0) < 1e-5);
});

test('ASL A-Z classifier identifies all 26 letters above 0.80 and rejects malformed frames', () => {
  for (const spec of ASL_ALPHABET_SPECS) {
    const frame = generateAslLetterLandmarks(spec.letter, 0.25);
    const res = classifyAslLandmarks(frame);
    assert.equal(res.letter, spec.letter, `Expected ${spec.letter}, got ${res.letter}`);
    assert.ok(res.confidence >= 0.80, `Expected confidence >= 0.80 for ${spec.letter}, got ${res.confidence}`);
    assert.equal(res.accepted, true);
  }

  // Random/collapsed non-ASL hand should fail confidence >= 0.80 gate
  const invalid = Array.from({ length: 21 }, (_, idx) => ({
    x: 0.5 + (idx % 3) * 0.01,
    y: 0.5 - idx * 0.002,
    z: 0.2 * (idx % 2),
  }));
  const rejected = classifyAslLandmarks(invalid);
  assert.equal(rejected.accepted, false);
});

test('SignBuffer debounces 5 consecutive frames, emits abc for A-B-C, and inserts space after > 500ms', () => {
  const sb = new SignBuffer();
  let t = 0;
  const stepMs = 66; // ~15 FPS

  // 4 frames of A -> should NOT commit yet
  for (let i = 0; i < 4; i++) {
    t += stepMs;
    assert.equal(sb.ingestFrame({ letter: 'A', confidence: 0.92 }, t), null);
  }
  assert.equal(sb.text, '');

  // 5th frame of A -> commits 'a' once
  t += stepMs;
  assert.equal(sb.ingestFrame({ letter: 'A', confidence: 0.92 }, t), 'a');
  // 6th frame of A -> does NOT duplicate
  t += stepMs;
  assert.equal(sb.ingestFrame({ letter: 'A', confidence: 0.92 }, t), null);

  // Perform B for 5 frames -> 'ab'
  for (let i = 0; i < 5; i++) {
    t += stepMs;
    sb.ingestFrame({ letter: 'B', confidence: 0.91 }, t);
  }

  // Low-confidence frame (<0.80) rejected
  t += stepMs;
  assert.equal(sb.ingestFrame({ letter: 'Z', confidence: 0.54 }, t), null);

  // Perform C for 5 frames -> 'abc'
  for (let i = 0; i < 5; i++) {
    t += stepMs;
    sb.ingestFrame({ letter: 'C', confidence: 0.95 }, t);
  }
  assert.equal(sb.text, 'abc');

  // Hand disappears for > 500 ms -> inserts word boundary space
  t += 550;
  assert.equal(sb.ingestFrame(null, t), ' ');
  assert.equal(sb.text, 'abc ');

  sb.backspace();
  assert.equal(sb.text, 'abc');
  sb.clear();
  assert.equal(sb.text, '');
});

test('MORSE_BRAILLE_REFERENCE_TABLE contains all 26 A-Z entries with exact notations', () => {
  assert.equal(MORSE_BRAILLE_REFERENCE_TABLE.length, 26);
  const byLetter = Object.fromEntries(MORSE_BRAILLE_REFERENCE_TABLE.map((r) => [r.letter, r]));
  assert.deepEqual(byLetter.A, { letter: 'A', brailleDots: '1', brailleUnicode: '⠁', morse: '·−' });
  assert.deepEqual(byLetter.Q, { letter: 'Q', brailleDots: '1,2,3,4,5', brailleUnicode: '⠟', morse: '−−·−' });
  assert.deepEqual(byLetter.Z, { letter: 'Z', brailleDots: '1,3,5,6', brailleUnicode: '⠵', morse: '−−··' });
});

test('Classifier handles mirrored (left/right) hands and SignBuffer emits zero letters without a hand', () => {
  const sampleLetters = ['A', 'B', 'C', 'L', 'V', 'Y', 'O'];
  for (const letter of sampleLetters) {
    const frame = generateAslLetterLandmarks(letter, 0);
    const mirrored = frame.map((pt) => ({ x: 1 - pt.x, y: pt.y, z: pt.z }));
    const res = classifyAslLandmarks(mirrored);
    assert.equal(res.letter, letter, `Expected mirrored ${letter}, got ${res.letter}`);
    assert.ok(res.confidence >= 0.8, `Expected confidence >= 0.8 for mirrored ${letter}, got ${res.confidence}`);
  }

  const sb = new SignBuffer();
  for (let i = 0; i < 30; i++) {
    assert.equal(sb.ingestFrame(null, (i + 1) * 66), null);
  }
  assert.equal(sb.text, '');
});

