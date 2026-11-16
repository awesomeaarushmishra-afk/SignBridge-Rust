export type BrailleDot = 1 | 2 | 3 | 4 | 5 | 6;

export const PERKINS_KEY_TO_DOT: Record<string, BrailleDot> = {
  f: 1,
  d: 2,
  s: 3,
  j: 4,
  k: 5,
  l: 6,
};

export const DOT_TO_PERKINS_KEY: Record<BrailleDot, string> = {
  1: 'F',
  2: 'D',
  3: 'S',
  4: 'J',
  5: 'K',
  6: 'L',
};

// Bitmask encoding: dot 1 = bit 0 (1), dot 2 = bit 1 (2), ..., dot 6 = bit 5 (32)
export function dotsToMask(dots: Iterable<BrailleDot>): number {
  let mask = 0;
  for (const dot of dots) {
    if (dot >= 1 && dot <= 6) {
      mask |= 1 << (dot - 1);
    }
  }
  return mask;
}

export function maskToDots(mask: number): BrailleDot[] {
  const dots: BrailleDot[] = [];
  for (let i = 0; i < 6; i++) {
    if ((mask & (1 << i)) !== 0) {
      dots.push((i + 1) as BrailleDot);
    }
  }
  return dots;
}

export function maskToUnicodeBraille(mask: number): string {
  // Unicode Braille Patterns block starts at U+2800
  return String.fromCharCode(0x2800 + (mask & 0x3f));
}

const NUMBER_SIGN_MASK = dotsToMask([3, 4, 5, 6]); // ⠼
const CAPITAL_SIGN_MASK = dotsToMask([6]); // ⠠

const MASK_TO_LETTER: Record<number, string> = {
  [dotsToMask([1])]: 'a',
  [dotsToMask([1, 2])]: 'b',
  [dotsToMask([1, 4])]: 'c',
  [dotsToMask([1, 4, 5])]: 'd',
  [dotsToMask([1, 5])]: 'e',
  [dotsToMask([1, 2, 4])]: 'f',
  [dotsToMask([1, 2, 4, 5])]: 'g',
  [dotsToMask([1, 2, 5])]: 'h',
  [dotsToMask([2, 4])]: 'i',
  [dotsToMask([2, 4, 5])]: 'j',
  [dotsToMask([1, 3])]: 'k',
  [dotsToMask([1, 2, 3])]: 'l',
  [dotsToMask([1, 3, 4])]: 'm',
  [dotsToMask([1, 3, 4, 5])]: 'n',
  [dotsToMask([1, 3, 5])]: 'o',
  [dotsToMask([1, 2, 3, 4])]: 'p',
  [dotsToMask([1, 2, 3, 4, 5])]: 'q',
  [dotsToMask([1, 2, 3, 5])]: 'r',
  [dotsToMask([2, 3, 4])]: 's',
  [dotsToMask([2, 3, 4, 5])]: 't',
  [dotsToMask([1, 3, 6])]: 'u',
  [dotsToMask([1, 2, 3, 6])]: 'v',
  [dotsToMask([2, 4, 5, 6])]: 'w',
  [dotsToMask([1, 3, 4, 6])]: 'x',
  [dotsToMask([1, 3, 4, 5, 6])]: 'y',
  [dotsToMask([1, 3, 5, 6])]: 'z',
};

const DIGIT_LETTERS: Record<string, string> = {
  a: '1',
  b: '2',
  c: '3',
  d: '4',
  e: '5',
  f: '6',
  g: '7',
  h: '8',
  i: '9',
  j: '0',
};

const MASK_TO_PUNCTUATION: Record<number, string> = {
  [dotsToMask([2])]: ',',
  [dotsToMask([2, 3])]: ';',
  [dotsToMask([2, 5])]: ':',
  [dotsToMask([2, 5, 6])]: '.',
  [dotsToMask([2, 3, 5])]: '!',
  [dotsToMask([2, 3, 6])]: '?',
  [dotsToMask([3, 6])]: '-',
  [dotsToMask([3])]: "'",
};

