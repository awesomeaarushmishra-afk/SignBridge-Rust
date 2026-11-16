import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BrailleDot,
  DOT_TO_PERKINS_KEY,
  PERKINS_KEY_TO_DOT,
  decodeBrailleMasks,
  dotsToMask,
  encodeTextToBrailleMasks,
  maskToUnicodeBraille,
} from '../utils/brailleDecoder';

interface BraillePadProps {
  decodedText: string;
  onDecodedTextChange: (nextText: string) => void;
}

const DOT_ROWS: Array<[BrailleDot, BrailleDot]> = [
  [1, 4],
  [2, 5],
  [3, 6],
];

export function BraillePad({ decodedText, onDecodedTextChange }: BraillePadProps) {
  const [activeDots, setActiveDots] = useState<Set<BrailleDot>>(() => new Set());
  const [masks, setMasks] = useState<number[]>(() => []);
  const [keyboardCapture, setKeyboardCapture] = useState(false);

  const chordAccumulatorRef = useRef<Set<BrailleDot>>(new Set());
  const heldKeysRef = useRef<Set<string>>(new Set());

  const lastSyncedTextRef = useRef<string | null>(null);

  const syncFromMasks = useCallback(
    (nextMasks: number[]) => {
      setMasks(nextMasks);
      const { text } = decodeBrailleMasks(nextMasks);
      lastSyncedTextRef.current = text;
      onDecodedTextChange(text);
    },
    [onDecodedTextChange]
  );

  // Sync external edits (including pasted Unicode Braille U+2800..283F or plain text) without render loops
  useEffect(() => {
    if (decodedText === lastSyncedTextRef.current) return;
    lastSyncedTextRef.current = decodedText;

    const hasUnicodeBraille = /[\u2800-\u283f]/.test(decodedText);
    const nextMasks = hasUnicodeBraille
      ? Array.from(decodedText)
          .filter((ch) => {
            const c = ch.charCodeAt(0);
            return (c >= 0x2800 && c <= 0x283f) || ch === ' ';
          })
          .map((ch) => (ch === ' ' ? 0 : ch.charCodeAt(0) - 0x2800))
      : encodeTextToBrailleMasks(decodedText);

    setMasks(nextMasks);
  }, [decodedText]);

  const toggleDot = (dot: BrailleDot) => {
    setActiveDots((prev) => {
      const next = new Set(prev);
      if (next.has(dot)) {
        next.delete(dot);
      } else {
        next.add(dot);
      }
      return next;
    });
  };

  const commitActiveCell = useCallback(() => {
    if (activeDots.size === 0) return;
    const mask = dotsToMask(activeDots);
    const nextMasks = [...masks, mask];
    setActiveDots(new Set());
    syncFromMasks(nextMasks);
  }, [activeDots, masks, syncFromMasks]);

  const insertSpace = useCallback(() => {
    setActiveDots(new Set());
    syncFromMasks([...masks, 0]);
  }, [masks, syncFromMasks]);

  const backspace = useCallback(() => {
    if (activeDots.size > 0) {
      setActiveDots(new Set());
      return;
    }
    if (masks.length === 0) return;
    syncFromMasks(masks.slice(0, -1));
  }, [activeDots.size, masks, syncFromMasks]);

  const loadSample = () => {
    setActiveDots(new Set());
    syncFromMasks(encodeTextToBrailleMasks('hello help'));
  };

  // Perkins 6-key keyboard chord capture: hold any combination of F/D/S/J/K/L, commit on release
  useEffect(() => {
    if (!keyboardCapture) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === ' ') {
        e.preventDefault();
        insertSpace();
        return;
      }
      if (key === 'backspace') {
        e.preventDefault();
        backspace();
        return;
      }
      const dot = PERKINS_KEY_TO_DOT[key];
      if (!dot) return;
      e.preventDefault();
      heldKeysRef.current.add(key);
      chordAccumulatorRef.current.add(dot);
      setActiveDots(new Set(chordAccumulatorRef.current));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!PERKINS_KEY_TO_DOT[key]) return;
      e.preventDefault();
      heldKeysRef.current.delete(key);
      if (heldKeysRef.current.size === 0 && chordAccumulatorRef.current.size > 0) {
        const mask = dotsToMask(chordAccumulatorRef.current);
        chordAccumulatorRef.current.clear();
        setActiveDots(new Set());
        setMasks((prev) => {
          const next = [...prev, mask];
          const text = decodeBrailleMasks(next).text;
          lastSyncedTextRef.current = text;
          onDecodedTextChange(text);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardCapture, insertSpace, backspace, onDecodedTextChange]);

  const currentMask = dotsToMask(activeDots);
  const currentGlyph = maskToUnicodeBraille(currentMask);
  const { unicodeCells } = decodeBrailleMasks(masks);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            6-Dot Braille Cell &amp; Perkins Chord Capture
          </h3>
          <p className="text-sm text-slate-600">
            Toggle dots directly or enable Perkins chord mode (F/D/S = Dots 1–3, J/K/L = Dots 4–6).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setKeyboardCapture((v) => !v)}
            aria-pressed={keyboardCapture}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              keyboardCapture
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {keyboardCapture ? 'Perkins Capture Active' : 'Enable Perkins Keys'}
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Load Sample
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center">
          <div className="grid grid-cols-2 gap-3.5" role="group" aria-label="6-dot Braille cell">
            {DOT_ROWS.map(([leftDot, rightDot]) => (
              <div key={`${leftDot}-${rightDot}`} className="contents">
                {[leftDot, rightDot].map((dot) => {
                  const isActive = activeDots.has(dot);
                  return (
                    <button
                      key={dot}
                      type="button"
                      onClick={() => toggleDot(dot)}
                      aria-pressed={isActive}
                      aria-label={`Dot ${dot} (Key ${DOT_TO_PERKINS_KEY[dot]})`}
                      className={`w-16 h-16 rounded-xl border text-left p-2.5 flex flex-col justify-between transition-all focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        isActive
                          ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-mono font-semibold tabular-nums">
                        Dot {dot}
                      </span>
                      <span
                        className={`text-[11px] font-mono ${
                          isActive ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        Key {DOT_TO_PERKINS_KEY[dot]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 w-full flex items-center justify-between pt-3 border-t border-slate-200 text-xs font-mono text-slate-600 tabular-nums">
            <span>Preview: <strong className="text-lg text-slate-900 align-middle">{currentGlyph}</strong></span>
            <span>Mask: 0b{currentMask.toString(2).padStart(6, '0')}</span>
          </div>
        </div>

        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={commitActiveCell}
              disabled={activeDots.size === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              Commit Cell
            </button>
            <button
              type="button"
              onClick={insertSpace}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Word Space
            </button>
            <button
              type="button"
              onClick={backspace}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Backspace
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveDots(new Set());
                syncFromMasks([]);
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500">
              Captured Braille Cells (Unicode U+2800..283F)
            </div>
            <div
              className="min-h-12 p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xl tracking-widest text-slate-900 break-all"
              data-testid="braille-cells-output"
            >
              {unicodeCells || <span className="text-sm text-slate-400 tracking-normal">No cells committed yet</span>}
            </div>
          </div>

          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Quick examples:</span>
            <button
              type="button"
              onClick={() => syncFromMasks(encodeTextToBrailleMasks('hello'))}
              className="text-blue-600 hover:underline font-medium"
            >
              &ldquo;hello&rdquo;
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => syncFromMasks(encodeTextToBrailleMasks('water please'))}
              className="text-blue-600 hover:underline font-medium"
            >
              &ldquo;water please&rdquo;
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => syncFromMasks(encodeTextToBrailleMasks('thank you'))}
              className="text-blue-600 hover:underline font-medium"
            >
              &ldquo;thank you&rdquo;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
