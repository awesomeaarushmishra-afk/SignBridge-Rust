import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dotsToMask,
  decodeBrailleMasks,
  encodeTextToBrailleMasks,
  maskToUnicodeBraille,
} from './brailleDecoder';
import {
  classifyPressDuration,
  decodeMorseSequence,
  encodeTextToMorse,
  getMorseTimingConfig,
} from './morseDecoder';
import {
  classifySignGesture,
  generateSignLandmarkFrame,
  normalizeHandLandmarks,
  SIGN_VOCABULARY,
} from './signClassifier';

test('Braille 6-dot mask encoding and decoding handles words, capitals, and digits', () => {
  const h = dotsToMask([1, 2, 5]);
  const i = dotsToMask([2, 4]);
  assert.equal(maskToUnicodeBraille(h), '⠓');
  assert.equal(decodeBrailleMasks([h, i]).text, 'hi');

  const roundTrip = encodeTextToBrailleMasks('Help 42!');
  assert.equal(decodeBrailleMasks(roundTrip).text, 'Help 42!');
});

test('Morse code decoder handles letters, words, and PARIS timing classification', () => {
  assert.equal(decodeMorseSequence('.... . .-.. .-.. --- / .-- --- .-. .-.. -..'), 'HELLO WORLD');
  assert.equal(encodeTextToMorse('HELP ME'), '.... . .-.. .--. / -- .');

  const cfg = getMorseTimingConfig(15); // dot = 80ms, dash threshold = 176ms
  assert.equal(cfg.dotUnitMs, 80);
  assert.equal(classifyPressDuration(90, 15), '.');
  assert.equal(classifyPressDuration(230, 15), '-');
});

test('MediaPipe landmark normalization is translation-invariant and sign classifier identifies vocabulary', () => {
  const { hand, pose } = generateSignLandmarkFrame('HELLO', 0.25);
  const norm = normalizeHandLandmarks(hand);
  assert.equal(norm[0].x, 0);
  assert.equal(norm[0].y, 0);
  assert.equal(norm[0].z, 0);

  const result = classifySignGesture(hand, pose);
  assert.equal(result.sign, 'HELLO');
  assert.ok(result.confidence > 0.75);

  for (const sign of SIGN_VOCABULARY) {
    const frame = generateSignLandmarkFrame(sign, 0.5);
    const classified = classifySignGesture(frame.hand, frame.pose);
    assert.equal(classified.sign, sign, `Expected generated frame for ${sign} to classify as ${sign}, got ${classified.sign}`);
  }
});
