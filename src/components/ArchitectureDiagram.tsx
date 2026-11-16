import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ARCHITECTURE_NODES, PipelineNodeSpec } from '../data/rustArchitectureData';

interface ArchitectureDiagramProps {
  onOpenRustFile: (filename: string) => void;
}

export function ArchitectureDiagram({ onOpenRustFile }: ArchitectureDiagramProps) {
  const [selectedId, setSelectedId] = useState<string>('gemma-4-e4b');
  const selected: PipelineNodeSpec =
    ARCHITECTURE_NODES.find((n) => n.id === selectedId) ?? ARCHITECTURE_NODES[0];

  const textNodes = ARCHITECTURE_NODES.filter((n) => n.pipeline === 'text');
  const signNodes = ARCHITECTURE_NODES.filter((n) => n.pipeline === 'sign');
  const sharedNodes = ARCHITECTURE_NODES.filter((n) => n.pipeline === 'shared');

  const renderNodeButton = (node: PipelineNodeSpec, stepLabel: string) => {
    const active = node.id === selectedId;
    return (
      <button
        key={node.id}
        type="button"
        onClick={() => setSelectedId(node.id)}
        aria-pressed={active}
        className={`w-full min-w-0 text-left p-3.5 rounded-xl border transition-all focus-visible:outline-2 focus-visible:outline-blue-600 ${
          active
            ? 'bg-blue-50 border-blue-600 text-slate-900 shadow-xs'
            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 tabular-nums">
          <span className="truncate">{stepLabel}</span>
          <span className="shrink-0">{node.latencyBudgetMs} ms</span>
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900 truncate">{node.label}</div>
        <div className="mt-0.5 text-xs text-slate-500 truncate">{node.runtime}</div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Dual-Pipeline Rust System Architecture
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Select any pipeline stage below to inspect its Rust FFI contract, latency budget, and RAM footprint.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          End-to-end target: &le; 205 ms text · &le; 250 ms sign
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 min-w-0 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {/* Pipeline A: Text Input -> Decoder */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-3">
              Pipeline A · Keyboard (Braille 6-Key Chord / Morse PARIS Timing)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
              {renderNodeButton(textNodes[0], 'Stage A1')}
              <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" aria-hidden="true" />
              {renderNodeButton(textNodes[1], 'Stage A2')}
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Pipeline B: Camera -> MediaPipe -> Gesture-to-Text */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-3">
              Pipeline B · Camera Sign Recognition (Apache 2.0 sign-language-translator Port)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
              {renderNodeButton(signNodes[0], 'Stage B1')}
              <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" aria-hidden="true" />
              {renderNodeButton(signNodes[1], 'Stage B2')}
              <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" aria-hidden="true" />
              {renderNodeButton(signNodes[2], 'Stage B3')}
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Shared Convergence: Gemma 4 E4B -> TTS */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-3">
              Shared Convergence · On-Device Translation &amp; Real-Time Speech Synthesis
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
              {renderNodeButton(sharedNodes[0], 'Stage S1')}
              <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" aria-hidden="true" />
              {renderNodeButton(sharedNodes[1], 'Stage S2')}
            </div>
          </div>
        </div>

        {/* Node Inspector */}
        <aside
          className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
          aria-label="Selected stage specification"
        >
          <div>
            <div className="text-xs text-slate-500 font-mono">
              {selected.rustFile} · {selected.latencyBudgetMs} ms budget
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mt-1">{selected.label}</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{selected.summary}</p>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
            <div>
              <div className="font-medium text-slate-500">Runtime &amp; Bindings</div>
              <div className="mt-1 font-mono text-slate-900">{selected.runtime}</div>
            </div>
            <div>
              <div className="font-medium text-slate-500">Input Data Contract</div>
              <div className="mt-1 font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                {selected.inputContract}
              </div>
            </div>
            <div>
              <div className="font-medium text-slate-500">Output Data Contract</div>
              <div className="mt-1 font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                {selected.outputContract}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 tabular-nums">
              <span className="text-slate-500">Allocated RAM Budget</span>
              <span className="font-mono font-semibold text-slate-900">
                {selected.memoryFootprintMb >= 1000
                  ? `${(selected.memoryFootprintMb / 1024).toFixed(2)} GB`
                  : `${selected.memoryFootprintMb.toFixed(1)} MB`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenRustFile(selected.rustFile)}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Inspect {selected.rustFile}
          </button>
        </aside>
      </div>
    </div>
  );
}
