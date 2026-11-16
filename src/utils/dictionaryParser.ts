export interface DictionaryEntry {
  id: string;
  term: string;
  normalizedTerm: string;
  definition: string;
  sourceLine: string;
  page?: number;
}

export interface ParsedDictionary {
  fileName: string;
  fileType: 'txt' | 'pdf';
  entries: DictionaryEntry[];
  rawTextSample: string;
  uploadedAt: string;
}

export interface DictionaryLookupResult {
  query: string;
  exactMatch: DictionaryEntry | null;
  relatedMatches: DictionaryEntry[];
}

export const DICTIONARY_STORAGE_KEY = 'signbridge.uploaded_dictionary.v1';

export function normalizeLookupWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function candidateStems(norm: string): string[] {
  const candidates = [norm];
  if (norm.length > 4 && norm.endsWith('ies')) candidates.push(`${norm.slice(0, -3)}y`);
  if (norm.length > 4 && norm.endsWith('es')) candidates.push(norm.slice(0, -2));
  if (norm.length > 3 && norm.endsWith('s')) candidates.push(norm.slice(0, -1));
  if (norm.length > 5 && norm.endsWith('ing')) {
    candidates.push(norm.slice(0, -3), `${norm.slice(0, -3)}e`);
  }
  if (norm.length > 4 && norm.endsWith('ed')) {
    candidates.push(norm.slice(0, -2), `${norm.slice(0, -2)}e`);
  }
  if (norm.length > 4 && norm.endsWith('ly')) candidates.push(norm.slice(0, -2));
  return Array.from(new Set(candidates));
}

/**
 * Parses uploaded .txt or extracted .pdf text into searchable DictionaryEntry items.
 * Handles common delimiter patterns ("word: def", "word - def", "word\tdef", "word = def"),
 * dictionary headwords ("WORD (n.) Definition..."), and fallback full-text lines.
 */
export function parseDictionaryText(
  rawText: string,
  fileName: string,
  fileType: 'txt' | 'pdf'
): ParsedDictionary {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const entries: DictionaryEntry[] = [];
  const seen = new Set<string>();
  let currentPage: number | undefined;

  const pushEntry = (termRaw: string, defRaw: string, sourceLine: string) => {
    const term = termRaw.trim().replace(/^["'*•\-]+\s*/, '');
    const definition = defRaw.trim();
    const normalizedTerm = normalizeLookupWord(term);
    if (!normalizedTerm || normalizedTerm.length > 64 || !definition) return;
    const dedupKey = `${normalizedTerm}::${definition.slice(0, 60).toLowerCase()}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
    entries.push({
      id: `${entries.length + 1}-${normalizedTerm}`,
      term,
      normalizedTerm,
      definition,
      sourceLine,
      page: currentPage,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const pageMarker = /^---\s*Page\s+(\d+)\s*---$/i.exec(line);
    if (pageMarker) {
      currentPage = Number(pageMarker[1]);
      continue;
    }

    // 1. Key-value formats: "term: def", "term - def", "term — def", "term = def", "term\tdef"
    const kvMatch =
      /^([^\t:=—–-]{1,60}?)\s*(?:\t|:\s+|=\s+|\s+[—–-]\s+)(.{2,})$/.exec(line);
    if (kvMatch) {
      pushEntry(kvMatch[1], kvMatch[2], line);
      continue;
    }

    // 2. Printed glossary headword format: "WORD (noun) Definition text..." or "Word. Definition..."
    const headwordMatch =
      /^([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ0-9' -]{1,36})\s+(?:\([^)]{1,24}\)\s+|[—.]\s+)(.{6,})$/.exec(
        line
      );
    if (headwordMatch) {
      pushEntry(headwordMatch[1], headwordMatch[2], line);
      continue;
    }

    // 3. Two-line dictionary block: short single term followed by longer definition line
    if (
      line.split(/\s+/).length <= 3 &&
      line.length <= 36 &&
      i + 1 < lines.length &&
      lines[i + 1].length > line.length + 4
    ) {
      pushEntry(line, lines[i + 1], `${line} — ${lines[i + 1]}`);
      i += 1;
      continue;
    }

    // 4. General readable glossary sentence fallback (index key words inside sentence)
    if (line.length >= 12) {
      const firstWord = line.split(/\s+/)[0] ?? '';
      const cleanFirst = normalizeLookupWord(firstWord);
      if (cleanFirst.length >= 2) {
        pushEntry(cleanFirst, line, line);
      }
    }
  }

  return {
    fileName,
    fileType,
    entries: entries.slice(0, 5000),
    rawTextSample: rawText.slice(0, 4000),
    uploadedAt: new Date().toISOString(),
  };
}

export function lookupDictionaryWord(
  dictionary: ParsedDictionary | null,
  rawQuery: string
): DictionaryLookupResult {
  const norm = normalizeLookupWord(rawQuery);
  if (!dictionary || !norm) {
    return { query: rawQuery.trim(), exactMatch: null, relatedMatches: [] };
  }

  const stems = candidateStems(norm);

  let exactMatch: DictionaryEntry | null = null;
  for (const stem of stems) {
    const hit = dictionary.entries.find((e) => e.normalizedTerm === stem);
    if (hit) {
      exactMatch = hit;
      break;
    }
  }

  const relatedMatches: DictionaryEntry[] = [];
  for (const entry of dictionary.entries) {
    if (exactMatch && entry.id === exactMatch.id) continue;
    if (
      entry.normalizedTerm.includes(norm) ||
      norm.includes(entry.normalizedTerm) ||
      entry.definition.toLowerCase().includes(norm)
    ) {
      relatedMatches.push(entry);
      if (relatedMatches.length >= 6) break;
    }
  }

  return {
    query: rawQuery.trim(),
    exactMatch,
    relatedMatches,
  };
}

export function extractLookupTokens(text: string, maxTokens = 28): string[] {
  const rawTokens = text
    .split(/[\s,.;:!?¿¡"'()[\]{}«»、。！？]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && /[\p{L}\p{N}]/u.test(t));

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const tok of rawTokens) {
    const key = tok.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tok);
      if (unique.length >= maxTokens) break;
    }
  }
  return unique;
}

export const SAMPLE_DICTIONARY_TXT = `# SignBridge Plain-Language Accessibility Glossary (.txt)
accessibility: Designing tools, text, audio, and interfaces so people with disabilities can use them independently.
braille: A tactile reading and writing system that uses raised patterns of 6 dots in a 2x3 cell.
brf: Braille Ready Format; plain ASCII text representing 6-dot Braille cells for embossers and displays.
morse: A communication code representing letters and numbers using short dots and long dashes.
sign: Visual communication using hand shapes, finger spelling, movement, and facial expression.
landmark: One of 21 3D key joint coordinates tracked on a hand (wrist, knuckles, and fingertips).
debounce: Waiting for a steady hand posture across several frames before typing a letter so brief motion does not create typos.
normalization: Converting raw input (text, Braille, Morse, or signs) into a single shared representation before translating.
synthesis: Generating spoken audio from written text using a text-to-speech (TTS) voice.
hydration: Drinking water to replace fluids lost during the day.
emergency: A sudden, urgent situation where quick help is needed.
prescription: Written instructions from a doctor for medicine.
translator: A tool or person that converts words from one language or code into another while keeping the meaning.
`;
