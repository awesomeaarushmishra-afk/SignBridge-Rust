import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_DICTIONARY_TXT,
  extractLookupTokens,
  lookupDictionaryWord,
  parseDictionaryText,
} from './dictionaryParser';
import {
  SPOKEN_LANGUAGES,
  convertBidirectionalOffline,
  detectSpokenLanguage,
} from './offlineTranslator';

test('parseDictionaryText parses .txt and page-delimited .pdf dictionaries and looks up exact, stemmed, and related words', () => {
  const txtDict = parseDictionaryText(SAMPLE_DICTIONARY_TXT, 'glossary.txt', 'txt');
  assert.ok(txtDict.entries.length >= 12);

  const exact = lookupDictionaryWord(txtDict, 'Braille!');
  assert.ok(exact.exactMatch);
  assert.match(exact.exactMatch.definition, /6 dots/i);

  const stemmed = lookupDictionaryWord(txtDict, 'landmarks');
  assert.ok(stemmed.exactMatch);
  assert.equal(stemmed.exactMatch.normalizedTerm, 'landmark');

  const pdfSimulated = parseDictionaryText(
    '--- Page 2 ---\nEphemeral — Lasting for only a very short time.\nResilient (adj.) Able to recover quickly after difficulty.',
    'vocab.pdf',
    'pdf'
  );
  const pdfHit = lookupDictionaryWord(pdfSimulated, 'ephemeral');
  assert.ok(pdfHit.exactMatch);
  assert.equal(pdfHit.exactMatch.page, 2);
  assert.match(pdfHit.exactMatch.definition, /short time/i);

  const resilientHit = lookupDictionaryWord(pdfSimulated, 'resilient');
  assert.ok(resilientHit.exactMatch);
  assert.match(resilientHit.exactMatch.definition, /recover quickly/i);
});

test('extractLookupTokens preserves multilingual tokens cleanly without duplicates', () => {
  const tokens = extractLookupTokens('Hola, gracias! こんにちは, hello; hello.');
  assert.deepEqual(tokens, ['Hola', 'gracias', 'こんにちは', 'hello']);
});

test('SPOKEN_LANGUAGES supports 16 languages and converts non-English phrase inputs bidirectionally', () => {
  assert.ok(SPOKEN_LANGUAGES.length >= 16);
  assert.equal(detectSpokenLanguage('こんにちは'), 'Japanese');
  assert.equal(detectSpokenLanguage('नमस्ते'), 'Hindi');
  assert.equal(detectSpokenLanguage('안녕하세요'), 'Korean');

  const jaToEs = convertBidirectionalOffline({
    rawInput: 'こんにちは',
    sourceModality: 'text',
    targetModality: 'text',
    sourceLanguage: 'Auto-Detect',
    targetLanguage: 'Spanish',
    modelPresetLabel: 'Gemma 4 E4B',
  });
  assert.equal(jaToEs.ir.detectedLanguage, 'Japanese');
  assert.equal(jaToEs.outputText, 'hola');
});
