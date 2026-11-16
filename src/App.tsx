import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Volume2,
  Square,
  ArrowRight,
  Copy,
  Download,
  FileAudio,
  Mic,
  MicOff,
  Check,
  Eye,
  HelpCircle,
  Globe2,
  Upload,
} from 'lucide-react';
import { BraillePad } from './components/BraillePad';
import { MorseKeyer } from './components/MorseKeyer';
import { SignMediaPipeStage } from './components/SignMediaPipeStage';
import { SignOutputAvatar } from './components/SignOutputAvatar';
import { ReferenceTablePanel } from './components/ReferenceTablePanel';
import { DictionaryHelperPanel } from './components/DictionaryHelperPanel';
import { ModelManagerView } from './components/ModelManagerView';
import { DesktopPackageView } from './components/DesktopPackageView';
import { OnboardingAssistantPanel } from './components/OnboardingAssistantPanel';
import { ArchitectureDiagram } from './components/ArchitectureDiagram';
import { RustCodeExplorer } from './components/RustCodeExplorer';
import { SltMigrationPlan } from './components/SltMigrationPlan';
import { BenchmarksView } from './components/BenchmarksView';
import { REFERENCE_VISIBILITY_STORAGE_KEY } from './utils/referenceTableData';
import { DICTIONARY_STORAGE_KEY, ParsedDictionary } from './utils/dictionaryParser';
import {
  LANGUAGE_BCP47,
  SPOKEN_LANGUAGE_CATALOG,
  SpokenLanguage,
  UniversalModality,
  convertBidirectionalOffline,
  textToSignFingerspellSequence,
} from './utils/offlineTranslator';
import { encodeTextToBrf, generateMorseWavBytes } from './utils/brfAndWav';
import { encodeTextToMorse } from './utils/morseDecoder';
import {
  AssistantSlmTierId,
  DEFAULT_MODEL_CONFIG,
  LOCAL_MODEL_PRESETS,
  MODEL_CONFIG_STORAGE_KEY,
  ModelAdapterConfig,
  ONBOARDING_SLM_PRESETS,
} from './utils/modelPresets';

type TopSection =
  | 'workbench'
  | 'models'
  | 'desktop'
  | 'architecture'
  | 'rust-code'
  | 'slt-plan'
  | 'benchmarks';

type FontScale = 'standard' | 'large' | 'xl';

interface TranslationResult {
  sourceText: string;
  detectedSourceLanguage?: string;
  translatedText: string;
  phoneticGuide: string;
  grammarNote: string;
  targetLanguage: string;
  bcp47: string;
  latencyMs: number;
  estimatedTokens: number;
  engine: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error?: string;
  message?: string;
}
interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous?: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const RUST_FILENAME_TO_ID: Record<string, string> = {
  'Cargo.toml': 'cargo',
  'src/braille_morse.rs': 'braille_morse',
  'src/mediapipe_ffi.rs': 'mediapipe_ffi',
  'src/ffi_bridge.cpp': 'ffi_bridge',
  'src/sign_pipeline.rs': 'sign_pipeline',
  'src/sign_language.rs': 'sign_language',
  'src/reference_table.rs': 'reference_table',
  'src/gemma_runtime.rs': 'gemma_runtime',
  'src/tts_engine.rs': 'gemma_runtime',
};

const SOURCE_MODALITIES: Array<{ id: UniversalModality; label: string; hint: string }> = [
  { id: 'text', label: 'Text / Speech', hint: 'Alt+1' },
  { id: 'braille', label: 'Braille (6-Dot)', hint: 'Alt+2' },
  { id: 'morse', label: 'Morse Code', hint: 'Alt+3' },
  { id: 'sign', label: 'Sign Language', hint: 'Alt+4' },
];