const LETTER_TO_MASK: Record<string, number> = Object.fromEntries(
  Object.entries(MASK_TO_LETTER).map(([mask, char]) => [char, Number(mask)])
);

const PUNCTUATION_TO_MASK: Record<string, number> = Object.fromEntries(
  Object.entries(MASK_TO_PUNCTUATION).map(([mask, char]) => [char, Number(mask)])
);

export interface BrailleDecodeResult {
  text: string;
  unicodeCells: string;
}

export function decodeBrailleCell(
  mask: number,
  options?: { numberMode?: boolean; capitalizeNext?: boolean }
): { char: string; nextNumberMode: boolean; nextCapitalize: boolean; isControl: boolean } {
  const cleanMask = mask & 0x3f;
  if (cleanMask === 0) {
    return { char: ' ', nextNumberMode: false, nextCapitalize: false, isControl: false };
  }
  if (cleanMask === NUMBER_SIGN_MASK) {
    return { char: '', nextNumberMode: true, nextCapitalize: false, isControl: true };
  }
  if (cleanMask === CAPITAL_SIGN_MASK) {
    return { char: '', nextNumberMode: false, nextCapitalize: true, isControl: true };
  }

  const letter = MASK_TO_LETTER[cleanMask];
  if (letter) {
    if (options?.numberMode && DIGIT_LETTERS[letter]) {
      return {
        char: DIGIT_LETTERS[letter],
        nextNumberMode: true,
        nextCapitalize: false,
        isControl: false,
      };
    }
    const output = options?.capitalizeNext ? letter.toUpperCase() : letter;
    return {
      char: output,
      nextNumberMode: false,
      nextCapitalize: false,
      isControl: false,
    };
  }

  const punct = MASK_TO_PUNCTUATION[cleanMask];
  if (punct) {
    return {
      char: punct,
      nextNumberMode: false,
      nextCapitalize: false,
      isControl: false,
    };
  }

  return {
    char: '?',
    nextNumberMode: false,
    nextCapitalize: false,
    isControl: false,
  };
}

export function decodeBrailleMasks(masks: number[]): BrailleDecodeResult {
  let text = '';
  let unicodeCells = '';
  let numberMode = false;
  let capitalizeNext = false;

  for (const mask of masks) {
    const cleanMask = mask & 0x3f;
    unicodeCells += maskToUnicodeBraille(cleanMask);
    const step = decodeBrailleCell(cleanMask, { numberMode, capitalizeNext });
    text += step.char;
    numberMode = step.nextNumberMode;
    capitalizeNext = step.nextCapitalize;
  }

  return { text, unicodeCells };
}

export function encodeTextToBrailleMasks(text: string): number[] {
  const masks: number[] = [];
  let inNumberMode = false;

  for (const rawChar of text) {
    if (rawChar === ' ') {
      masks.push(0);
      inNumberMode = false;
      continue;
    }

    if (rawChar >= '0' && rawChar <= '9') {
      if (!inNumberMode) {
        masks.push(NUMBER_SIGN_MASK);
        inNumberMode = true;
      }
      const mappedLetter = Object.entries(DIGIT_LETTERS).find(([, d]) => d === rawChar)?.[0];
      if (mappedLetter && LETTER_TO_MASK[mappedLetter] !== undefined) {
        masks.push(LETTER_TO_MASK[mappedLetter]);
      }
      continue;
    }

    inNumberMode = false;
    const lower = rawChar.toLowerCase();
    if (LETTER_TO_MASK[lower] !== undefined) {
      if (rawChar !== lower) {
        masks.push(CAPITAL_SIGN_MASK);
      }
      masks.push(LETTER_TO_MASK[lower]);
      continue;
    }

    if (PUNCTUATION_TO_MASK[rawChar] !== undefined) {
      masks.push(PUNCTUATION_TO_MASK[rawChar]);
    }
  }

  return masks;
}
