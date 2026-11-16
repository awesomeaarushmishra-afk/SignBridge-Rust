import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const LANG_CODE_MAP: Record<string, string> = {
  English: 'en-US',
  Spanish: 'es-ES',
  Japanese: 'ja-JP',
  'Mandarin Chinese': 'zh-CN',
  Hindi: 'hi-IN',
  French: 'fr-FR',
  German: 'de-DE',
  Arabic: 'ar-SA',
  Portuguese: 'pt-BR',
  Korean: 'ko-KR',
  Italian: 'it-IT',
  Russian: 'ru-RU',
  Bengali: 'bn-IN',
  Tamil: 'ta-IN',
  Vietnamese: 'vi-VN',
  Turkish: 'tr-TR',
};

const OFFLINE_PHRASEBOOK: Record<string, Record<string, { text: string; phonetic: string }>> = {
  'hello please help': {
    English: { text: 'Hello, please help.', phonetic: 'heh-LOH, pleez help' },
    Spanish: { text: 'Hola, por favor ayúdame.', phonetic: 'OH-lah por fah-VOR ah-YOO-dah-meh' },
    Japanese: { text: 'こんにちは、助けてください。', phonetic: 'kon-ni-chi-wa, ta-su-ke-te ku-da-sai' },
    'Mandarin Chinese': { text: '你好，请帮帮我。', phonetic: 'nǐ hǎo, qǐng bāng bāng wǒ' },
    Hindi: { text: 'नमस्ते, कृपया मेरी मदद करें।', phonetic: 'na-mas-TE, kri-pa-ya me-ri ma-dad ka-ren' },
    French: { text: "Bonjour, s'il vous plaît aidez-moi.", phonetic: 'bohn-ZHOOR seel voo pleh eh-deh-MWAH' },
    German: { text: 'Hallo, bitte helfen Sie mir.', phonetic: 'HAH-loh BIT-teh HEL-fen zee meer' },
    Arabic: { text: 'مرحبا، من فضلك ساعدني.', phonetic: 'mar-ha-ban, min fad-lik sa-id-ni' },
    Portuguese: { text: 'Olá, por favor me ajude.', phonetic: 'oh-LAH por fah-VOR mee ah-ZHOO-jee' },
    Korean: { text: '안녕하세요, 도와주세요.', phonetic: 'an-nyeong-ha-se-yo, do-wa-ju-se-yo' },
    Italian: { text: 'Ciao, per favore aiutami.', phonetic: 'CHOW per fah-VOH-reh ah-YOO-tah-mee' },
    Russian: { text: 'Привет, пожалуйста, помогите.', phonetic: 'pri-VYET po-ZHA-luy-sta po-mo-GI-tye' },
    Bengali: { text: 'হ্যালো, দয়া করে সাহায্য করুন।', phonetic: 'hyalo, doya kore sahajyo korun' },
    Tamil: { text: 'வணக்கம், தயவு செய்து உதவுங்கள்.', phonetic: 'va-nak-kam, tha-ya-vu sei-thu u-tha-vun-gal' },
    Vietnamese: { text: 'Xin chào, làm ơn giúp tôi.', phonetic: 'sin chow, lahm uhn zoop toy' },
    Turkish: { text: 'Merhaba, lütfen yardım edin.', phonetic: 'mehr-ha-BA, loot-fen yar-dim eh-din' },
  },
  hello: {
    English: { text: 'Hello.', phonetic: 'heh-LOH' },
    Spanish: { text: 'Hola.', phonetic: 'OH-lah' },
    Japanese: { text: 'こんにちは。', phonetic: 'kon-ni-chi-wa' },
    'Mandarin Chinese': { text: '你好。', phonetic: 'nǐ hǎo' },
    Hindi: { text: 'नमस्ते।', phonetic: 'na-mas-TE' },
    French: { text: 'Bonjour.', phonetic: 'bohn-ZHOOR' },
    German: { text: 'Hallo.', phonetic: 'HAH-loh' },
    Arabic: { text: 'مرحبا.', phonetic: 'mar-ha-ban' },
    Portuguese: { text: 'Olá.', phonetic: 'oh-LAH' },
    Korean: { text: '안녕하세요.', phonetic: 'an-nyeong-ha-se-yo' },
    Italian: { text: 'Ciao.', phonetic: 'CHOW' },
    Russian: { text: 'Привет.', phonetic: 'pri-VYET' },
    Bengali: { text: 'হ্যালো।', phonetic: 'hyalo' },
    Tamil: { text: 'வணக்கம்.', phonetic: 'va-nak-kam' },
    Vietnamese: { text: 'Xin chào.', phonetic: 'sin chow' },
    Turkish: { text: 'Merhaba.', phonetic: 'mehr-ha-BA' },
  },
  'thank you': {
    English: { text: 'Thank you.', phonetic: 'thank yoo' },
    Spanish: { text: 'Gracias.', phonetic: 'GRAH-syahs' },
    Japanese: { text: 'ありがとうございます。', phonetic: 'a-ri-ga-tō go-za-i-masu' },
    'Mandarin Chinese': { text: '谢谢。', phonetic: 'xiè xie' },
    Hindi: { text: 'धन्यवाद।', phonetic: 'dhan-ya-VAAD' },
    French: { text: 'Merci.', phonetic: 'mehr-SEE' },
    German: { text: 'Danke schön.', phonetic: 'DAHN-keh shurn' },
    Arabic: { text: 'شكراً لك.', phonetic: 'shuk-ran lak' },
    Portuguese: { text: 'Obrigado.', phonetic: 'oh-bree-GAH-doo' },
    Korean: { text: '감사합니다.', phonetic: 'gam-sa-ham-ni-da' },
    Italian: { text: 'Grazie.', phonetic: 'GRAHT-syeh' },
    Russian: { text: 'Спасибо.', phonetic: 'spa-SI-bo' },
    Bengali: { text: 'ধন্যবাদ।', phonetic: 'dhon-no-bad' },
    Tamil: { text: 'நன்றி.', phonetic: 'nan-dri' },
    Vietnamese: { text: 'Cảm ơn.', phonetic: 'kahm uhn' },
    Turkish: { text: 'Teşekkür ederim.', phonetic: 'teh-shek-KOOR eh-deh-rim' },
  },
  water: {
    English: { text: 'Water', phonetic: 'WAW-ter' },
    Spanish: { text: 'Agua', phonetic: 'AH-gwah' },
    Japanese: { text: 'お水', phonetic: 'o-mi-zu' },
    'Mandarin Chinese': { text: '水', phonetic: 'shuǐ' },
    Hindi: { text: 'पानी', phonetic: 'PAA-nee' },
    French: { text: 'Eau', phonetic: 'oh' },
    German: { text: 'Wasser', phonetic: 'VAH-ser' },
    Arabic: { text: 'ماء', phonetic: 'maa' },
    Portuguese: { text: 'Água', phonetic: 'AH-gwah' },
    Korean: { text: '물', phonetic: 'mul' },
    Italian: { text: 'Acqua', phonetic: 'AHK-wah' },
    Russian: { text: 'Вода', phonetic: 'va-DA' },
    Bengali: { text: 'জল', phonetic: 'jol' },
    Tamil: { text: 'தண்ணீர்', phonetic: 'than-neer' },
    Vietnamese: { text: 'Nước', phonetic: 'nuok' },
    Turkish: { text: 'Su', phonetic: 'soo' },
  },
};

