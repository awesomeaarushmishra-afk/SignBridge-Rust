import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  classifyPressDuration,
  decodeMorseSequence,
  encodeTextToMorse,
  getMorseTimingConfig,
} from '../utils/morseDecoder';

interface MorseKeyerProps {
  decodedText: string;
  onDecodedTextChange: (nextText: string) => void;
}

export function MorseKeyer({ decodedText, onDecodedTextChange }: MorseKeyerProps) {
  const [wpm, setWpm] = useState(14);
  const [morseSequence, setMorseSequence] = useState('');
  const [currentToken, setCurrentToken] = useState('');
  const [isPressing, setIsPressing] = useState(false);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const [sidetoneEnabled, setSidetoneEnabled] = useState(true);
  const [spacePaddleEnabled, setSpacePaddleEnabled] = useState(false);

  const pressStartRef = useRef<number | null>(null);
  const letterTimerRef = useRef<number | null>(null);
  const wordTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const timing = getMorseTimingConfig(wpm);

  const lastSyncedMorsePropRef = useRef<string | null>(null);

  // Sync external edits to decodedText back into Morse visualization without render loops
  useEffect(() => {
    if (decodedText === lastSyncedMorsePropRef.current) return;
    lastSyncedMorsePropRef.current = decodedText;

    const trimmed = decodedText.trim();
    if (/^[.\-·—–_\s/]+$/.test(trimmed)) {
      setMorseSequence(trimmed);
      setCurrentToken('');
      return;
    }

    setMorseSequence(encodeTextToMorse(decodedText));
    setCurrentToken('');
  }, [decodedText]);

  const stopSidetone = useCallback(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.01);
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop(audioCtxRef.current ? audioCtxRef.current.currentTime + 0.03 : 0);
      } catch {
        // Ignore already-stopped oscillator
      }
      oscRef.current = null;
    }
  }, []);

  const startSidetone = useCallback(() => {
    if (!sidetoneEnabled || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    stopSidetone();
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = 'sine';
    osc.frequency.value = 650;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;
  }, [sidetoneEnabled, stopSidetone]);

  const clearGapTimers = useCallback(() => {
    if (letterTimerRef.current !== null) {
      window.clearTimeout(letterTimerRef.current);
      letterTimerRef.current = null;
    }
    if (wordTimerRef.current !== null) {
      window.clearTimeout(wordTimerRef.current);
      wordTimerRef.current = null;
    }
  }, []);

  const commitSequenceUpdate = useCallback(
    (nextSeq: string, nextToken: string) => {
      setMorseSequence(nextSeq);
      setCurrentToken(nextToken);
      const combined = [nextSeq.trim(), nextToken].filter(Boolean).join(' ');
      const decoded = decodeMorseSequence(combined);
      lastSyncedMorsePropRef.current = decoded;
      onDecodedTextChange(decoded);
    },
    [onDecodedTextChange]
  );

  const appendSymbol = useCallback(
    (sym: '.' | '-') => {
      clearGapTimers();
      const nextToken = currentToken + sym;
      commitSequenceUpdate(morseSequence, nextToken);
    },
    [clearGapTimers, currentToken, morseSequence, commitSequenceUpdate]
  );

  const commitLetter = useCallback(() => {
    clearGapTimers();
    if (!currentToken) return;
    const nextSeq = morseSequence ? `${morseSequence.trim()} ${currentToken}` : currentToken;
    commitSequenceUpdate(nextSeq, '');
  }, [clearGapTimers, currentToken, morseSequence, commitSequenceUpdate]);

  const insertWordSpace = useCallback(() => {
    clearGapTimers();
    const base = currentToken
      ? morseSequence
        ? `${morseSequence.trim()} ${currentToken}`
        : currentToken
      : morseSequence.trim();
    if (!base || base.endsWith('/')) {
      commitSequenceUpdate(base, '');
      return;
    }
    commitSequenceUpdate(`${base} /`, '');
  }, [clearGapTimers, currentToken, morseSequence, commitSequenceUpdate]);

  const handlePaddleDown = useCallback(() => {
    if (pressStartRef.current !== null) return;
    clearGapTimers();
    pressStartRef.current = performance.now();
    setIsPressing(true);
    startSidetone();
  }, [clearGapTimers, startSidetone]);

  const handlePaddleUp = useCallback(() => {
    if (pressStartRef.current === null) return;
    const elapsed = Math.round(performance.now() - pressStartRef.current);
    pressStartRef.current = null;
    setIsPressing(false);
    stopSidetone();
    setLastDurationMs(elapsed);

    const symbol = classifyPressDuration(elapsed, wpm);
    const updatedToken = currentToken + symbol;
    commitSequenceUpdate(morseSequence, updatedToken);

    letterTimerRef.current = window.setTimeout(() => {
      setCurrentToken((latestToken) => {
        if (!latestToken) return '';
        setMorseSequence((prevSeq) => {
          const nextSeq = prevSeq ? `${prevSeq.trim()} ${latestToken}` : latestToken;
          onDecodedTextChange(decodeMorseSequence(nextSeq));
          return nextSeq;
        });
        return '';
      });
    }, timing.letterGapMs);

    wordTimerRef.current = window.setTimeout(() => {
      setMorseSequence((prevSeq) => {
        const trimmed = prevSeq.trim();
        if (!trimmed || trimmed.endsWith('/')) return prevSeq;
        const nextSeq = `${trimmed} /`;
        onDecodedTextChange(decodeMorseSequence(nextSeq));
        return nextSeq;
      });
    }, timing.wordGapMs);
  }, [
    stopSidetone,
    wpm,
    currentToken,
    commitSequenceUpdate,
    morseSequence,
    timing.letterGapMs,
    timing.wordGapMs,
    onDecodedTextChange,
  ]);

  useEffect(() => {
    if (!spacePaddleEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handlePaddleDown();
      } else if (e.key === '.') {
        e.preventDefault();
        appendSymbol('.');
      } else if (e.key === '-') {
        e.preventDefault();
        appendSymbol('-');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        commitLetter();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePaddleUp();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [spacePaddleEnabled, handlePaddleDown, handlePaddleUp, appendSymbol, commitLetter]);

  useEffect(() => {
    return () => {
      clearGapTimers();
      stopSidetone();
    };
  }, [clearGapTimers, stopSidetone]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Morse Telegraph Paddle &amp; Dot/Dash Keyer
          </h3>
          <p className="text-sm text-slate-600">
            Tap explicit Dot/Dash keys or hold the timing paddle (PARIS calibration at {wpm} WPM).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpacePaddleEnabled((v) => !v)}
            aria-pressed={spacePaddleEnabled}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              spacePaddleEnabled
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {spacePaddleEnabled ? 'Spacebar Paddle Active' : 'Enable Spacebar Paddle'}
          </button>
          <button
            type="button"
            onClick={() => setSidetoneEnabled((v) => !v)}
            aria-label={sidetoneEnabled ? 'Mute 650Hz sidetone' : 'Unmute 650Hz sidetone'}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {sidetoneEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <button
            type="button"
            onPointerDown={handlePaddleDown}
            onPointerUp={handlePaddleUp}
            onPointerLeave={() => {
              if (isPressing) handlePaddleUp();
            }}
            className={`w-full py-6 px-4 rounded-xl border font-medium text-sm transition-all select-none ${
              isPressing
                ? 'bg-blue-600 text-white border-blue-700 scale-[0.99]'
                : 'bg-white text-slate-900 border-slate-300 hover:border-slate-400 shadow-xs'
            }`}
          >
            {isPressing ? 'Keying Signal...' : 'Hold Timing Paddle (Dot / Dash)'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => appendSymbol('.')}
              className="py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Dot (·)
            </button>
            <button
              type="button"
              onClick={() => appendSymbol('-')}
              className="py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Dash (—)
            </button>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
              <label htmlFor="wpm-range">PARIS Speed: {wpm} WPM</label>
              <span className="font-mono">Dash &ge; {timing.dashThresholdMs} ms</span>
            </div>
            <input
              id="wpm-range"
              type="range"
              min={8}
              max={26}
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            {lastDurationMs !== null && (
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                Last press: {lastDurationMs} ms ({lastDurationMs >= timing.dashThresholdMs ? 'Dash' : 'Dot'})
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-7 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={commitLetter}
              disabled={!currentToken}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              Commit Letter
            </button>
            <button
              type="button"
              onClick={insertWordSpace}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Word Gap (/)
            </button>
            <button
              type="button"
              onClick={() => {
                clearGapTimers();
                if (currentToken) {
                  commitSequenceUpdate(morseSequence, currentToken.slice(0, -1));
                } else {
                  const parts = morseSequence.trim().split(/\s+/);
                  parts.pop();
                  commitSequenceUpdate(parts.join(' '), '');
                }
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Backspace
            </button>
            <button
              type="button"
              onClick={() => {
                clearGapTimers();
                commitSequenceUpdate('', '');
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>ITU Morse Buffer</span>
              {currentToken && (
                <span className="font-mono text-blue-600">Active token: {currentToken}</span>
              )}
            </div>
            <div
              className="min-h-14 p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-base text-slate-900 break-words"
              data-testid="morse-sequence-output"
            >
              {[morseSequence.trim(), currentToken].filter(Boolean).join(' ') || (
                <span className="text-sm text-slate-400">Tap Dot/Dash or hold the paddle to begin</span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Quick examples:</span>
            <button
              type="button"
              onClick={() => commitSequenceUpdate(encodeTextToMorse('HELP ME'), '')}
              className="text-blue-600 hover:underline font-medium"
            >
              HELP ME
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => commitSequenceUpdate(encodeTextToMorse('THANK YOU'), '')}
              className="text-blue-600 hover:underline font-medium"
            >
              THANK YOU
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => commitSequenceUpdate(encodeTextToMorse('NEED WATER'), '')}
              className="text-blue-600 hover:underline font-medium"
            >
              NEED WATER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