const TARGET_MODALITIES: Array<{ id: UniversalModality; label: string; hint: string }> = [
  { id: 'text', label: 'Text / Speech', hint: 'Alt+Shift+1' },
  { id: 'braille', label: 'Braille (Unicode + BRF)', hint: 'Alt+Shift+2' },
  { id: 'morse', label: 'Morse Code (Visual + WAV)', hint: 'Alt+Shift+3' },
  { id: 'sign', label: 'Sign Language (Avatar)', hint: 'Alt+Shift+4' },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<TopSection>('workbench');
  const [sourceModality, setSourceModality] = useState<UniversalModality>('text');
  const [targetModality, setTargetModality] = useState<UniversalModality>('braille');
  const [rawInput, setRawInput] = useState('hello please help');
  const [sourceLanguage, setSourceLanguage] = useState<SpokenLanguage>('Auto-Detect');
  const [targetLanguage, setTargetLanguage] =
    useState<Exclude<SpokenLanguage, 'Auto-Detect'>>('English');

  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>('standard');
  const [audioFeedback, setAudioFeedback] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const [modelConfig, setModelConfig] = useState<ModelAdapterConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_MODEL_CONFIG;
    try {
      const saved = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY);
      if (!saved) return DEFAULT_MODEL_CONFIG;
      return { ...DEFAULT_MODEL_CONFIG, ...(JSON.parse(saved) as Partial<ModelAdapterConfig>) };
    } catch {
      return DEFAULT_MODEL_CONFIG;
    }
  });

  const activeModelPreset = useMemo(
    () =>
      LOCAL_MODEL_PRESETS.find((p) => p.id === modelConfig.activeTierId) ??
      LOCAL_MODEL_PRESETS[1],
    [modelConfig.activeTierId]
  );

  const activeAssistantPreset = useMemo(
    () =>
      ONBOARDING_SLM_PRESETS.find((p) => p.id === modelConfig.activeAssistantTierId) ??
      ONBOARDING_SLM_PRESETS[0],
    [modelConfig.activeAssistantTierId]
  );

  const handleModelConfigChange = useCallback((next: ModelAdapterConfig) => {
    setModelConfig(next);
    try {
      window.localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failure
    }
  }, []);

  const [translating, setTranslating] = useState(false);
  const [apiTranslation, setApiTranslation] = useState<TranslationResult | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<string>('Offline Ready');
  const [copiedFlag, setCopiedFlag] = useState(false);
  const [listeningMic, setListeningMic] = useState(false);
  const [recordingAudioMode, setRecordingAudioMode] = useState(false);
  const [transcribingAudio, setTranscribingAudio] = useState(false);
  const [micInterim, setMicInterim] = useState('');
  const [micNote, setMicNote] = useState<string | null>(null);
  const [languagesDrawerOpen, setLanguagesDrawerOpen] = useState(false);

  const [dictionary, setDictionary] = useState<ParsedDictionary | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem(DICTIONARY_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as ParsedDictionary) : null;
    } catch {
      return null;
    }
  });

  const handleDictionaryChange = useCallback((next: ParsedDictionary | null) => {
    setDictionary(next);
    try {
      if (!next) {
        window.localStorage.removeItem(DICTIONARY_STORAGE_KEY);
      } else {
        window.localStorage.setItem(DICTIONARY_STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // Ignore storage quota overflow for large PDFs
    }
  }, []);

  const [referenceVisible, setReferenceVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = window.localStorage.getItem(REFERENCE_VISIBILITY_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [highlightedLetter, setHighlightedLetter] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Instant 100% offline bidirectional conversion via NormalizedIR
  const offlineConversion = useMemo(
    () =>
      convertBidirectionalOffline({
        rawInput,
        sourceModality,
        targetModality,
        sourceLanguage,
        targetLanguage,
        modelPresetLabel: activeModelPreset.modelName,
      }),
    [
      rawInput,
      sourceModality,
      targetModality,
      sourceLanguage,
      targetLanguage,
      activeModelPreset.modelName,
    ]
  );

  const triggerRowHighlight = useCallback((letter: string) => {
    const upper = letter.toUpperCase();
    if (!/^[A-Z]$/.test(upper)) return;
    setHighlightedLetter(upper);
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedLetter(null);
    }, 1000);
  }, []);

  const playSubtleFeedbackTone = useCallback(() => {
    if (!audioFeedback || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 540;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      window.setTimeout(() => void ctx.close(), 100);
    } catch {
      // Ignore audio policy errors
    }
  }, [audioFeedback]);

  const handleRawInputUpdate = useCallback(
    (nextText: string) => {
      setRawInput((prev) => {
        if (nextText.length > prev.length) {
          const addedChar = nextText.slice(-1);
          if (/^[a-zA-Z]$/.test(addedChar)) {
            triggerRowHighlight(addedChar);
          }
          playSubtleFeedbackTone();
        }
        return nextText;
      });
      setApiTranslation(null);
    },
    [triggerRowHighlight, playSubtleFeedbackTone]
  );

  const handleToggleReference = useCallback(() => {
    setReferenceVisible((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(REFERENCE_VISIBILITY_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const handleInsertReferenceLetter = useCallback(
    (char: string) => {
      setRawInput((prev) => prev + char);
      triggerRowHighlight(char);
      setApiTranslation(null);
    },
    [triggerRowHighlight]
  );

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    activeUtteranceRef.current = null;
    setSpeaking(false);
    setTtsStatus('Stopped');
  }, []);

  const speakText = useCallback(
    (textToSpeak: string, bcp47: string) => {
      if (!textToSpeak.trim()) return;
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setTtsStatus('Web Speech API unavailable in this browser');
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = bcp47;
      utterance.rate = speechRate;

      const voices = window.speechSynthesis.getVoices();
      const matched =
        voices.find((v) => v.lang.toLowerCase() === bcp47.toLowerCase()) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(bcp47.slice(0, 2).toLowerCase()));
      if (matched) {
        utterance.voice = matched;
      }

      utterance.onstart = () => {
        setSpeaking(true);
        setTtsStatus(`Speaking (${bcp47})`);
      };
      utterance.onend = () => {
        setSpeaking(false);
        setTtsStatus('Completed');
      };
      utterance.onerror = () => {
        setSpeaking(false);
        setTtsStatus(`Local TTS Ready (${bcp47})`);
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setTtsStatus(`Dispatched (${bcp47})`);
    },
    [speechRate]
  );

  const playMorseAudioOutput = useCallback((morse: string) => {
    if (typeof window === 'undefined' || !morse.trim()) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const unitSec = 0.075;
    let cursor = ctx.currentTime + 0.02;

    const scheduleTone = (durSec: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 650;
      gain.gain.setValueAtTime(0.001, cursor);
      gain.gain.linearRampToValueAtTime(0.2, cursor + 0.008);
      gain.gain.setValueAtTime(0.2, cursor + durSec - 0.008);
      gain.gain.linearRampToValueAtTime(0.001, cursor + durSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(cursor);
      osc.stop(cursor + durSec);
      cursor += durSec + unitSec;
    };

    for (const ch of morse) {
      if (ch === '.' || ch === '·') scheduleTone(unitSec);
      else if (ch === '-' || ch === '—') scheduleTone(unitSec * 3);
      else if (ch === ' ') cursor += unitSec * 2;
      else if (ch === '/') cursor += unitSec * 4;
    }

    const totalMs = Math.ceil((cursor - ctx.currentTime) * 1000) + 150;
    window.setTimeout(() => void ctx.close(), totalMs);
    setTtsStatus('Playing Morse tone');
  }, []);

  const runTranslationPipeline = useCallback(
    async (textOverride?: string, modalityOverride?: UniversalModality) => {
      const activeSource = modalityOverride ?? sourceModality;
      const inputStr = textOverride ?? rawInput;
      const normalized = convertBidirectionalOffline({
        rawInput: inputStr,
        sourceModality: activeSource,
        targetModality,
        sourceLanguage,
        targetLanguage,
        modelPresetLabel: activeModelPreset.modelName,
      });

      const directSourceText = normalized.ir.sourceText.trim();
      const canonicalText = normalized.ir.canonicalEnglish.trim();
      const textForServer = directSourceText || canonicalText;

      if (!textForServer) {
        setTranslationError('Enter or capture Text, Braille, Morse, or Sign input first.');
        return;
      }

      setTranslationError(null);

      // Respect explicit offline-only lock when toggled by user
      if (modelConfig.offlineOnlyMode) {
        setApiTranslation({
          sourceText: textForServer,
          detectedSourceLanguage: normalized.ir.detectedLanguage,
          translatedText: normalized.outputText,
          phoneticGuide:
            targetModality === 'braille'
              ? `BRF: ${normalized.brailleBrf}`
              : targetModality === 'morse'
                ? `Morse: ${normalized.morseCode}`
                : '',
          grammarNote: `Offline NormalizedIR · ${normalized.ir.detectedLanguage} -> ${targetLanguage} (${targetModality.toUpperCase()})`,
          targetLanguage,
          bcp47: normalized.bcp47,
          latencyMs: 2,
          estimatedTokens: Math.max(1, textForServer.split(/\s+/).length * 2),
          engine: normalized.engineLabel,
        });
        if (autoSpeak) {
          speakText(
            targetModality === 'text' ? normalized.outputText : textForServer,
            normalized.bcp47
          );
        }
        return;
      }

      setTranslating(true);
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textForServer,
            sourceLanguage:
              sourceLanguage === 'Auto-Detect' ? 'Auto-Detect' : normalized.ir.detectedLanguage,
            targetLanguage,
            sourceModality: activeSource,
            modelName: activeModelPreset.modelName,
          }),
        });
        const payload = (await res.json()) as TranslationResult & { error?: string };
        if (!res.ok) {
          throw new Error(payload.error || `Translation failed (${res.status})`);
        }
        setApiTranslation(payload);
        if (autoSpeak) {
          speakText(payload.translatedText, payload.bcp47);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Server unreachable';
        setApiTranslation({
          sourceText: textForServer,
          detectedSourceLanguage: normalized.ir.detectedLanguage,
          translatedText: normalized.outputText,
          phoneticGuide: '',
          grammarNote: `Offline fallback active (${errMsg})`,
          targetLanguage,
          bcp47: normalized.bcp47,
          latencyMs: 2,
          estimatedTokens: textForServer.split(/\s+/).length * 2,
          engine: normalized.engineLabel,
        });
      } finally {
        setTranslating(false);
      }
    },
    [
      sourceModality,
      rawInput,
      targetModality,
      sourceLanguage,
      targetLanguage,
      activeModelPreset.modelName,
      modelConfig.offlineOnlyMode,
      autoSpeak,
      speakText,
    ]
  );

  // Automatically translate via Gemma when Target Language differs from source language (supports non-English inputs too)
  useEffect(() => {
    if (modelConfig.offlineOnlyMode) return;
    const trimmed = offlineConversion.ir.sourceText.trim();
    if (!trimmed) return;
    if (
      targetLanguage === offlineConversion.ir.detectedLanguage &&
      sourceLanguage !== 'Auto-Detect' &&
      sourceModality !== 'sign'
    ) {
      return;
    }
    if (
      targetLanguage === offlineConversion.ir.detectedLanguage &&
      sourceLanguage === 'Auto-Detect' &&
      sourceModality !== 'sign'
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runTranslationPipeline(rawInput, sourceModality);
    }, 800);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    targetLanguage,
    sourceLanguage,
    sourceModality,
    modelConfig.offlineOnlyMode,
    activeModelPreset.modelName,
    offlineConversion.ir.sourceText,
  ]);

  const transcribeAudioBlob = useCallback(
    async (blob: Blob) => {
      setTranscribingAudio(true);
      setMicNote('Transcribing spoken audio...');
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            const idx = result.indexOf(',');
            resolve(idx >= 0 ? result.slice(idx + 1) : result);
          };
          reader.onerror = () => reject(new Error('Unable to read recorded audio bytes.'));
          reader.readAsDataURL(blob);
        });

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: blob.type || 'audio/webm',
            languageHint: sourceLanguage,
          }),
        });
        const payload = (await res.json()) as {
          transcript?: string;
          engine?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(payload.error || 'Transcription request failed.');
        }
        const spoken = (payload.transcript ?? '').trim();
        if (!spoken) {
          setMicNote('No clear speech detected in that clip. Try speaking closer to your microphone.');
          return;
        }
        setSourceModality('text');
        handleRawInputUpdate(spoken);
        setMicNote(`Transcribed via ${payload.engine ?? 'Gemini Audio'}: "${spoken}"`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Audio transcription failed.';
        setMicNote(`Voice transcription error: ${msg}`);
      } finally {
        setTranscribingAudio(false);
      }
    },
    [sourceLanguage, handleRawInputUpdate]
  );

  const stopMicStream = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  }, []);

  const startMediaRecorderFallback = useCallback(
    async (reasonMessage?: string) => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setMicNote(
          reasonMessage ||
            'Microphone recording API is unavailable in this browser; use "Upload Audio" or type directly.'
        );
        setListeningMic(false);
        setRecordingAudioMode(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';
        const recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);

        audioChunksRef.current = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };
        recorder.onstop = () => {
          stopMicStream();
          setListeningMic(false);
          setRecordingAudioMode(false);
          const recordedBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          audioChunksRef.current = [];
          if (recordedBlob.size > 0) {
            void transcribeAudioBlob(recordedBlob);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250);
        setRecordingAudioMode(true);
        setListeningMic(true);
        setMicNote(
          reasonMessage
            ? `${reasonMessage} Recording microphone audio—click "Stop & Transcribe" when finished.`
            : 'Recording microphone audio—click "Stop & Transcribe" when finished.'
        );
      } catch (err: unknown) {
        stopMicStream();
        setListeningMic(false);
        setRecordingAudioMode(false);
        const msg = err instanceof Error ? err.message : 'Permission denied';
        setMicNote(
          `Microphone permission error (${msg}). Allow mic access in browser settings or use "Upload Audio".`
        );
      }
    },
    [stopMicStream, transcribeAudioBlob]
  );

  const handleToggleMic = useCallback(async () => {
    if (listeningMic) {
      if (recordingAudioMode && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        return;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopMicStream();
      setListeningMic(false);
      setMicInterim('');
      return;
    }

    const activeLangCode =
      sourceLanguage === 'Auto-Detect'
        ? (typeof navigator !== 'undefined' && navigator.language) || 'en-US'
        : LANGUAGE_BCP47[sourceLanguage];

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstanceLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstanceLike;
    };
    const Rec = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!Rec) {
      await startMediaRecorderFallback(
        'Live Web Speech API unavailable in this browser;'
      );
      return;
    }

    // Unlock microphone permission first so iframes prompt reliably
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const probeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        probeStream.getTracks().forEach((t) => t.stop());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Microphone blocked';
        setMicNote(
          `Microphone access denied (${msg}). Check browser mic permissions or click "Upload Audio".`
        );
        return;
      }
    }

    setMicNote(`Listening in ${activeLangCode}... speak clearly, then click Stop Dictation.`);
    setMicInterim('');
    const recognition = new Rec();
    recognition.lang = activeLangCode;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (ev) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = 0; i < ev.results.length; i++) {
        const res = ev.results[i];
        const transcript = res[0]?.transcript ?? '';
        if (res.isFinal) {
          finalChunk += `${transcript} `;
        } else {
          interimChunk += transcript;
        }
      }
      setMicInterim(interimChunk.trim());
      if (finalChunk.trim()) {
        setSourceModality('text');
        handleRawInputUpdate(finalChunk.trim());
      }
    };

    recognition.onerror = (ev) => {
      const code = ev?.error || 'unknown';
      recognitionRef.current = null;
      setListeningMic(false);
      setMicInterim('');
      if (code === 'network' || code === 'service-not-allowed') {
        void startMediaRecorderFallback(
          'Browser cloud speech service unavailable here; switched to direct mic recording.'
        );
      } else if (code !== 'aborted') {
        setMicNote(
          `Voice recognition issue (${code}). Try "Upload Audio" or switch source language.`
        );
      }
    };

    recognition.onend = () => {
      setListeningMic(false);
      setMicInterim('');
    };

    recognitionRef.current = recognition;
    setListeningMic(true);
    try {
      recognition.start();
    } catch {
      setListeningMic(false);
      await startMediaRecorderFallback('Switched to microphone audio recorder.');
    }
  }, [
    listeningMic,
    recordingAudioMode,
    sourceLanguage,
    stopMicStream,
    startMediaRecorderFallback,
    handleRawInputUpdate,
  ]);

  const handleCopyOutput = async () => {
    const textToCopy =
      targetModality === 'text' && apiTranslation
        ? apiTranslation.translatedText
        : offlineConversion.outputText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedFlag(true);
      window.setTimeout(() => setCopiedFlag(false), 1500);
    } catch {
      // fallback
    }
  };

  const downloadBlob = (filename: string, bytes: BlobPart, mime: string) => {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRunDemoPhrase = () => {
    const sample =
      sourceModality === 'sign'
        ? 'HELLO PLEASE HELP'
        : sourceModality === 'morse'
          ? '... --- ...'
          : sourceModality === 'braille'
            ? '⠓⠑⠇⠏'
            : 'hello please help';
    setActiveSection('workbench');
    setRawInput(sample);
    void runTranslationPipeline(sample, sourceModality);
  };

  // Global keyboard-only accessibility shortcuts (Ctrl+/, Alt+1..4 source, Alt+Shift+1..4 target, Alt+H contrast)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setAssistantOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape' && assistantOpen) {
        setAssistantOpen(false);
        return;
      }
      if (!e.altKey) return;
      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setHighContrast((prev) => !prev);
        return;
      }
      const idxMap: Record<string, UniversalModality> = {
        '1': 'text',
        '2': 'braille',
        '3': 'morse',
        '4': 'sign',
      };
      const matched = idxMap[e.key];
      if (!matched) return;
      e.preventDefault();
      if (e.shiftKey) {
        setTargetModality(matched);
      } else {
        if (matched === 'sign' && rawInput === 'hello please help') {
          setRawInput('');
          setApiTranslation(null);
        }
        setSourceModality(matched);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [assistantOpen, rawInput]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [activeRustFileId, setActiveRustFileId] = useState<string>('cargo');

  const handleOpenRustFile = (filename: string) => {
    const mappedId = RUST_FILENAME_TO_ID[filename] ?? 'cargo';
    setActiveRustFileId(mappedId);
    setActiveSection('rust-code');
  };

  const navItems: Array<{ id: TopSection; label: string }> = [
    { id: 'workbench', label: 'Live Pipeline' },
    { id: 'models', label: 'Models' },
    { id: 'desktop', label: 'Desktop .exe' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'rust-code', label: 'Rust Code' },
    { id: 'slt-plan', label: 'SLT Plan' },
    { id: 'benchmarks', label: 'Benchmarks' },
  ];

  const shellClasses = highContrast
    ? 'bg-black text-white'
    : 'bg-slate-50 text-slate-900';
  const headerClasses = highContrast
    ? 'bg-black border-white text-white'
    : 'bg-white/95 backdrop-blur-xs border-slate-200 text-slate-900';
  const panelClasses = highContrast
    ? 'bg-black border-white text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const subSurfaceClasses = highContrast
    ? 'bg-zinc-950 border-white/70 text-white'
    : 'bg-slate-50 border-slate-200 text-slate-900';
  const mutedClasses = highContrast ? 'text-yellow-300' : 'text-slate-600';
  const fontScaleClass =
    fontScale === 'xl'
      ? 'text-lg'
      : fontScale === 'large'
        ? 'text-base'
        : 'text-sm';

  const gemmaBraille = useMemo(
    () =>
      apiTranslation && apiTranslation.targetLanguage === targetLanguage
        ? encodeTextToBrf(apiTranslation.translatedText)
        : null,
    [apiTranslation, targetLanguage]
  );

  const effectiveBrailleBrf = gemmaBraille
    ? gemmaBraille.brf
    : offlineConversion.brailleBrf;

  const effectiveMorseCode = useMemo(
    () =>
      apiTranslation && apiTranslation.targetLanguage === targetLanguage
        ? encodeTextToMorse(apiTranslation.translatedText)
        : offlineConversion.morseCode,
    [apiTranslation, targetLanguage, offlineConversion.morseCode]
  );

  const effectiveSignSequence = useMemo(
    () =>
      apiTranslation && apiTranslation.targetLanguage === targetLanguage
        ? textToSignFingerspellSequence(apiTranslation.sourceText || apiTranslation.translatedText)
        : offlineConversion.signSequence,
    [apiTranslation, targetLanguage, offlineConversion.signSequence]
  );

  const displayedMainOutput = useMemo(() => {
    if (apiTranslation && apiTranslation.targetLanguage === targetLanguage) {
      if (targetModality === 'text') return apiTranslation.translatedText;
      if (targetModality === 'braille' && gemmaBraille) return gemmaBraille.unicode;
      if (targetModality === 'morse') return effectiveMorseCode;
      if (targetModality === 'sign') {
        return effectiveSignSequence.map((g) => (g === 'SPACE' ? '·' : g)).join(' ');
      }
    }
    return offlineConversion.outputText;
  }, [
    apiTranslation,
    targetLanguage,
    targetModality,
    gemmaBraille,
    effectiveMorseCode,
    effectiveSignSequence,
    offlineConversion.outputText,
  ]);

  return (
    <div
      data-high-contrast={highContrast ? 'true' : 'false'}
      className={`min-h-screen flex flex-col ${shellClasses} ${fontScaleClass}`}
    >
      {/* Three-Zone Top Bar Contract */}
      <header className={`sticky top-0 z-30 border-b ${headerClasses}`}>
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('workbench');
            }}
            className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap shrink-0"
          >
            SignBridge Offline
          </a>

          <nav
            className="hidden lg:flex items-center gap-5"
            aria-label="Primary sections"
          >
            {navItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? highContrast
                        ? 'border-sky-400 text-sky-400'
                        : 'border-blue-600 text-slate-900'
                      : highContrast
                        ? 'border-transparent text-white/80 hover:text-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleRunDemoPhrase}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                highContrast
                  ? 'bg-sky-400 text-black hover:bg-sky-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Run Demo Phrase
            </button>
          </div>
        </div>

        {/* Tablet/Mobile Secondary Nav Row */}
        <nav
          className="lg:hidden px-4 pb-2 flex items-center gap-2 overflow-x-auto border-t border-slate-100/40"
          aria-label="Mobile sections"
        >
          {navItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                  active
                    ? highContrast
                      ? 'bg-sky-400 text-black'
                      : 'bg-blue-50 text-blue-700'
                    : highContrast
                      ? 'text-white'
                      : 'text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main id="top" className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Compact Accessibility, Onboarding SLM & Model Adapter Strip */}
        <div
          className={`rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs ${panelClasses}`}
          aria-label="Accessibility and local model bar"
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setAssistantOpen((prev) => !prev)}
              aria-expanded={assistantOpen}
              data-testid="toggle-assistant-btn"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium whitespace-nowrap ${
                assistantOpen
                  ? highContrast
                    ? 'bg-sky-400 text-black border-sky-400'
                    : 'bg-blue-600 text-white border-blue-600'
                  : highContrast
                    ? 'bg-black border-white text-white hover:bg-zinc-900'
                    : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>SLM Assistant (Ctrl+/)</span>
            </button>

            <button
              type="button"
              onClick={() => setHighContrast((prev) => !prev)}
              aria-pressed={highContrast}
              data-testid="high-contrast-toggle"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium whitespace-nowrap ${
                highContrast
                  ? 'bg-yellow-300 text-black border-yellow-300'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>High Contrast (Alt+H)</span>
            </button>

            <label className="inline-flex items-center gap-1.5">
              <span className={mutedClasses}>Text Size</span>
              <select
                aria-label="Accessibility text size"
                data-testid="font-size-select"
                value={fontScale}
                onChange={(e) => setFontScale(e.target.value as FontScale)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  highContrast
                    ? 'bg-black border-white text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="standard">Standard</option>
                <option value="large">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={audioFeedback}
                onChange={(e) => setAudioFeedback(e.target.checked)}
                className="accent-blue-600"
              />
              <span>Keystroke audio cue</span>
            </label>
          </div>

          <div className={`flex flex-wrap items-center gap-2 font-mono ${mutedClasses}`}>
            <button
              type="button"
              data-testid="gemma-mode-toggle"
              aria-pressed={!modelConfig.offlineOnlyMode}
              onClick={() =>
                handleModelConfigChange({
                  ...modelConfig,
                  offlineOnlyMode: !modelConfig.offlineOnlyMode,
                })
              }
              className={`px-2 py-0.5 rounded border text-[11px] font-sans font-semibold whitespace-nowrap ${
                !modelConfig.offlineOnlyMode
                  ? highContrast
                    ? 'bg-sky-400 text-black border-sky-400'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : highContrast
                    ? 'bg-black border-white text-white'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              {modelConfig.offlineOnlyMode ? 'Offline Engine Only' : 'Gemma 4 Translation Active'}
            </button>
            <span aria-hidden="true">·</span>
            <span>
              SLM: {activeAssistantPreset.tierLabel} · Trans: {activeModelPreset.tierLabel}
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('models')}
              className="underline hover:no-underline font-sans font-medium"
            >
              Swap Models
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('desktop')}
              className="underline hover:no-underline font-sans font-medium"
            >
              Windows .exe Package
            </button>
          </div>
        </div>

        <OnboardingAssistantPanel
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          context={{
            activeSection,
            sourceModality,
            targetModality,
            sourceLanguage,
            targetLanguage,
            cameraActive: false,
            slmAvailable: modelConfig.slmAvailable,
            assistantPreset: activeAssistantPreset,
          }}
          onSelectAssistantTier={(tierId: AssistantSlmTierId) =>
            handleModelConfigChange({ ...modelConfig, activeAssistantTierId: tierId })
          }
          onToggleSlmAvailable={() =>
            handleModelConfigChange({
              ...modelConfig,
              slmAvailable: !modelConfig.slmAvailable,
            })
          }
          onOpenModelsTab={() => {
            setActiveSection('models');
            setAssistantOpen(false);
          }}
          highContrast={highContrast}
        />

        {activeSection === 'workbench' && (
          <>
            {/* Editorial Summary & Bidirectional Modality Selectors */}
            <section className="space-y-5 pb-5 border-b border-slate-200">
              <div className="space-y-2 max-w-4xl">
                <div className={`text-xs flex flex-wrap items-center gap-2 ${mutedClasses}`}>
                  <span>100% Offline NormalizedIR Engine</span>
                  <span aria-hidden="true">·</span>
                  <span>Text ↔ Braille (Unicode/BRF) ↔ Morse (WAV) ↔ Sign</span>
                  <span aria-hidden="true">·</span>
                  <span>Keyboard-First (Alt+1..4 Source · Alt+Shift+1..4 Target)</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">
                  Bidirectional Offline Accessibility Translator
                </h1>
                <p className={`text-sm sm:text-base ${mutedClasses}`}>
                  Type normal text to auto-convert into Braille, Morse code, or Sign Language—or enter Braille, Morse, or webcam Sign gestures to decode into plain text, speech, or any target modality offline.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Source Modality Selector */}
                <div className={`rounded-xl border p-3.5 space-y-2 ${panelClasses}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Source Input Modality
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-xs">
                      <span className={mutedClasses}>Language</span>
                      <select
                        aria-label="Source spoken language"
                        data-testid="source-language-select"
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value as SpokenLanguage)}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          highContrast
                            ? 'bg-black border-white text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="Auto-Detect">Auto-Detect (Any Language)</option>
                        {SPOKEN_LANGUAGE_CATALOG.map((lang) => (
                          <option key={lang.id} value={lang.id}>
                            {lang.id} ({lang.nativeName})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    role="tablist"
                    aria-label="Source input modality"
                  >
                    {SOURCE_MODALITIES.map((item) => {
                      const active = sourceModality === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          data-testid={`source-tab-${item.id}`}
                          onClick={() => {
                            if (item.id === 'sign' && rawInput === 'hello please help') {
                              setRawInput('');
                              setApiTranslation(null);
                            }
                            setSourceModality(item.id);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            active
                              ? highContrast
                                ? 'bg-sky-400 text-black font-bold'
                                : 'bg-slate-900 text-white'
                              : highContrast
                                ? 'border border-white/50 text-white hover:bg-zinc-900'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Modality & Output Language Selector */}
                <div className={`rounded-xl border p-3.5 space-y-2.5 ${panelClasses}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Target Output Modality &amp; Language
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs">
                        <span className={mutedClasses}>Output Language</span>
                        <select
                          id="target-language-select"
                          data-testid="target-language-select"
                          aria-label="Output spoken language"
                          value={targetLanguage}
                          onChange={(e) =>
                            setTargetLanguage(
                              e.target.value as Exclude<SpokenLanguage, 'Auto-Detect'>
                            )
                          }
                          className={`rounded-md border px-2 py-1 text-xs font-medium ${
                            highContrast
                              ? 'bg-black border-white text-white'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        >
                          {SPOKEN_LANGUAGE_CATALOG.map((lang) => (
                            <option key={lang.id} value={lang.id}>
                              {lang.id} ({lang.nativeName})
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        data-testid="toggle-supported-languages-btn"
                        aria-expanded={languagesDrawerOpen}
                        onClick={() => setLanguagesDrawerOpen((v) => !v)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium whitespace-nowrap ${
                          languagesDrawerOpen
                            ? 'bg-blue-600 text-white border-blue-600'
                            : highContrast
                              ? 'border-white text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Globe2 className="w-3.5 h-3.5" />
                        Languages ({SPOKEN_LANGUAGE_CATALOG.length})
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    role="tablist"
                    aria-label="Target output modality"
                  >
                    {TARGET_MODALITIES.map((item) => {
                      const active = targetModality === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          data-testid={`target-tab-${item.id}`}
                          onClick={() => setTargetModality(item.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            active
                              ? highContrast
                                ? 'bg-yellow-300 text-black font-bold'
                                : 'bg-blue-600 text-white'
                              : highContrast
                                ? 'border border-white/50 text-white hover:bg-zinc-900'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {languagesDrawerOpen && (
                    <div
                      data-testid="supported-languages-panel"
                      className={`rounded-lg border p-3 space-y-2 ${subSurfaceClasses}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">
                          Supported Output Languages ({SPOKEN_LANGUAGE_CATALOG.length}) — click to translate
                        </span>
                        <span className={`text-[11px] ${mutedClasses}`}>
                          Supports English &amp; non-English pairs
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {SPOKEN_LANGUAGE_CATALOG.map((lang) => {
                          const selected = targetLanguage === lang.id;
                          return (
                            <button
                              key={lang.id}
                              type="button"
                              data-testid={`choose-lang-${lang.id}`}
                              onClick={() => {
                                setTargetLanguage(lang.id);
                                if (targetModality !== 'text') {
                                  setTargetModality('text');
                                }
                              }}
                              className={`px-2 py-1.5 rounded-md border text-left text-xs transition-colors ${
                                selected
                                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                  : highContrast
                                    ? 'border-white/50 text-white hover:bg-zinc-900'
                                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
                              }`}
                            >
                              <div className="truncate">{lang.id}</div>
                              <div className={`text-[10px] truncate ${selected ? 'text-blue-100' : mutedClasses}`}>
                                {lang.nativeName}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Primary Interactive Bidirectional Pipeline Workbench */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left 7 Columns: Active Input Modality Capture */}
              <div className={`xl:col-span-7 rounded-xl border p-6 space-y-5 ${panelClasses}`}>
                {sourceModality === 'text' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-semibold">
                          Standard Keyboard &amp; Speech Input
                        </h2>
                        <p className={`text-xs ${mutedClasses}`}>
                          Type or speak in English or any supported non-English language—translates to {targetLanguage} ({targetModality.toUpperCase()}).
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={voiceFileInputRef}
                          type="file"
                          accept="audio/*"
                          data-testid="voice-file-input"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void transcribeAudioBlob(f);
                            e.target.value = '';
                          }}
                          className="sr-only"
                          aria-label="Upload audio clip for speech transcription"
                        />
                        <button
                          type="button"
                          data-testid="mic-input-btn"
                          disabled={transcribingAudio}
                          onClick={() => void handleToggleMic()}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap disabled:opacity-60 ${
                            listeningMic
                              ? 'bg-red-600 text-white border-red-600'
                              : highContrast
                                ? 'border-white text-white hover:bg-zinc-900'
                                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {listeningMic ? (
                            <MicOff className="w-3.5 h-3.5" />
                          ) : (
                            <Mic className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {transcribingAudio
                              ? 'Transcribing...'
                              : listeningMic
                                ? recordingAudioMode
                                  ? 'Stop & Transcribe'
                                  : 'Stop Dictation'
                                : 'Mic Speech Input'}
                          </span>
                        </button>
                        <button
                          type="button"
                          data-testid="upload-voice-audio-btn"
                          disabled={transcribingAudio}
                          onClick={() => voiceFileInputRef.current?.click()}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap disabled:opacity-60 ${
                            highContrast
                              ? 'border-white text-white hover:bg-zinc-900'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Audio Clip</span>
                        </button>
                      </div>
                    </div>

                    {(micNote || micInterim) && (
                      <div
                        data-testid="mic-status-banner"
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1"
                      >
                        {micNote && <div>{micNote}</div>}
                        {micInterim && (
                          <div className="font-mono text-amber-950">
                            Heard: &ldquo;{micInterim}&rdquo;
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={mutedClasses}>Quick Phrases:</span>
                      {[
                        'hello please help',
                        'Hola, ¿dónde está el agua?',
                        'こんにちは、助けてください',
                        'नमस्ते, कृपया मदद करें',
                        'thank you',
                      ].map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => handleRawInputUpdate(phrase)}
                          className={`px-2.5 py-1 rounded-md border font-mono transition-colors ${
                            highContrast
                              ? 'border-white/70 text-white hover:bg-zinc-900'
                              : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sourceModality === 'braille' && (
                  <BraillePad
                    decodedText={rawInput}
                    onDecodedTextChange={handleRawInputUpdate}
                  />
                )}

                {sourceModality === 'morse' && (
                  <MorseKeyer
                    decodedText={rawInput}
                    onDecodedTextChange={handleRawInputUpdate}
                  />
                )}

                {sourceModality === 'sign' && (
                  <SignMediaPipeStage
                    decodedText={rawInput}
                    onDecodedTextChange={handleRawInputUpdate}
                    onTriggerTranslateAndSpeak={(txt) =>
                      void runTranslationPipeline(txt, 'sign')
                    }
                  />
                )}

                {/* Unified Input Buffer (Supports typing, Unicode Braille paste, BRF paste, or Morse dots/dashes) */}
                <div className="border-t border-slate-200/70 pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="decoded-english-input"
                      className="text-sm font-semibold"
                    >
                      1. Active Input Buffer ({sourceModality === 'text' ? 'Normal Keyboard' : sourceModality.toUpperCase()})
                    </label>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono tabular-nums ${mutedClasses}`}>
                        {rawInput.length} chars
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRawInputUpdate('')}
                        className="text-xs underline hover:no-underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <textarea
                    id="decoded-english-input"
                    data-testid="primary-input-buffer"
                    rows={3}
                    value={rawInput}
                    onChange={(e) => handleRawInputUpdate(e.target.value)}
                    placeholder={
                      sourceModality === 'braille'
                        ? 'Use 6-dot pad above or paste Unicode Braille (⠓⠑⠇⠏) / ASCII BRF (HELP)...'
                        : sourceModality === 'morse'
                          ? 'Key Morse above or type dots/dashes (.... . .-.. .--.)...'
                          : sourceModality === 'sign'
                            ? 'Capture webcam ASL gestures above or enter gloss tokens...'
                            : 'Type normal English or another spoken language to auto-convert...'
                    }
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none ${
                      highContrast
                        ? 'bg-black border-white text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Right 5 Columns: NormalizedIR -> Live Target Output + Audio/Sign + Exports */}
              <div className={`xl:col-span-5 rounded-xl border p-6 space-y-5 ${panelClasses}`}>
                {/* NormalizedIR Transparency Strip */}
                <div className={`rounded-lg border p-3 space-y-1 text-xs ${subSurfaceClasses}`}>
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold">NormalizedIR</span>
                    <span className={mutedClasses}>
                      Detected: {offlineConversion.ir.detectedLanguage}
                    </span>
                  </div>
                  <div className={`font-mono break-words ${mutedClasses}`}>
                    Canonical: "{offlineConversion.ir.canonicalEnglish || '—'}"
                  </div>
                </div>

                {/* Live Auto-Converted Output */}
                <div className="space-y-3" aria-live="polite">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      2. Converted Output ({targetModality.toUpperCase()})
                    </span>
                    <span className={`text-xs font-mono ${mutedClasses}`}>{ttsStatus}</span>
                  </div>

                  <div
                    className={`p-4 rounded-xl border space-y-3 ${subSurfaceClasses}`}
                    data-testid="translation-output-card"
                  >
                    <div className={`flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums ${mutedClasses}`}>
                      <span>
                        {targetLanguage} ({offlineConversion.bcp47})
                      </span>
                      <span data-testid="translation-engine-badge">
                        {translating
                          ? 'Gemma Translating...'
                          : apiTranslation && apiTranslation.targetLanguage === targetLanguage
                            ? apiTranslation.engine
                            : modelConfig.offlineOnlyMode
                              ? 'Offline Local Engine'
                              : `${activeModelPreset.modelName} Ready`}
                      </span>
                    </div>

                    <div
                      className={`font-semibold leading-snug break-words ${
                        targetModality === 'braille'
                          ? 'text-2xl tracking-wider'
                          : targetModality === 'morse'
                            ? 'text-lg font-mono tracking-wide'
                            : 'text-lg'
                      }`}
                      data-testid="translated-text-value"
                    >
                      {displayedMainOutput || '—'}
                    </div>

                    {apiTranslation &&
                      apiTranslation.targetLanguage === targetLanguage &&
                      (apiTranslation.phoneticGuide || apiTranslation.grammarNote || targetModality !== 'text') && (
                        <div
                          data-testid="gemma-translation-details"
                          className={`rounded-lg border p-2.5 text-xs space-y-1 ${
                            highContrast
                              ? 'bg-black border-white/60 text-white'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {targetModality !== 'text' && (
                            <div>
                              <span className="font-semibold">Gemma ({targetLanguage}):</span>{' '}
                              {apiTranslation.translatedText}
                            </div>
                          )}
                          {apiTranslation.phoneticGuide && (
                            <div className="font-mono">
                              <span className="font-sans font-semibold">Pronunciation:</span>{' '}
                              {apiTranslation.phoneticGuide}
                            </div>
                          )}
                          {apiTranslation.grammarNote && (
                            <div className={mutedClasses}>
                              {apiTranslation.grammarNote} · {apiTranslation.latencyMs}ms
                            </div>
                          )}
                        </div>
                      )}

                    {targetModality === 'braille' && (
                      <div className={`text-xs font-mono pt-2 border-t border-slate-200/70 ${mutedClasses}`}>
                        ASCII BRF Embosser Format:{' '}
                        <span data-testid="braille-brf-output" className="font-semibold">
                          {effectiveBrailleBrf || '—'}
                        </span>
                      </div>
                    )}

                    {targetModality === 'morse' && (
                      <div className={`text-xs font-mono pt-2 border-t border-slate-200/70 ${mutedClasses}`}>
                        Plain Text Mirror:{' '}
                        {apiTranslation && apiTranslation.targetLanguage === targetLanguage
                          ? apiTranslation.translatedText
                          : offlineConversion.ir.canonicalEnglish || '—'}
                      </div>
                    )}

                    {targetModality === 'sign' && (
                      <SignOutputAvatar
                        signSequence={effectiveSignSequence}
                        highContrast={highContrast}
                      />
                    )}

                    {/* Playback & Export Controls */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() =>
                          speakText(
                            targetModality === 'text'
                              ? displayedMainOutput
                              : apiTranslation && apiTranslation.targetLanguage === targetLanguage
                                ? apiTranslation.translatedText
                                : offlineConversion.ir.canonicalEnglish,
                            offlineConversion.bcp47
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                          highContrast
                            ? 'bg-sky-400 text-black hover:bg-sky-300'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Speak
                      </button>

                      {speaking && (
                        <button
                          type="button"
                          onClick={stopSpeech}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Stop
                        </button>
                      )}

                      {targetModality === 'morse' && (
                        <button
                          type="button"
                          onClick={() => playMorseAudioOutput(offlineConversion.morseCode)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${
                            highContrast
                              ? 'border-white text-white hover:bg-zinc-900'
                              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          Play Morse Tone
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleCopyOutput()}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${
                          highContrast
                            ? 'border-white text-white hover:bg-zinc-900'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {copiedFlag ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedFlag ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Export Files & Speech Controls */}
                <div className="border-t border-slate-200/70 pt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid="export-txt-btn"
                      onClick={() =>
                        downloadBlob(
                          'signbridge-output.txt',
                          displayedMainOutput,
                          'text/plain;charset=utf-8'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${
                        highContrast
                          ? 'border-white text-white hover:bg-zinc-900'
                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save .txt
                    </button>

                    <button
                      type="button"
                      data-testid="export-brf-btn"
                      onClick={() =>
                        downloadBlob(
                          'signbridge-braille.brf',
                          effectiveBrailleBrf,
                          'text/plain;charset=ascii'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${
                        highContrast
                          ? 'border-white text-white hover:bg-zinc-900'
                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export .brf
                    </button>

                    <button
                      type="button"
                      data-testid="export-wav-btn"
                      onClick={() => {
                        const wavBytes = generateMorseWavBytes(effectiveMorseCode);
                        downloadBlob(
                          'signbridge-morse.wav',
                          new Uint8Array(wavBytes),
                          'audio/wav'
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap ${
                        highContrast
                          ? 'border-white text-white hover:bg-zinc-900'
                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <FileAudio className="w-3.5 h-3.5" />
                      Export Morse .wav
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className={`flex flex-wrap items-center gap-3 text-xs ${mutedClasses}`}>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoSpeak}
                          onChange={(e) => setAutoSpeak(e.target.checked)}
                          className="accent-blue-600"
                        />
                        <span>Auto-speak</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 tabular-nums">
                        <span>Rate {speechRate.toFixed(1)}x</span>
                        <input
                          type="range"
                          min={0.7}
                          max={1.4}
                          step={0.1}
                          value={speechRate}
                          onChange={(e) => setSpeechRate(Number(e.target.value))}
                          className="w-16 accent-blue-600"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      data-testid="translate-gemma-btn"
                      onClick={() => void runTranslationPipeline()}
                      disabled={translating}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap ${
                        highContrast
                          ? 'bg-yellow-300 text-black hover:bg-yellow-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <span>
                        {translating
                          ? 'Translating...'
                          : modelConfig.offlineOnlyMode
                            ? 'Offline Translate & Speak'
                            : 'Translate via Gemma & Speak'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {translationError && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
                    >
                      {translationError}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Uploaded .pdf / .txt Dictionary & Word Understanding Helper */}
            <DictionaryHelperPanel
              dictionary={dictionary}
              onDictionaryChange={handleDictionaryChange}
              sourceText={offlineConversion.ir.sourceText}
              translatedText={
                apiTranslation && apiTranslation.targetLanguage === targetLanguage
                  ? apiTranslation.translatedText
                  : offlineConversion.outputText
              }
              targetLanguage={targetLanguage}
              bcp47={offlineConversion.bcp47}
              onSpeakText={speakText}
              highContrast={highContrast}
            />

            {/* Collapsible Morse / Braille Reference Table */}
            <ReferenceTablePanel
              visible={referenceVisible}
              onToggleVisible={handleToggleReference}
              highlightedLetter={highlightedLetter}
              onSelectLetter={handleInsertReferenceLetter}
            />
          </>
        )}

        {activeSection === 'models' && (
          <ModelManagerView
            config={modelConfig}
            onChangeConfig={handleModelConfigChange}
            highContrast={highContrast}
          />
        )}

        {activeSection === 'desktop' && (
          <DesktopPackageView highContrast={highContrast} />
        )}

        {activeSection === 'architecture' && (
          <ArchitectureDiagram onOpenRustFile={handleOpenRustFile} />
        )}

        {activeSection === 'rust-code' && (
          <RustCodeExplorer
            activeFileId={activeRustFileId}
            onSelectFileId={setActiveRustFileId}
          />
        )}

        {activeSection === 'slt-plan' && <SltMigrationPlan />}

        {activeSection === 'benchmarks' && <BenchmarksView />}
      </main>

      <footer className={`border-t mt-12 ${highContrast ? 'bg-black border-white text-white' : 'bg-white border-slate-200 text-slate-500'}`}>
        <div className="max-w-[1360px] mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <span>
            SignBridge Offline &amp; Rust Suite · Bidirectional Spoken / Braille / Morse / Sign Translator
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('models')}
              className="hover:underline"
            >
              Model Adapter
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('desktop')}
              className="hover:underline"
            >
              Windows .exe Guide
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('architecture')}
              className="hover:underline"
            >
              Architecture
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('rust-code')}
              className="hover:underline"
            >
              Rust Crates
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