const translationCache = new Map<string, Record<string, unknown>>();
let hydrogenRateLimitedUntil = 0;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
}

function summarizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Request failed';
  if (isQuotaError(err)) return 'Free-tier model quota reached; using local fallback.';
  if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
    return 'AI service temporarily busy; showing local definition/fallback.';
  }
  return 'AI service temporarily unavailable; using local fallback.';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/translate', async (req, res) => {
    const startMs = Date.now();
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const sourceLanguage =
      typeof req.body?.sourceLanguage === 'string' && req.body.sourceLanguage.trim()
        ? req.body.sourceLanguage.trim()
        : 'Auto-Detect';
    const targetLanguage =
      typeof req.body?.targetLanguage === 'string' ? req.body.targetLanguage.trim() : 'Spanish';
    const sourceModality =
      typeof req.body?.sourceModality === 'string' ? req.body.sourceModality : 'text';
    const modelName =
      typeof req.body?.modelName === 'string' && req.body.modelName.trim()
        ? req.body.modelName.trim()
        : 'Gemma 4 E4B Instruct';

    if (!rawText) {
      res.status(400).json({ error: 'Input text is required before translating.' });
      return;
    }

    const cacheKey = `${sourceModality}::${sourceLanguage}::${targetLanguage}::${rawText}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      res.json({ ...cached, latencyMs: 1 });
      return;
    }

    const langCode = LANG_CODE_MAP[targetLanguage] ?? 'en-US';
    const normalizedKey = rawText.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    const buildFallbackResponse = (reason: string) => {
      const localMatch = OFFLINE_PHRASEBOOK[normalizedKey]?.[targetLanguage];
      if (localMatch) {
        return {
          sourceText: rawText,
          detectedSourceLanguage: sourceLanguage === 'Auto-Detect' ? 'English' : sourceLanguage,
          translatedText: localMatch.text,
          phoneticGuide: localMatch.phonetic,
          grammarNote: reason,
          targetLanguage,
          bcp47: langCode,
          latencyMs: Date.now() - startMs,
          estimatedTokens: Math.max(4, Math.ceil(localMatch.text.length / 3)),
          engine: `${modelName} (Offline Phrasebook)`,
        };
      }
      return {
        sourceText: rawText,
        detectedSourceLanguage: sourceLanguage,
        translatedText: rawText,
        phoneticGuide: '',
        grammarNote: reason,
        targetLanguage,
        bcp47: langCode,
        latencyMs: Date.now() - startMs,
        estimatedTokens: Math.max(2, Math.ceil(rawText.length / 3)),
        engine: `${modelName} (Local Offline Fallback)`,
      };
    };

    const ai = getAiClient();
    if (!ai) {
      res.json(
        buildFallbackResponse(
          'Offline deterministic phrasebook active (set GEMINI_API_KEY in Settings > Secrets for full AI translation).'
        )
      );
      return;
    }

    const modalityContext =
      sourceModality === 'sign'
        ? 'The input is a sequence of sign language glosses or fingerspelled letters (possibly telegraphic, e.g., "HELLO PLEASE HELP" or "WATER"). Smooth it into natural spoken phrasing before translating.'
        : sourceModality === 'morse'
          ? 'The input was decoded from uppercase Morse code. Normalize casing and translate naturally.'
          : sourceModality === 'braille'
            ? 'The input was decoded from 6-dot Grade 1 Braille. Preserve intent and translate naturally.'
            : 'The input is plain text or voice speech dictation in any language. Detect its source language if Auto-Detect is given, preserve full meaning, and translate naturally into the requested output language.';

    const sourceHint =
      sourceLanguage === 'Auto-Detect'
        ? 'Auto-detect the input language (which may be English or any non-English language such as Spanish, Japanese, Chinese, Hindi, Korean, Arabic, etc.).'
        : `The source language is ${sourceLanguage}.`;

    const callModel = async (activeModel: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite') => {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: `${sourceHint} Translate and normalize this accessibility utterance directly into ${targetLanguage}: "${rawText}"`,
        config: {
          systemInstruction: `You act as the multilingual translation stage of a ${modelName} accessibility pipeline. ${modalityContext} Support non-English-to-English and non-English-to-non-English translation directly without losing nuance. Keep the translation concise, polite, natural for immediate text-to-speech playback, and free of extra commentary.`,
          thinkingConfig:
            activeModel === 'gemini-4-hydrogen'
              ? { thinkingLevel: ThinkingLevel.LOW }
              : { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedSourceLanguage: {
                type: Type.STRING,
                description: 'Detected source language name (e.g. Spanish, Japanese, English).',
              },
              normalizedEnglish: {
                type: Type.STRING,
                description: 'Normalized plain-meaning English bridge sentence for Intermediate Representation.',
              },
              translatedText: {
                type: Type.STRING,
                description: `Final translated text in ${targetLanguage}.`,
              },
              phoneticGuide: {
                type: Type.STRING,
                description: 'Simple Latin-script pronunciation guide for the translated output.',
              },
              grammarNote: {
                type: Type.STRING,
                description: 'Short 1-sentence note on translation or input normalization.',
              },
            },
            required: [
              'detectedSourceLanguage',
              'normalizedEnglish',
              'translatedText',
              'phoneticGuide',
              'grammarNote',
            ],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        detectedSourceLanguage?: string;
        normalizedEnglish?: string;
        translatedText?: string;
        phoneticGuide?: string;
        grammarNote?: string;
      };

      const translatedText = parsed.translatedText?.trim() || rawText;
      const resultPayload = {
        sourceText: parsed.normalizedEnglish?.trim() || rawText,
        detectedSourceLanguage: parsed.detectedSourceLanguage?.trim() || sourceLanguage,
        translatedText,
        phoneticGuide: parsed.phoneticGuide?.trim() || '',
        grammarNote:
          parsed.grammarNote?.trim() ||
          `Translated into ${targetLanguage} via ${modelName} (${activeModel}).`,
        targetLanguage,
        bcp47: langCode,
        latencyMs: Date.now() - startMs,
        estimatedTokens: Math.max(6, Math.ceil(translatedText.length / 3)),
        engine:
          activeModel === 'gemini-4-hydrogen'
            ? `Gemma 4 E4B / Gemini 4 (${modelName})`
            : `Gemma 4 / Gemini Lite (${modelName})`,
      };
      translationCache.set(cacheKey, resultPayload);
      return resultPayload;
    };

    try {
      const primaryModel =
        Date.now() < hydrogenRateLimitedUntil ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      const payload = await callModel(primaryModel);
      res.json(payload);
    } catch (primaryErr: unknown) {
      if (isQuotaError(primaryErr)) {
        hydrogenRateLimitedUntil = Date.now() + 5 * 60 * 1000;
        try {
          const backupPayload = await callModel('gemini-3.1-flash-lite');
          res.json(backupPayload);
          return;
        } catch (backupErr: unknown) {
          res.json(buildFallbackResponse(summarizeError(backupErr)));
          return;
        }
      }
      res.json(buildFallbackResponse(summarizeError(primaryErr)));
    }
  });

  app.post('/api/transcribe', async (req, res) => {
    const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
    const mimeType =
      typeof req.body?.mimeType === 'string' && req.body.mimeType.trim()
        ? req.body.mimeType.trim()
        : 'audio/webm';
    const languageHint =
      typeof req.body?.languageHint === 'string' ? req.body.languageHint.trim() : 'Auto-Detect';

    if (!audioBase64) {
      res.status(400).json({ error: 'Audio payload is required for speech transcription.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured for fallback audio transcription.',
      });
      return;
    }

    try {
      const prompt =
        languageHint && languageHint !== 'Auto-Detect'
          ? `Transcribe this spoken audio accurately in ${languageHint}. Return only the spoken transcript without timestamps or extra labels.`
          : 'Transcribe this spoken audio accurately in whichever language is spoken (English, Spanish, Japanese, Chinese, Hindi, etc.). Return only the exact spoken transcript without extra commentary.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: prompt },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      res.json({
        transcript,
        engine: 'Gemini 3.5 Transcribe',
      });
    } catch (err: unknown) {
      res.status(502).json({ error: `Audio transcription error: ${summarizeError(err)}` });
    }
  });

  app.post('/api/explain-word', async (req, res) => {
    const word = typeof req.body?.word === 'string' ? req.body.word.trim() : '';
    const contextSentence =
      typeof req.body?.contextSentence === 'string' ? req.body.contextSentence.trim() : '';
    const dictionaryExcerpts =
      typeof req.body?.dictionaryExcerpts === 'string'
        ? req.body.dictionaryExcerpts.trim().slice(0, 3000)
        : '';
    const targetLanguage =
      typeof req.body?.targetLanguage === 'string' && req.body.targetLanguage.trim()
        ? req.body.targetLanguage.trim()
        : 'English';

    if (!word) {
      res.status(400).json({ error: 'A word to explain is required.' });
      return;
    }

    const buildLocalExplain = (reason?: string) => {
      const firstExcerpt = dictionaryExcerpts
        .split('\n')
        .map((l: string) => l.trim())
        .find((l: string) => l.length > 0);
      const cleanedDef = firstExcerpt
        ? firstExcerpt.replace(/^[^:]+:\s*/, '')
        : `Look up "${word}" in your uploaded .pdf or .txt dictionary to view its local definition.`;
      return {
        word,
        simpleMeaning: firstExcerpt
          ? `${cleanedDef}${reason ? ` (${reason})` : ''}`
          : cleanedDef,
        exampleUsage: contextSentence
          ? `Found in sentence: "${contextSentence}"`
          : `You can upload a .pdf or .txt glossary with "${word}: meaning" to see offline definitions anytime.`,
        engine: 'Local Uploaded Dictionary Helper',
      };
    };

    const ai = getAiClient();
    if (!ai) {
      res.json(buildLocalExplain());
      return;
    }

    const callExplainModel = async (activeModel: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite') => {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: `Explain the word or term "${word}" simply in ${targetLanguage}.${
          contextSentence ? ` Sentence context: "${contextSentence}".` : ''
        }${
          dictionaryExcerpts
            ? ` Relevant excerpts from the user's uploaded dictionary:\n${dictionaryExcerpts}`
            : ''
        }`,
        config: {
          systemInstruction:
            'You are an accessibility plain-language dictionary helper. Give a clear, everyday explanation easy for anyone to understand, plus a short everyday example sentence.',
          thinkingConfig:
            activeModel === 'gemini-4-hydrogen'
              ? { thinkingLevel: ThinkingLevel.LOW }
              : { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              simpleMeaning: {
                type: Type.STRING,
                description: `Clear, easy-to-understand definition in ${targetLanguage}.`,
              },
              exampleUsage: {
                type: Type.STRING,
                description: `One short, helpful example sentence in ${targetLanguage}.`,
              },
            },
            required: ['simpleMeaning', 'exampleUsage'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        simpleMeaning?: string;
        exampleUsage?: string;
      };

      return {
        word,
        simpleMeaning: parsed.simpleMeaning?.trim() || '',
        exampleUsage: parsed.exampleUsage?.trim() || '',
        engine:
          activeModel === 'gemini-4-hydrogen'
            ? 'Gemma 4 E4B / Gemini 4 Dictionary Helper'
            : 'Gemma 4 / Gemini Lite Dictionary Helper',
      };
    };

    try {
      const primaryModel =
        Date.now() < hydrogenRateLimitedUntil ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      res.json(await callExplainModel(primaryModel));
    } catch (primaryErr: unknown) {
      if (isQuotaError(primaryErr)) {
        hydrogenRateLimitedUntil = Date.now() + 5 * 60 * 1000;
        try {
          res.json(await callExplainModel('gemini-3.1-flash-lite'));
          return;
        } catch (backupErr: unknown) {
          res.json(buildLocalExplain(summarizeError(backupErr)));
          return;
        }
      }
      res.json(buildLocalExplain(summarizeError(primaryErr)));
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SignBridge Rust workbench listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
