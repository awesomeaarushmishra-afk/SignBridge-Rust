import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { RECOMMENDED_CRATES, RUST_SOURCE_FILES } from '../data/rustArchitectureData';

interface RustCodeExplorerProps {
  activeFileId: string;
  onSelectFileId: (id: string) => void;
}

export function RustCodeExplorer({
  activeFileId,
  onSelectFileId,
}: RustCodeExplorerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeFile =
    RUST_SOURCE_FILES.find((f) => f.id === activeFileId) ?? RUST_SOURCE_FILES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.code);
      setCopiedId(activeFile.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard API restricted in some headless contexts
    }
  };

  return (
    <div className="space-y-8">
      {/* Recommended Rust Crates Matrix */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Recommended Rust Crates &amp; Native FFI Stack
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Zero-GC dependencies selected for low-RAM ARM64 Linux, embedded kiosks, and Android NDK targets.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Subsystem</th>
                <th className="py-3 px-4">Recommended Crate</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">License</th>
                <th className="py-3 px-4">Engineering Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {RECOMMENDED_CRATES.map((crate) => (
                <tr key={crate.category} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {crate.category}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-blue-700 font-semibold whitespace-nowrap">
                    {crate.crateName}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {crate.version}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {crate.license}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 leading-relaxed">
                    {crate.whyChosen}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive Rust & C++ FFI Source Code Browser */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Reference Rust &amp; MediaPipe C++ FFI Implementation
          </h3>
          <p className="text-sm text-slate-600 mt-0.5">
            Inspect the complete Cargo workspace, 6-dot Braille bitmask LUT, PARIS Morse FSM, cxx MediaPipe shim, and Gemma 4 E4B runner.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Rust source files">
              {RUST_SOURCE_FILES.map((file) => {
                const selected = file.id === activeFile.id;
                return (
                  <button
                    key={file.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => onSelectFileId(file.id)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-white text-blue-700 font-semibold border border-slate-200 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {file.filename}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedId === activeFile.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy File
                </>
              )}
            </button>
          </div>

          <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">{activeFile.title}</span>
            <span className="text-xs text-slate-500">{activeFile.description}</span>
          </div>

          <pre className="p-5 bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto max-h-[520px]">
            <code>{activeFile.code}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}
