import { encodeTextToMorse, decodeMorseSequence } from './morseDecoder';
import { decodeBrfToText, decodeUnicodeBrailleToText, encodeTextToBrf } from './brfAndWav';
import { ASL_ALPHABET_SPECS } from './aslClassifier';

export type UniversalModality = 'text' | 'braille' | 'morse' | 'sign';

export type SpokenLanguage =
  | 'Auto-Detect'
  | 'English'
  | 'Spanish'
  | 'Japanese'
  | 'Mandarin Chinese'
  | 'Hindi'
  | 'French'
  | 'German'
  | 'Arabic'
  | 'Portuguese'
  | 'Korean'
  | 'Italian'
  | 'Russian'
  | 'Bengali'
  | 'Tamil'
  | 'Vietnamese'
  | 'Turkish';

export interface SpokenLanguageInfo {
  id: Exclude<SpokenLanguage, 'Auto-Detect'>;
  nativeName: string;
  bcp47: string;
}

export const SPOKEN_LANGUAGE_CATALOG: SpokenLanguageInfo[] = [
  { id: 'English', nativeName: 'English', bcp47: 'en-US' },
  { id: 'Spanish', nativeName: 'Español', bcp47: 'es-ES' },
  { id: 'Japanese', nativeName: '日本語', bcp47: 'ja-JP' },
  { id: 'Mandarin Chinese', nativeName: '中文 (普通话)', bcp47: 'zh-CN' },
  { id: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  { id: 'French', nativeName: 'Français', bcp47: 'fr-FR' },
  { id: 'German', nativeName: 'Deutsch', bcp47: 'de-DE' },
  { id: 'Arabic', nativeName: 'العربية', bcp47: 'ar-SA' },
  { id: 'Portuguese', nativeName: 'Português', bcp47: 'pt-BR' },
  { id: 'Korean', nativeName: '한국어', bcp47: 'ko-KR' },
  { id: 'Italian', nativeName: 'Italiano', bcp47: 'it-IT' },
  { id: 'Russian', nativeName: 'Русский', bcp47: 'ru-RU' },
  { id: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN' },
  { id: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  { id: 'Vietnamese', nativeName: 'Tiếng Việt', bcp47: 'vi-VN' },
  { id: 'Turkish', nativeName: 'Türkçe', bcp47: 'tr-TR' },
];

export const SPOKEN_LANGUAGES: Exclude<SpokenLanguage, 'Auto-Detect'>[] =
  SPOKEN_LANGUAGE_CATALOG.map((item) => item.id);

export const LANGUAGE_BCP47: Record<Exclude<SpokenLanguage, 'Auto-Detect'>, string> =
  Object.fromEntries(SPOKEN_LANGUAGE_CATALOG.map((item) => [item.id, item.bcp47])) as Record<
    Exclude<SpokenLanguage, 'Auto-Detect'>,
    string
  >;

export interface NormalizedIR {
  canonicalEnglish: string;
  sourceText: string;
  detectedLanguage: Exclude<SpokenLanguage, 'Auto-Detect'>;
  sourceModality: UniversalModality;
  signGlosses: string[];
}

export interface UniversalConversionResult {
  ir: NormalizedIR;
  targetModality: UniversalModality;
  targetLanguage: Exclude<SpokenLanguage, 'Auto-Detect'>;
  outputText: string;
  brailleUnicode: string;
  brailleBrf: string;
  morseCode: string;
  signSequence: string[];
  bcp47: string;
  engineLabel: string;
  offlineOnly: boolean;
}

const OFFLINE_PHRASES: Record<string, Record<string, string>> = {
  hello: {
    English: 'hello',
    Spanish: 'hola',
    Japanese: 'こんにちは',
    'Mandarin Chinese': '你好',
    Hindi: 'नमस्ते',
    French: 'bonjour',
    German: 'hallo',
    Arabic: 'مرحبا',
    Portuguese: 'olá',
    Korean: '안녕하세요',
    Italian: 'ciao',
    Russian: 'привет',
    Bengali: 'হ্যালো',
    Tamil: 'வணக்கம்',
    Vietnamese: 'xin chào',
    Turkish: 'merhaba',
  },
  'hello world': {
    English: 'hello world',
    Spanish: 'hola mundo',
    Japanese: 'こんにちは世界',
    'Mandarin Chinese': '你好世界',
    Hindi: 'नमस्ते दुनिया',
    French: 'bonjour le monde',
    German: 'hallo welt',
    Arabic: 'مرحبا بالعالم',
    Portuguese: 'olá mundo',
    Korean: '안녕 세상',
    Italian: 'ciao mondo',
    Russian: 'привет мир',
    Bengali: 'হ্যালো বিশ্ব',
    Tamil: 'வணக்கம் உலகம்',
    Vietnamese: 'xin chào thế giới',
    Turkish: 'merhaba dünya',
  },
  'thank you': {
    English: 'thank you',
    Spanish: 'gracias',
    Japanese: 'ありがとうございます',
    'Mandarin Chinese': '谢谢',
    Hindi: 'धन्यवाद',
    French: 'merci',
    German: 'danke',
    Arabic: 'شكرا لك',
    Portuguese: 'obrigado',
    Korean: '감사합니다',
    Italian: 'grazie',
    Russian: 'спасибо',
    Bengali: 'ধন্যবাদ',
    Tamil: 'நன்றி',
    Vietnamese: 'cảm ơn',
    Turkish: 'teşekkür ederim',
  },
  please: {
    English: 'please',
    Spanish: 'por favor',
    Japanese: 'お願いします',
    'Mandarin Chinese': '请',
    Hindi: 'कृपया',
    French: "s'il vous plaît",
    German: 'bitte',
    Arabic: 'من فضلك',
    Portuguese: 'por favor',
    Korean: '제발',
    Italian: 'per favore',
    Russian: 'пожалуйста',
    Bengali: 'দয়া করে',
    Tamil: 'தயவு செய்து',
    Vietnamese: 'làm ơn',
    Turkish: 'lütfen',
  },
  help: {
    English: 'help',
    Spanish: 'ayuda',
    Japanese: '助けて',
    'Mandarin Chinese': '帮助',
    Hindi: 'मदद',
    French: 'aide',
    German: 'hilfe',
    Arabic: 'مساعدة',
    Portuguese: 'ajuda',
    Korean: '도와주세요',
    Italian: 'aiuto',
    Russian: 'помощь',
    Bengali: 'সাহায্য',
    Tamil: 'உதவி',
    Vietnamese: 'giúp đỡ',
    Turkish: 'yardım',
  },
  'help me': {
    English: 'help me',
    Spanish: 'ayúdame',
    Japanese: '助けてください',
    'Mandarin Chinese': '帮帮我',
    Hindi: 'मेरी मदद करें',
    French: 'aidez-moi',
    German: 'hilf mir',
    Arabic: 'ساعدني',
    Portuguese: 'me ajude',
    Korean: '저를 도와주세요',
    Italian: 'aiutami',
    Russian: 'помогите мне',
    Bengali: 'আমাকে সাহায্য করুন',
    Tamil: 'எனக்கு உதவுங்கள்',
    Vietnamese: 'giúp tôi với',
    Turkish: 'bana yardım edin',
  },
  'hello please help': {
    English: 'hello please help',
    Spanish: 'hola por favor ayuda',
    Japanese: 'こんにちは 助けてください',
    'Mandarin Chinese': '你好 请帮忙',
    Hindi: 'नमस्ते कृपया मदद करें',
    French: "bonjour s'il vous plaît aidez-moi",
    German: 'hallo bitte helfen sie mir',
    Arabic: 'مرحبا من فضلك ساعدني',
    Portuguese: 'olá por favor ajuda',
    Korean: '안녕하세요 도와주세요',
    Italian: 'ciao per favore aiuta',
    Russian: 'привет пожалуйста помогите',
    Bengali: 'হ্যালো দয়া করে সাহায্য করুন',
    Tamil: 'வணக்கம் தயவு செய்து உதவுங்கள்',
    Vietnamese: 'xin chào làm ơn giúp tôi',
    Turkish: 'merhaba lütfen yardım edin',
  },
  water: {
    English: 'water',
    Spanish: 'agua',
    Japanese: '水',
    'Mandarin Chinese': '水',
    Hindi: 'पानी',
    French: 'eau',
    German: 'wasser',
    Arabic: 'ماء',
    Portuguese: 'água',
    Korean: '물',
    Italian: 'acqua',
    Russian: 'вода',
    Bengali: 'জল',
    Tamil: 'தண்ணீர்',
    Vietnamese: 'nước',
    Turkish: 'su',
  },
  yes: {
    English: 'yes',
    Spanish: 'sí',
    Japanese: 'はい',
    'Mandarin Chinese': '是',
    Hindi: 'हाँ',
    French: 'oui',
    German: 'ja',
    Arabic: 'نعم',
    Portuguese: 'sim',
    Korean: '네',
    Italian: 'sì',
    Russian: 'да',
    Bengali: 'হ্যাঁ',
    Tamil: 'ஆம்',
    Vietnamese: 'vâng',
    Turkish: 'evet',
  },
  no: {
    English: 'no',
    Spanish: 'no',
    Japanese: 'いいえ',
    'Mandarin Chinese': '不',
    Hindi: 'नहीं',
    French: 'non',
    German: 'nein',
    Arabic: 'لا',
    Portuguese: 'não',
    Korean: '아니요',
    Italian: 'no',
    Russian: 'нет',
    Bengali: 'না',
    Tamil: 'இல்லை',
    Vietnamese: 'không',
    Turkish: 'hayır',
  },
  goodbye: {
    English: 'goodbye',
    Spanish: 'adiós',
    Japanese: 'さようなら',
    'Mandarin Chinese': '再见',
    Hindi: 'अलविदा',
    French: 'au revoir',
    German: 'auf wiedersehen',
    Arabic: 'مع السلامة',
    Portuguese: 'adeus',
    Korean: '안녕히 가세요',
    Italian: 'arrivederci',
    Russian: 'до свидания',
    Bengali: 'বিদায়',
    Tamil: 'பிறகு பார்க்கலாம்',
    Vietnamese: 'tạm biệt',
    Turkish: 'hoşça kalın',
  },
  sorry: {
    English: 'sorry',
    Spanish: 'lo siento',
    Japanese: 'ごめんなさい',
    'Mandarin Chinese': '对不起',
    Hindi: 'माफ़ कीजिए',
    French: 'désolé',
    German: 'entschuldigung',
    Arabic: 'آسف',
    Portuguese: 'desculpe',
    Korean: '죄송합니다',
    Italian: 'scusa',
    Russian: 'извините',
    Bengali: 'দুঃখিত',
    Tamil: 'மன்னிக்கவும்',
    Vietnamese: 'xin lỗi',
    Turkish: 'özür dilerim',
  },
  more: {
    English: 'more',
    Spanish: 'más',
    Japanese: 'もっと',
    'Mandarin Chinese': '更多',
    Hindi: 'और',
    French: 'plus',
    German: 'mehr',
    Arabic: 'المزيد',
    Portuguese: 'mais',
    Korean: '더',
    Italian: 'di più',
    Russian: 'ещё',
    Bengali: 'আরও',
    Tamil: 'மேலும்',
    Vietnamese: 'thêm',
    Turkish: 'daha fazla',
  },
  need: {
    English: 'need',
    Spanish: 'necesito',
    Japanese: '必要',
    'Mandarin Chinese': '需要',
    Hindi: 'चाहिए',
    French: 'besoin',
    German: 'brauche',
    Arabic: 'أحتاج',
    Portuguese: 'preciso',
    Korean: '필요해요',
    Italian: 'ho bisogno',
    Russian: 'нужно',
    Bengali: 'দরকার',
    Tamil: 'தேவை',
    Vietnamese: 'cần',
    Turkish: 'ihtiyacım var',
  },
  abc: {
    English: 'abc',
    Spanish: 'abc',
    Japanese: 'abc',
    'Mandarin Chinese': 'abc',
    Hindi: 'abc',
    French: 'abc',
    German: 'abc',
    Arabic: 'abc',
    Portuguese: 'abc',
    Korean: 'abc',
    Italian: 'abc',
    Russian: 'abc',
    Bengali: 'abc',
    Tamil: 'abc',
    Vietnamese: 'abc',
    Turkish: 'abc',
  },
};

export function detectSpokenLanguage(text: string): Exclude<SpokenLanguage, 'Auto-Detect'> {
  const trimmed = text.trim();
  if (!trimmed) return 'English';
  if (/[\u0900-\u097F]/.test(trimmed)) return 'Hindi';
  if (/[\u0980-\u09FF]/.test(trimmed)) return 'Bengali';
  if (/[\u0B80-\u0BFF]/.test(trimmed)) return 'Tamil';
  if (/[\u3040-\u30FF]/.test(trimmed)) return 'Japanese';
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(trimmed)) return 'Korean';
  if (/[\u4E00-\u9FFF]/.test(trimmed)) return 'Mandarin Chinese';
  if (/[\u0600-\u06FF]/.test(trimmed)) return 'Arabic';
  if (/[\u0400-\u04FF]/.test(trimmed)) return 'Russian';

  const lower = trimmed.toLowerCase();
  if (/[ăâđêôơưàáảãạằắẳẵặầấẩẫậ]|\b(xin chào|cảm ơn|làm ơn|giúp tôi)\b/.test(lower)) {
    return 'Vietnamese';
  }
  if (/[çğıİöşü]|\b(merhaba|teşekkür|lütfen|yardım)\b/.test(lower)) return 'Turkish';
  if (/\b(hola|gracias|por favor|ayuda|agua|adiós|buenos|necesito)\b/.test(lower)) return 'Spanish';
  if (/\b(bonjour|merci|aide|eau|oui|au revoir|s'il)\b/.test(lower)) return 'French';
  if (/\b(hallo|danke|bitte|hilfe|wasser|nein|tschüss)\b/.test(lower)) return 'German';
  if (/\b(olá|obrigado|ajuda|água|não|sim)\b/.test(lower)) return 'Portuguese';
  if (/\b(ciao|grazie|per favore|aiuto|acqua|arrivederci)\b/.test(lower)) return 'Italian';
  return 'English';
}

function reverseToEnglishOffline(
  text: string,
  sourceLang: Exclude<SpokenLanguage, 'Auto-Detect'>
): string {
  const lower = text.trim().toLowerCase();
  if (!lower || sourceLang === 'English') return text.trim();

  for (const [eng, map] of Object.entries(OFFLINE_PHRASES)) {
    if (map[sourceLang]?.toLowerCase() === lower) {
      return eng;
    }
  }

  const words = lower.split(/\s+/);
  const mapped = words.map((w) => {
    for (const [eng, map] of Object.entries(OFFLINE_PHRASES)) {
      if (!eng.includes(' ') && map[sourceLang]?.toLowerCase() === w) {
        return eng;
      }
    }
    return w;
  });
  return mapped.join(' ');
}

export function translateOfflineText(
  englishOrSourceText: string,
  targetLang: Exclude<SpokenLanguage, 'Auto-Detect'>
): string {
  const trimmed = englishOrSourceText.trim();
  if (!trimmed || targetLang === 'English') return trimmed;
  const lower = trimmed.toLowerCase().replace(/\s+/g, ' ');
  if (OFFLINE_PHRASES[lower]?.[targetLang]) {
    return OFFLINE_PHRASES[lower][targetLang];
  }

  const tokens = lower.split(' ');
  const translatedTokens = tokens.map((tok) => {
    const clean = tok.replace(/[.,!?]/g, '');
    const punct = tok.slice(clean.length);
    const match = OFFLINE_PHRASES[clean]?.[targetLang];
    return match ? `${match}${punct}` : tok;
  });
  return translatedTokens.join(' ');
}

const VALID_ASL_LETTERS = new Set(ASL_ALPHABET_SPECS.map((s) => s.letter));

export function textToSignFingerspellSequence(text: string): string[] {
  const seq: string[] = [];
  for (const ch of text.toUpperCase()) {
    if (ch === ' ') {
      if (seq.length > 0 && seq[seq.length - 1] !== 'SPACE') {
        seq.push('SPACE');
      }
    } else if (VALID_ASL_LETTERS.has(ch)) {
      seq.push(ch);
    }
  }
  return seq;
}

export function normalizeInputToIr(
  rawInput: string,
  sourceModality: UniversalModality,
  sourceLanguage: SpokenLanguage
): NormalizedIR {
  const trimmed = rawInput.trim();
  let plainText = trimmed;

  if (sourceModality === 'braille') {
    const hasUnicodeBraille = /[\u2800-\u283f]/.test(trimmed);
    plainText = hasUnicodeBraille
      ? decodeUnicodeBrailleToText(trimmed)
      : /^[A-Z0-9\s',.;:!?@#\-"]*$/i.test(trimmed) && !/[a-z]/.test(trimmed) && trimmed.length > 0
        ? decodeBrfToText(trimmed)
        : trimmed;
  } else if (sourceModality === 'morse') {
    const looksLikeMorse = /^[.\-·—–_\s/]+$/.test(trimmed);
    plainText = looksLikeMorse ? decodeMorseSequence(trimmed) : trimmed;
  } else if (sourceModality === 'sign') {
    plainText = trimmed;
  }

  const detectedLanguage =
    sourceLanguage === 'Auto-Detect'
      ? detectSpokenLanguage(plainText)
      : sourceLanguage;

  const canonicalEnglish = reverseToEnglishOffline(plainText, detectedLanguage);
  const signGlosses = textToSignFingerspellSequence(canonicalEnglish);

  return {
    canonicalEnglish,
    sourceText: plainText,
    detectedLanguage,
    sourceModality,
    signGlosses,
  };
}

export function convertBidirectionalOffline(params: {
  rawInput: string;
  sourceModality: UniversalModality;
  targetModality: UniversalModality;
  sourceLanguage: SpokenLanguage;
  targetLanguage: Exclude<SpokenLanguage, 'Auto-Detect'>;
  modelPresetLabel: string;
}): UniversalConversionResult {
  const ir = normalizeInputToIr(
    params.rawInput,
    params.sourceModality,
    params.sourceLanguage
  );

  const translatedSpoken =
    ir.detectedLanguage === params.targetLanguage
      ? ir.sourceText
      : translateOfflineText(ir.canonicalEnglish, params.targetLanguage);

  const brailleSource =
    params.targetLanguage === 'English' ? ir.canonicalEnglish : translatedSpoken;
  const { unicode: brailleUnicode, brf: brailleBrf } = encodeTextToBrf(brailleSource);
  const morseCode = encodeTextToMorse(brailleSource);
  const signSequence = textToSignFingerspellSequence(ir.canonicalEnglish);

  let outputText = translatedSpoken;
  if (params.targetModality === 'braille') {
    outputText = brailleUnicode;
  } else if (params.targetModality === 'morse') {
    outputText = morseCode;
  } else if (params.targetModality === 'sign') {
    outputText = signSequence
      .map((g) => (g === 'SPACE' ? '·' : g))
      .join(' ');
  }

  return {
    ir,
    targetModality: params.targetModality,
    targetLanguage: params.targetLanguage,
    outputText,
    brailleUnicode,
    brailleBrf,
    morseCode,
    signSequence,
    bcp47: LANGUAGE_BCP47[params.targetLanguage],
    engineLabel: `${params.modelPresetLabel} (Local Offline Engine)`,
    offlineOnly: true,
  };
}
