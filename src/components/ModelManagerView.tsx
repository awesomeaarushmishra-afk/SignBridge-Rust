import { Download, AlertTriangle, CheckCircle2, Cpu, Sparkles } from 'lucide-react';
import {
  AssistantSlmTierId,
  LOCAL_MODEL_PRESETS,
  ModelAdapterConfig,
  ModelTierId,
  ONBOARDING_SLM_PRESETS,
  checkDualModelCompatibility,
} from '../utils/modelPresets';

interface ModelManagerViewProps {
  config: ModelAdapterConfig;
  onChangeConfig: (next: ModelAdapterConfig) => void;
  highContrast?: boolean;
}

export function ModelManagerView({
  config,
  onChangeConfig,
  highContrast = false,
}: ModelManagerViewProps) {
  const activeTranslationPreset =
    LOCAL_MODEL_PRESETS.find((p) => p.id === config.activeTierId) ??
    LOCAL_MODEL_PRESETS[1];
  const activeAssistantPreset =
    ONBOARDING_SLM_PRESETS.find((p) => p.id === config.activeAssistantTierId) ??
    ONBOARDING_SLM_PRESETS[0];

  const dualCompat = checkDualModelCompatibility(
    activeAssistantPreset,
    activeTranslationPreset,
    config.hostRamGb,
    config.installedModelIds
  );

  const handleSelectTranslationTier = (id: ModelTierId) => {
    onChangeConfig({ ...config, activeTierId: id });
  };

  const handleSelectAssistantTier = (id: AssistantSlmTierId) => {
    onChangeConfig({ ...config, activeAssistantTierId: id });
  };

  const toggleInstalled = (modelId: string) => {
    const exists = config.installedModelIds.includes(modelId);
    const nextIds = exists
      ? config.installedModelIds.filter((id) => id !== modelId)
      : [...config.installedModelIds, modelId];
    onChangeConfig({ ...config, installedModelIds: nextIds });
  };

  const handleExportModelsJson = () => {
    const payload = {
      activeTierId: config.activeTierId,
      activeAssistantTierId: config.activeAssistantTierId,
      customModelPath: config.customModelPath,
      threads: config.threads,
      hostRamGb: config.hostRamGb,
      offlineOnlyMode: config.offlineOnlyMode,
      slmAvailable: config.slmAvailable,
      installedModelIds: config.installedModelIds,
      slmPresets: ONBOARDING_SLM_PRESETS,
      presets: LOCAL_MODEL_PRESETS.map((p) => ({
        ...p,
        modelFile: p.id === 'custom' ? config.customModelPath : p.modelFile,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'models.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const cardBg = highContrast
    ? 'bg-black border-white text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const mutedText = highContrast ? 'text-yellow-300' : 'text-slate-600';

  return (
    <section className="space-y-7" aria-labelledby="model-adapter-heading">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1.5 max-w-3xl">
          <div className={`text-xs flex flex-wrap items-center gap-2 ${mutedText}`}>
            <span>Swappable Dual-Pipeline Adapter</span>
            <span aria-hidden="true">·</span>
            <span>Separate Onboarding SLM &amp; Translation Model</span>
            <span aria-hidden="true">·</span>
            <span>Zero Code Edits Required</span>
          </div>
          <h2 id="model-adapter-heading" className="text-2xl font-bold tracking-tight">
            Local SLM &amp; Translation Model Manager
          </h2>
          <p className={`text-sm ${mutedText}`}>
            Switch separately between fast low-resource SLMs for onboarding help and higher-reasoning Gemma 4 / Qwen 2.5 models for complex guidance or translation without reinstalling.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportModelsJson}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
            highContrast
              ? 'bg-sky-400 text-black hover:bg-sky-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Download className="w-4 h-4" />
          Download models.json
        </button>
      </div>

      {/* Host Hardware & Runtime Controls */}
      <div className={`rounded-xl border p-5 grid grid-cols-1 md:grid-cols-3 gap-5 ${cardBg}`}>
        <div className="space-y-2">
          <label htmlFor="host-ram-slider" className="text-xs font-semibold block">
            Host Machine RAM: <span className="font-mono tabular-nums">{config.hostRamGb} GB</span>
          </label>
          <input
            id="host-ram-slider"
            type="range"
            min={4}
            max={32}
            step={2}
            value={config.hostRamGb}
            onChange={(e) =>
              onChangeConfig({ ...config, hostRamGb: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
          />
          <p className={`text-xs ${mutedText}`}>
            Checks combined memory headroom for your selected Onboarding SLM + Translation model.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="cpu-threads-select" className="text-xs font-semibold block">
            Inference CPU Threads
          </label>
          <select
            id="cpu-threads-select"
            value={config.threads}
            onChange={(e) =>
              onChangeConfig({ ...config, threads: Number(e.target.value) })
            }
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              highContrast
                ? 'bg-black border-white text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value={2}>2 Threads (Battery Saver)</option>
            <option value={4}>4 Threads (Balanced)</option>
            <option value={8}>8 Threads (Desktop Performance)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="custom-gguf-path" className="text-xs font-semibold block">
            Custom Local GGUF Path
          </label>
          <input
            id="custom-gguf-path"
            type="text"
            value={config.customModelPath}
            onChange={(e) =>
              onChangeConfig({ ...config, customModelPath: e.target.value })
            }
            className={`w-full rounded-lg border px-3 py-2 text-xs font-mono ${
              highContrast
                ? 'bg-black border-white text-white'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Live Dual-Pipeline Compatibility Status */}
      <div
        role="status"
        data-testid="model-compat-status"
        className={`rounded-xl border p-4 flex items-start gap-3 text-sm ${
          dualCompat.level === 'incompatible'
            ? 'bg-red-50 border-red-300 text-red-900'
            : dualCompat.level === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : highContrast
                ? 'bg-black border-sky-400 text-white'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        {dualCompat.level === 'nominal' ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <div className="font-semibold">
            Active SLM: {activeAssistantPreset.modelName} · Active Translator: {activeTranslationPreset.modelName}
          </div>
          <div className="text-xs">{dualCompat.message}</div>
        </div>
      </div>

      {/* Section 1: Onboarding & Navigation SLM Selector */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <span>1. Built-in Onboarding &amp; Navigation SLM</span>
            </h3>
            <p className={`text-xs ${mutedText}`}>
              Dedicated local Small Language Model for first-time guidance and step-by-step UI help.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!config.offlineOnlyMode}
                onChange={(e) =>
                  onChangeConfig({ ...config, offlineOnlyMode: !e.target.checked })
                }
                className="accent-blue-600"
              />
              <span>Gemma 4 / Gemini Server Translation Active</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.slmAvailable}
                onChange={(e) =>
                  onChangeConfig({ ...config, slmAvailable: e.target.checked })
                }
                className="accent-blue-600"
              />
              <span>SLM Runtime Enabled (uncheck to test Static Help Fallback)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ONBOARDING_SLM_PRESETS.map((slm) => {
            const selected = slm.id === config.activeAssistantTierId;
            const isInstalled = config.installedModelIds.includes(slm.id);
            const ramOk = config.hostRamGb >= slm.minRamGb;
            return (
              <div
                key={slm.id}
                className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 ${
                  selected
                    ? highContrast
                      ? 'bg-zinc-900 border-sky-400 ring-2 ring-sky-400 text-white'
                      : 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-600/20 text-slate-900'
                    : cardBg
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>
                        {slm.tierLabel} · {slm.bundledByDefault ? 'Bundled' : 'Manual GGUF'}
                      </div>
                      <h4 className="text-sm font-bold mt-0.5">{slm.modelName}</h4>
                    </div>
                    <span className="text-[11px] font-mono">
                      {isInstalled ? 'Installed' : 'Not Installed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-[11px] font-mono tabular-nums">
                    <div>
                      <span className={`block ${mutedText}`}>Size / Min RAM</span>
                      <span>{slm.diskSizeGb.toFixed(2)} GB / {slm.minRamGb} GB</span>
                    </div>
                    <div>
                      <span className={`block ${mutedText}`}>Speed</span>
                      <span>{slm.speedTradeoff}</span>
                    </div>
                  </div>

                  <p className={`text-xs ${mutedText}`}>
                    <strong>Tradeoff:</strong> {slm.qualityTradeoff}. {slm.notes}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                  <span className="font-mono">
                    {slm.license} · {ramOk ? 'RAM OK' : 'Low RAM'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleInstalled(slm.id)}
                      className={`px-2 py-1 rounded border text-[11px] ${
                        highContrast
                          ? 'border-white/70 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isInstalled ? 'Installed' : 'Mark Installed'}
                    </button>
                    <button
                      type="button"
                      data-testid={`slm-preset-${slm.id}`}
                      aria-pressed={selected}
                      onClick={() => handleSelectAssistantTier(slm.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        selected
                          ? 'bg-slate-900 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {selected ? 'Active SLM' : 'Use SLM'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Main Translation & Sign Pipeline Selector */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span>2. Main Translation &amp; Sign Recognition Pipeline</span>
          </h3>
          <p className={`text-xs ${mutedText}`}>
            Powers spoken-language translation, NormalizedIR grammar refinement, and sign-to-speech output.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOCAL_MODEL_PRESETS.map((preset) => {
            const selected = preset.id === config.activeTierId;
            const isInstalled = config.installedModelIds.includes(preset.id);
            const ramOk = config.hostRamGb >= preset.minRamGb;
            return (
              <div
                key={preset.id}
                className={`rounded-xl border p-5 space-y-3 flex flex-col justify-between ${
                  selected
                    ? highContrast
                      ? 'bg-zinc-900 border-sky-400 ring-2 ring-sky-400 text-white'
                      : 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-600/20 text-slate-900'
                    : cardBg
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs font-semibold uppercase tracking-wide ${mutedText}`}>
                        {preset.tierLabel} · {preset.family} · {preset.bundledByDefault ? 'Bundled' : 'Manual GGUF'}
                      </div>
                      <h4 className="text-base font-bold mt-0.5">{preset.modelName}</h4>
                    </div>
                    <span className="text-xs font-mono">
                      {isInstalled ? 'Installed' : 'Not Installed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-xs font-mono tabular-nums">
                    <div>
                      <span className={`block text-[11px] ${mutedText}`}>Size / Quant</span>
                      <span>{preset.diskSizeGb.toFixed(2)} GB · {preset.quantization}</span>
                    </div>
                    <div>
                      <span className={`block text-[11px] ${mutedText}`}>Min / Rec RAM</span>
                      <span>{preset.minRamGb} / {preset.recommendedRamGb} GB</span>
                    </div>
                    <div>
                      <span className={`block text-[11px] ${mutedText}`}>Speed</span>
                      <span>{preset.speedTradeoff}</span>
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed ${mutedText}`}>
                    <strong>Quality:</strong> {preset.qualityTradeoff}. {preset.notes}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                  <span className="font-mono">
                    License: {preset.license} · {ramOk ? 'Compatible' : 'Exceeds RAM'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleInstalled(preset.id)}
                      className={`px-2 py-1 rounded border text-[11px] ${
                        highContrast
                          ? 'border-white/70 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isInstalled ? 'Installed' : 'Mark Installed'}
                    </button>
                    <button
                      type="button"
                      data-testid={`model-preset-${preset.id}`}
                      aria-pressed={selected}
                      onClick={() => handleSelectTranslationTier(preset.id)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        selected
                          ? 'bg-slate-900 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {selected ? 'Active Translator' : 'Select Model'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
