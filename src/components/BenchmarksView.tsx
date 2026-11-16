import { useState } from 'react';
import { HARDWARE_BENCHMARKS } from '../data/rustArchitectureData';

export function BenchmarksView() {
  const [profileId, setProfileId] = useState<string>(HARDWARE_BENCHMARKS[0].id);
  const profile =
    HARDWARE_BENCHMARKS.find((p) => p.id === profileId) ?? HARDWARE_BENCHMARKS[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Gemma 4 E4B Benchmarks &amp; Quantization Strategies
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Memory footprint, TTFT, and tokens/sec for the 4.5B effective parameter Gemma 4 E4B model across edge targets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg" role="tablist" aria-label="Target hardware profiles">
          {HARDWARE_BENCHMARKS.map((hw) => {
            const active = hw.id === profile.id;
            return (
              <button
                key={hw.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setProfileId(hw.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {hw.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hardware Profile Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Processor / Accelerator</div>
          <div className="text-sm font-semibold text-slate-900 mt-1">{profile.chip}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">System Memory Ceiling</div>
          <div className="text-sm font-semibold text-slate-900 mt-1 tabular-nums">{profile.ramLimit}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Inference Runtime</div>
          <div className="text-sm font-semibold text-slate-900 mt-1">{profile.runtime}</div>
        </div>
      </div>

      {/* Quantization Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Quantization</th>
              <th className="py-3 px-4 text-right">BPW</th>
              <th className="py-3 px-4 text-right">Disk Size</th>
              <th className="py-3 px-4 text-right">Peak RAM</th>
              <th className="py-3 px-4 text-right">TTFT (ms)</th>
              <th className="py-3 px-4 text-right">Decode (tok/s)</th>
              <th className="py-3 px-4 text-right">Quality</th>
              <th className="py-3 px-4">Power / Battery</th>
              <th className="py-3 px-4">Best Fit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {profile.rows.map((row) => (
              <tr key={row.quant} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
                  {row.quant}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                  {row.bitsPerWeight}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                  {row.modelDiskGb}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-900 font-semibold whitespace-nowrap">
                  {row.peakRamGb}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                  {row.ttftMs} ms
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-emerald-700 font-semibold whitespace-nowrap">
                  {row.decodeTokPerSec.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                  {row.qualityRetention}
                </td>
                <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                  {row.batteryDelta}
                </td>
                <td className="py-3 px-4 text-xs text-slate-600">
                  {row.recommendedFor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* End-to-End Real-Time Latency Budget */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            End-to-End Sign-to-Speech Latency Budget (Android AICore INT4)
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            Total TTFA: 250 ms (60% lower battery draw · 4x faster vs prior 4B/7B FP16 baselines)
          </span>
        </div>

        <div className="w-full h-5 rounded-lg overflow-hidden flex border border-slate-200 text-[10px] font-mono text-white">
          <div className="bg-slate-600 flex items-center justify-center" style={{ width: '7%' }} title="Camera Capture 16ms">
            16ms
          </div>
          <div className="bg-blue-600 flex items-center justify-center" style={{ width: '11%' }} title="MediaPipe FFI 28ms">
            28ms
          </div>
          <div className="bg-sky-600 flex items-center justify-center" style={{ width: '4%' }} title="Gesture Classifier 6ms">
            6ms
          </div>
          <div className="bg-indigo-600 flex items-center justify-center" style={{ width: '56%' }} title="Gemma 4 E4B First-Clause Decode 145ms">
            145ms (Gemma 4 E4B)
          </div>
          <div className="bg-emerald-600 flex items-center justify-center" style={{ width: '22%' }} title="Piper TTS First Audio 55ms">
            55ms (TTS)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-600">
          <div>
            <strong className="text-slate-900">KV-Cache Q8_0 Quantization:</strong> Caps 512-token context cache to ~18 MB RAM while preserving translation fidelity.
          </div>
          <div>
            <strong className="text-slate-900">Clause-Level Streaming:</strong> Gemma 4 E4B streams punctuation boundaries directly into Piper TTS so speech starts before full generation ends.
          </div>
          <div>
            <strong className="text-slate-900">MMap Zero-Copy Weights:</strong> Memory-mapping GGUF/AICore weights cuts cold boot time under 1.2s on UFS 3.1 flash.
          </div>
        </div>
      </div>
    </div>
  );
}
