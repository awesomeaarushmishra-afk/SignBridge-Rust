import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  MORSE_BRAILLE_REFERENCE_TABLE,
  ReferenceEntry,
} from '../utils/referenceTableData';

interface ReferenceTablePanelProps {
  visible: boolean;
  onToggleVisible: () => void;
  highlightedLetter: string | null;
  onSelectLetter: (letter: string) => void;
}

export function ReferenceTablePanel({
  visible,
  onToggleVisible,
  highlightedLetter,
  onSelectLetter,
}: ReferenceTablePanelProps) {
  const leftColumn = MORSE_BRAILLE_REFERENCE_TABLE.slice(0, 13);
  const rightColumn = MORSE_BRAILLE_REFERENCE_TABLE.slice(13, 26);

  const renderTableHalf = (rows: readonly ReferenceEntry[], groupLabel: string) => (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-left border-collapse" aria-label={groupLabel}>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <th className="py-2.5 px-3.5">Letter</th>
            <th className="py-2.5 px-3.5">Braille Dots</th>
            <th className="py-2.5 px-3.5">Unicode</th>
            <th className="py-2.5 px-3.5">Morse</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {rows.map((entry) => {
            const isHighlighted =
              highlightedLetter !== null &&
              highlightedLetter.toUpperCase() === entry.letter;

            return (
              <tr
                key={entry.letter}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelectLetter(entry.letter.toLowerCase())}
                data-testid={`ref-row-${entry.letter}`}
                data-highlighted={isHighlighted ? 'true' : 'false'}
                className={`cursor-pointer transition-colors ${
                  isHighlighted
                    ? 'bg-blue-100 text-blue-950'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <td className="py-1.5 px-3.5 font-semibold font-mono">
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={`Insert letter ${entry.letter}`}
                    className="w-full text-left font-mono font-semibold focus:outline-none"
                  >
                    {entry.letter}
                  </button>
                </td>
                <td className="py-1.5 px-3.5 font-mono text-xs tabular-nums text-slate-600">
                  {entry.brailleDots}
                </td>
                <td className="py-1.5 px-3.5 font-mono text-lg leading-none text-slate-900">
                  {entry.brailleUnicode}
                </td>
                <td className="py-1.5 px-3.5 font-mono text-sm tracking-wider text-slate-800">
                  {entry.morse}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      aria-label="Morse and Braille reference"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Quick Lookup for Braille &amp; Morse
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any row to insert a letter directly into the input buffer. Decoded letters highlight for 1 second.
          </p>
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleVisible}
          aria-expanded={visible}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
        >
          <span>Morse/Braille Reference</span>
          {visible ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          )}
        </button>
      </div>

      {visible && (
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          data-testid="reference-table-grid"
        >
          {renderTableHalf(leftColumn, 'Morse and Braille reference A through M')}
          {renderTableHalf(rightColumn, 'Morse and Braille reference N through Z')}
        </div>
      )}
    </section>
  );
}
