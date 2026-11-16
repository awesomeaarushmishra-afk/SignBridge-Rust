export interface ReferenceEntry {
  letter: string;
  brailleDots: string;
  brailleUnicode: string;
  morse: string;
}

export const REFERENCE_VISIBILITY_STORAGE_KEY = 'signbridge.reference_table_visible';

export const MORSE_BRAILLE_REFERENCE_TABLE: readonly ReferenceEntry[] = [
  { letter: 'A', brailleDots: '1', brailleUnicode: '⠁', morse: '·−' },
  { letter: 'B', brailleDots: '1,2', brailleUnicode: '⠃', morse: '−···' },
  { letter: 'C', brailleDots: '1,4', brailleUnicode: '⠉', morse: '−·−·' },
  { letter: 'D', brailleDots: '1,4,5', brailleUnicode: '⠙', morse: '−··' },
  { letter: 'E', brailleDots: '1,5', brailleUnicode: '⠑', morse: '·' },
  { letter: 'F', brailleDots: '1,2,4', brailleUnicode: '⠋', morse: '··−·' },
  { letter: 'G', brailleDots: '1,2,4,5', brailleUnicode: '⠛', morse: '−−·' },
  { letter: 'H', brailleDots: '1,2,5', brailleUnicode: '⠓', morse: '····' },
  { letter: 'I', brailleDots: '2,4', brailleUnicode: '⠊', morse: '··' },
  { letter: 'J', brailleDots: '2,4,5', brailleUnicode: '⠚', morse: '·−−−' },
  { letter: 'K', brailleDots: '1,3', brailleUnicode: '⠅', morse: '−·−' },
  { letter: 'L', brailleDots: '1,2,3', brailleUnicode: '⠇', morse: '·−··' },
  { letter: 'M', brailleDots: '1,3,4', brailleUnicode: '⠍', morse: '−−' },
  { letter: 'N', brailleDots: '1,3,4,5', brailleUnicode: '⠝', morse: '−·' },
  { letter: 'O', brailleDots: '1,3,5', brailleUnicode: '⠕', morse: '−−−' },
  { letter: 'P', brailleDots: '1,2,3,4', brailleUnicode: '⠏', morse: '·−−·' },
  { letter: 'Q', brailleDots: '1,2,3,4,5', brailleUnicode: '⠟', morse: '−−·−' },
  { letter: 'R', brailleDots: '1,2,3,5', brailleUnicode: '⠗', morse: '·−·' },
  { letter: 'S', brailleDots: '2,3,4', brailleUnicode: '⠎', morse: '···' },
  { letter: 'T', brailleDots: '2,3,4,5', brailleUnicode: '⠞', morse: '−' },
  { letter: 'U', brailleDots: '1,3,6', brailleUnicode: '⠥', morse: '··−' },
  { letter: 'V', brailleDots: '1,2,3,6', brailleUnicode: '⠧', morse: '···−' },
  { letter: 'W', brailleDots: '2,4,5,6', brailleUnicode: '⠺', morse: '·−−' },
  { letter: 'X', brailleDots: '1,3,4,6', brailleUnicode: '⠭', morse: '−··−' },
  { letter: 'Y', brailleDots: '1,3,4,5,6', brailleUnicode: '⠽', morse: '−·−−' },
  { letter: 'Z', brailleDots: '1,3,5,6', brailleUnicode: '⠵', morse: '−−··' },
];
