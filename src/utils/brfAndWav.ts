import { decodeBrailleMasks, encodeTextToBrailleMasks, maskToUnicodeBraille } from './brailleDecoder';
import { getMorseTimingConfig } from './morseDecoder';

// Standard North American / UEB ASCII Braille Ready Format (BRF) table for 6-bit mask 0..63
const MASK_TO_BRF: string[] = [
  ' ', 'A', '1', 'B', "'", 'K', '2', 'L',
  '@', 'C', 'I', 'F', '/', 'M', 'S', 'P',
  '"', 'E', '3', 'H', '9', 'O', '6', 'R',
  '^', 'D', 'J', 'G', '>', 'N', 'T', 'Q',
  ',', '*', '5', '<', '-', 'U', '8', 'V',
  '.', '%', '[', '$', '+', 'X', '!', '&',
  ';', ':', '4', '\\', '0', 'Z', '7', '(',
  '_', '?', 'W', ']', '#', 'Y', ')', '=',
];

const BRF_TO_MASK: Record<string, number> = Object.fromEntries(
  MASK_TO_BRF.map((ch, mask) => [ch, mask])
);

export function encodeTextToBrf(text: string): { unicode: string; brf: string } {
  const folded = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const masks = encodeTextToBrailleMasks(folded);
  const unicode = masks.map((m) => maskToUnicodeBraille(m)).join('');
  const brf = masks.map((m) => MASK_TO_BRF[m & 0x3f] ?? ' ').join('');
  return { unicode, brf };
}

export function decodeBrfToText(brf: string): string {
  const masks = Array.from(brf.toUpperCase()).map((ch) => BRF_TO_MASK[ch] ?? 0);
  return decodeBrailleMasks(masks).text;
}

export function decodeUnicodeBrailleToText(unicodeBraille: string): string {
  const masks: number[] = [];
  for (const ch of unicodeBraille) {
    const code = ch.charCodeAt(0);
    if (code >= 0x2800 && code <= 0x283f) {
      masks.push(code - 0x2800);
    } else if (ch === ' ') {
      masks.push(0);
    }
  }
  return decodeBrailleMasks(masks).text;
}

/**
 * Generates an uncompressed 16-bit PCM mono WAV file (Uint8Array) for any Morse sequence.
 * Enables 100% offline audio export (.wav) in both browser and desktop workflows.
 */
export function generateMorseWavBytes(morse: string, wpm = 14, freqHz = 650): Uint8Array {
  const sampleRate = 22050;
  const { dotUnitMs } = getMorseTimingConfig(wpm);
  const dotSamples = Math.round((dotUnitMs / 1000) * sampleRate);

  const segments: Array<{ tone: boolean; samples: number }> = [];
  const normalized = morse.trim().replace(/·/g, '.').replace(/[—–_]/g, '-');

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '.') {
      segments.push({ tone: true, samples: dotSamples });
      segments.push({ tone: false, samples: dotSamples });
    } else if (ch === '-') {
      segments.push({ tone: true, samples: dotSamples * 3 });
      segments.push({ tone: false, samples: dotSamples });
    } else if (ch === ' ') {
      segments.push({ tone: false, samples: dotSamples * 2 });
    } else if (ch === '/') {
      segments.push({ tone: false, samples: dotSamples * 4 });
    }
  }

  if (segments.length === 0) {
    segments.push({ tone: false, samples: Math.round(sampleRate * 0.25) });
  }

  const totalSamples = segments.reduce((acc, s) => acc + s.samples, 0);
  const dataBytes = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  // RIFF header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // AudioFormat = PCM
  view.setUint16(22, 1, true);  // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  const fadeSamples = Math.min(80, Math.floor(dotSamples / 4));

  for (const seg of segments) {
    for (let s = 0; s < seg.samples; s++) {
      let sampleVal = 0;
      if (seg.tone) {
        let env = 1.0;
        if (s < fadeSamples) env = s / fadeSamples;
        else if (s > seg.samples - fadeSamples) env = (seg.samples - s) / fadeSamples;
        sampleVal = Math.round(Math.sin((2 * Math.PI * freqHz * s) / sampleRate) * env * 0.45 * 32767);
      }
      view.setInt16(offset, sampleVal, true);
      offset += 2;
    }
  }

  return new Uint8Array(buffer);
}
