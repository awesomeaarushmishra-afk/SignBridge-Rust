import { useMemo, useRef, useState } from 'react';
import { BookOpen, FileText, Search, Sparkles, Trash2, Upload, Volume2 } from 'lucide-react';
import {
  ParsedDictionary,
  SAMPLE_DICTIONARY_TXT,
  extractLookupTokens,
  lookupDictionaryWord,
  parseDictionaryText,
} from '../utils/dictionaryParser';
import { extractTextFromPdfFile } from '../utils/pdfExtractor';

interface DictionaryHelperPanelProps {
  dictionary: ParsedDictionary | null;
  onDictionaryChange: (next: ParsedDictionary | null) => void;
  sourceText: string;
  translatedText: string;
  targetLanguage: string;
  bcp47: string;
  onSpeakText: (text: string, bcp47: string) => void;
  highContrast?: boolean;
}

interface AiWordExplanation {
  word: string;
  simpleMeaning: string;
  exampleUsage: string;
  engine: string;
}

export function DictionaryHelperPanel({
  dictionary,
  onDictionaryChange,
  sourceText,
  translatedText,
  targetLanguage,
  bcp47,
  onSpeakText,
  highContrast = false,
}: DictionaryHelperPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [queryWord, setQueryWord] = useState('');
  const [parsingStatus, setParsingStatus] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<AiWordExplanation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const clickableWords = useMemo(() => {
    const combined = `${sourceText} ${translatedText}`;
    return extractLookupTokens(combined, 24);
  }, [sourceText, translatedText]);

  const lookupResult = useMemo(
    () => lookupDictionaryWord(dictionary, queryWord),
    [dictionary, queryWord]
  );

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;
    setParseError(null);
    setParsingStatus(`Indexing ${file.name}...`);

    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        const extractedText = await extractTextFromPdfFile(file);
        const parsed = parseDictionaryText(extractedText, file.name, 'pdf');
        onDictionaryChange(parsed);
        setParsingStatus(
          `Loaded PDF dictionary "${file.name}" (${parsed.entries.length} entries indexed locally).`
        );
      } else {
        const rawText = await file.text();
        const parsed = parseDictionaryText(rawText, file.name, 'txt');
        onDictionaryChange(parsed);
        setParsingStatus(
          `Loaded TXT dictionary "${file.name}" (${parsed.entries.length} entries indexed locally).`
        );
      }
      setAiExplanation(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to parse uploaded dictionary file.';
      setParseError(msg);
      setParsingStatus(null);
    }
  };

  const handleLoadSampleGlossary = () => {
    setParseError(null);
    const parsed = parseDictionaryText(
      SAMPLE_DICTIONARY_TXT,
      'accessibility-glossary-sample.txt',
      'txt'
    );
    onDictionaryChange(parsed);
    setParsingStatus(
      `Loaded sample glossary (${parsed.entries.length} entries). Click any word below or type a word to look it up.`
    );
  };

  const handleSelectWord = (word: string) => {
    setQueryWord(word);
    setAiExplanation(null);
    setAiError(null);
  };

  const handleAskAiExplain = async () => {
    const clean = queryWord.trim();
    if (!clean) return;
    setAiLoading(true);
    setAiError(null);

    const excerptLines: string[] = [];
    if (lookupResult.exactMatch) {
      excerptLines.push(`${lookupResult.exactMatch.term}: ${lookupResult.exactMatch.definition}`);
    }
    for (const rel of lookupResult.relatedMatches.slice(0, 3)) {
      excerptLines.push(`${rel.term}: ${rel.definition}`);
    }

    try {
      const res = await fetch('/api/explain-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: clean,
          contextSentence: translatedText || sourceText,
          dictionaryExcerpts: excerptLines.join('\n'),
          targetLanguage,
        }),
      });
      const payload = (await res.json()) as AiWordExplanation & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || 'Could not explain word');
      }
      setAiExplanation(payload);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Word explanation unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const cardBg = highContrast
    ? 'bg-black border-white text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const subBg = highContrast
    ? 'bg-zinc-950 border-white/70 text-white'
    : 'bg-slate-50 border-slate-200 text-slate-900';
  const mutedText = highContrast ? 'text-yellow-300' : 'text-slate-600';

  return (
    <section
      aria-label="Dictionary upload and word understanding helper"
      data-testid="dictionary-helper-panel"
      className={`rounded-xl border p-5 space-y-4 ${cardBg}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span>Word Understanding &amp; Custom Dictionary (.pdf / .txt)</span>
          </h2>
          <p className={`text-xs ${mutedText}`}>
            Upload your own .pdf or .txt dictionary/glossary, then click any word from your input or translation—or search any difficult word—for plain-language meanings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            data-testid="dictionary-file-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              void handleFileSelected(f);
              e.target.value = '';
            }}
            className="sr-only"
            aria-label="Upload .pdf or .txt dictionary file"
          />
          <button
            type="button"
            data-testid="upload-dictionary-btn"
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              highContrast
                ? 'bg-sky-400 text-black hover:bg-sky-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload .pdf / .txt Dictionary
          </button>

          <button
            type="button"
            data-testid="load-sample-dictionary-btn"
            onClick={handleLoadSampleGlossary}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap ${
              highContrast
                ? 'border-white text-white hover:bg-zinc-900'
                : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Load Sample Glossary
          </button>

          {dictionary && (
            <button
              type="button"
              onClick={() => {
                onDictionaryChange(null);
                setParsingStatus(null);
                setAiExplanation(null);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {dictionary && (
        <div
          data-testid="dictionary-loaded-badge"
          className={`rounded-lg border px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${subBg}`}
        >
          <span>
            Active Dictionary: <strong>{dictionary.fileName}</strong> ({dictionary.fileType.toUpperCase()})
          </span>
          <span>{dictionary.entries.length} entries indexed</span>
        </div>
      )}

      {parsingStatus && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {parsingStatus}
        </div>
      )}

      {parseError && (
        <div role="alert" className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {parseError}
        </div>
      )}

      {/* Search bar + clickable words from active text */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="dictionary-lookup-input" className="sr-only">
              Look up a word
            </label>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="dictionary-lookup-input"
                data-testid="dictionary-search-input"
                type="text"
                value={queryWord}
                onChange={(e) => {
                  setQueryWord(e.target.value);
                  setAiExplanation(null);
                }}
                placeholder="Type any word you don't understand..."
                className={`w-full rounded-lg border pl-8 pr-3 py-2 text-xs ${
                  highContrast
                    ? 'bg-black border-white text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none'
                }`}
              />
            </div>
            <button
              type="button"
              data-testid="explain-word-ai-btn"
              disabled={!queryWord.trim() || aiLoading}
              onClick={() => void handleAskAiExplain()}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap disabled:opacity-50 ${
                highContrast
                  ? 'bg-yellow-300 text-black'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiLoading ? 'Explaining...' : 'Explain Simply'}
            </button>
          </div>

          {clickableWords.length > 0 && (
            <div className="space-y-1.5">
              <div className={`text-[11px] font-medium ${mutedText}`}>
                Click any word from your current input or translation:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {clickableWords.map((tok) => {
                  const selected = tok.toLowerCase() === queryWord.trim().toLowerCase();
                  return (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => handleSelectWord(tok)}
                      className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : highContrast
                            ? 'border-white/60 text-white hover:bg-zinc-900'
                            : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {tok}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Lookup Result Pane */}
        <div
          data-testid="dictionary-result-pane"
          className={`lg:col-span-7 rounded-xl border p-4 space-y-3 ${subBg}`}
        >
          {!queryWord.trim() ? (
            <p className={`text-xs ${mutedText}`}>
              {dictionary
                ? `Search or click any word to inspect its meaning in "${dictionary.fileName}" or ask Gemma 4 for a simple plain-language explanation.`
                : 'Upload a .pdf or .txt dictionary (or click "Load Sample Glossary"), then click or type any word to see its meaning.'}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold">
                  Meaning for &ldquo;{queryWord.trim()}&rdquo;
                </span>
                {(lookupResult.exactMatch || aiExplanation) && (
                  <button
                    type="button"
                    onClick={() => {
                      const spoken = aiExplanation
                        ? `${aiExplanation.simpleMeaning} Example: ${aiExplanation.exampleUsage}`
                        : `${lookupResult.exactMatch?.term}: ${lookupResult.exactMatch?.definition}`;
                      onSpeakText(spoken, aiExplanation ? bcp47 : 'en-US');
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium ${
                      highContrast
                        ? 'border-white text-white'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Speak Definition
                  </button>
                )}
              </div>

              {lookupResult.exactMatch ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 space-y-1 text-xs text-slate-900">
                  <div className="font-semibold text-emerald-900">
                    Uploaded Dictionary Match · {lookupResult.exactMatch.term}
                    {lookupResult.exactMatch.page ? ` (Page ${lookupResult.exactMatch.page})` : ''}
                  </div>
                  <p className="leading-relaxed">{lookupResult.exactMatch.definition}</p>
                </div>
              ) : dictionary ? (
                <div className={`text-xs ${mutedText}`}>
                  No exact headword match for &ldquo;{queryWord.trim()}&rdquo; in {dictionary.fileName}.
                  {lookupResult.relatedMatches.length === 0 &&
                    ' Click "Explain Simply" for a plain-language Gemma 4 explanation.'}
                </div>
              ) : null}

              {lookupResult.relatedMatches.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>
                    Related Matches in Uploaded File
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {lookupResult.relatedMatches.map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          highContrast
                            ? 'bg-black border-white/50 text-white'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-semibold">{entry.term}</span>
                        {entry.page ? <span className="text-[11px] opacity-70"> (p.{entry.page})</span> : null}
                        : {entry.definition}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiExplanation && (
                <div
                  data-testid="ai-word-explanation"
                  className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 space-y-1.5 text-xs text-slate-900"
                >
                  <div className="font-semibold text-blue-900">
                    Plain-Language Explanation ({targetLanguage}) · {aiExplanation.engine}
                  </div>
                  <p>{aiExplanation.simpleMeaning}</p>
                  {aiExplanation.exampleUsage && (
                    <p className="text-slate-700 italic">
                      Example: {aiExplanation.exampleUsage}
                    </p>
                  )}
                </div>
              )}

              {aiError && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {aiError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
