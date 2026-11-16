export const MORSE_TABLE: Record<string, string> = {
  '.-': 'A',
  '-...': 'B',
  '-.-.': 'C',
  '-..': 'D',
  '.': 'E',
  '..-.': 'F',
  '--.': 'G',
  '....': 'H',
  '..': 'I',
  '.---': 'J',
  '-.-': 'K',
  '.-..': 'L',
  '--': 'M',
  '-.': 'N',
  '---': 'O',
  '.--.': 'P',
  '--.-': 'Q',
  '.-.': 'R',
  '...': 'S',
  '-': 'T',
  '..-': 'U',
  '...-': 'V',
  '.--': 'W',
  '-..-': 'X',
  '-.--': 'Y',
  '--..': 'Z',
  '-----': '0',
  '.----': '1',
  '..---': '2',
  '...--': '3',
  '....-': '4',
  '.....': '5',
  '-....': '6',
  '--...': '7',
  '---..': '8',
  '----.': '9',
  '.-.-.-': '.',
  '--..--': ',',
  '..--..': '?',
  '-.-.--': '!',
  '-....-': '-',
  '-..-.': '/',
  '.--.-.': '@',
};

const CHAR_TO_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([code, char]) => [char, code])
);

export interface MorseTimingConfig {
  dotUnitMs: number;
  dashThresholdMs: number;
  letterGapMs: number;
  wordGapMs: number;
}

export function getMorseTimingConfig(wpm: number): MorseTimingConfig {
  const safeWpm = Math.max(5, Math.min(40, wpm));
  // Standard PARIS timing: 1 dot unit = 1200 / WPM ms
  const dotUnitMs = Math.round(1200 / safeWpm);
  return {
    dotUnitMs,
    dashThresholdMs: Math.round(dotUnitMs * 2.2),
    letterGapMs: Math.round(dotUnitMs * 3.5),
    wordGapMs: Math.round(dotUnitMs * 7.5),
  };
}

export function classifyPressDuration(durationMs: number, wpm = 14): '.' | '-' {
  const { dashThresholdMs } = getMorseTimingConfig(wpm);
  return durationMs >= dashThresholdMs ? '-' : '.';
}

export function decodeMorseToken(token: string): string {
  const cleaned = token
    .trim()
    .replace(/·/g, '.')
    .replace(/[—–_]/g, '-');
  if (!cleaned) return '';
  return MORSE_TABLE[cleaned] ?? '?';
}

export function decodeMorseSequence(sequence: string): string {
  const normalized = sequence
    .trim()
    .replace(/·/g, '.')
    .replace(/[—–_]/g, '-');

  if (!normalized) return '';

  // Words separated by '/' or 2+ spaces
  const words = normalized.split(/\s*\/\s*|\s{2,}/);
  return words
    .map((word) =>
      word
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => decodeMorseToken(token))
        .join('')
    )
    .filter(Boolean)
    .join(' ');
}

export function encodeTextToMorse(text: string): string {
  return text
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      Array.from(word)
        .map((ch) => CHAR_TO_MORSE[ch] ?? '')
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' / ');
}
