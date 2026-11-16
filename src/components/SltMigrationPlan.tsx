import { SLT_MIGRATION_PLAN } from '../data/rustArchitectureData';

export function SltMigrationPlan() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Prototype Plan: Adapting sign-language-translator (Apache 2.0) to Rust
        </h2>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          How each Python/PyTorch/NumPy stage from the open-source sign-language-translator repository maps onto zero-allocation Rust modules and a C++ MediaPipe Tasks bridge.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        {SLT_MIGRATION_PLAN.map((step) => (
          <div key={step.phase} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-3 space-y-1">
              <div className="text-sm font-semibold text-slate-900">{step.phase}</div>
              <div className="text-xs font-mono text-emerald-700">{step.ramSavings}</div>
            </div>

            <div className="lg:col-span-4 space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Apache 2.0 Python Source</span>
                <div className="mt-1 font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  {step.pythonSource}
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Rust / FFI Target</span>
                <div className="mt-1 font-mono text-blue-700 bg-blue-50/50 border border-blue-200 rounded-lg px-3 py-2">
                  {step.rustTarget}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 text-sm text-slate-600 leading-relaxed">
              {step.strategy}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Week 1 · FFI &amp; Capture</h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Compile MediaPipe Tasks C++ shared library for ARM64/NDK, wire cxx bridge, and verify 30 FPS landmark extraction from nokhwa frames.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Week 2 · Classifier &amp; Decoders</h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Port wrist-relative normalization, temporal ring buffer, 6-key Braille LUT, and PARIS Morse keyer with cargo test coverage.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Week 3 · Gemma 4 E4B &amp; TTS</h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Bind Q4_K_M / AICore Gemma 4 E4B runtime, stream clauses into Piper VITS ONNX, and profile peak RSS under 3.1 GB.
          </p>
        </div>
      </div>
    </div>
  );
}
