export type ModelTierId = 'lightweight' | 'balanced' | 'high-quality' | 'custom';
export type AssistantSlmTierId = 'slm-fast' | 'slm-balanced' | 'slm-reasoning';

export interface LocalModelPreset {
  id: ModelTierId;
  tierLabel: 'Lightweight' | 'Balanced' | 'High Quality' | 'Custom';
  modelName: string;
  family: string;
  quantization: string;
  diskSizeGb: number;
  minRamGb: number;
  recommendedRamGb: number;
  contextLength: number;
  speedTradeoff: string;
  qualityTradeoff: string;
  bundledByDefault: boolean;
  license: string;
  modelFile: string;
  notes: string;
}

export interface OnboardingSlmPreset {
  id: AssistantSlmTierId;
  tierLabel: 'Lightweight SLM' | 'Balanced SLM' | 'Higher-Reasoning SLM';
  modelName: string;
  family: string;
  quantization: string;
  diskSizeGb: number;
  minRamGb: number;
  recommendedRamGb: number;
  tokensPerSecEst: number;
  speedTradeoff: string;
  qualityTradeoff: string;
  bundledByDefault: boolean;
  license: string;
  modelFile: string;
  notes: string;
}

export const ONBOARDING_SLM_PRESETS: OnboardingSlmPreset[] = [
  {
    id: 'slm-fast',
    tierLabel: 'Lightweight SLM',
    modelName: 'Qwen 2.5 0.5B Instruct (Fast SLM)',
    family: 'Qwen 2.5',
    quantization: 'Q4_K_M (GGUF)',
    diskSizeGb: 0.42,
    minRamGb: 2,
    recommendedRamGb: 4,
    tokensPerSecEst: 115,
    speedTradeoff: 'Fastest (~115 tok/s CPU)',
    qualityTradeoff: 'Instant UI navigation & quick Q&A',
    bundledByDefault: true,
    license: 'Apache-2.0',
    modelFile: 'models/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    notes: 'Bundled lightweight onboarding SLM for instant offline keyboard help on 4 GB RAM laptops.',
  },
  {
    id: 'slm-balanced',
    tierLabel: 'Balanced SLM',
    modelName: 'Gemma 4 E2B Instruct (Assistant)',
    family: 'Gemma 4',
    quantization: 'Q4_K_M (GGUF)',
    diskSizeGb: 1.45,
    minRamGb: 4,
    recommendedRamGb: 8,
    tokensPerSecEst: 48,
    speedTradeoff: 'Balanced (~48 tok/s CPU)',
    qualityTradeoff: 'Context-aware step-by-step troubleshooting',
    bundledByDefault: false,
    license: 'Gemma Terms of Use',
    modelFile: 'models/gemma-4-e2b-q4_k_m.gguf',
    notes: 'Richer multi-step guidance explaining Braille/Morse rules, calibration, and hardware setup.',
  },
  {
    id: 'slm-reasoning',
    tierLabel: 'Higher-Reasoning SLM',
    modelName: 'Gemma 4 E4B Instruct (Reasoning)',
    family: 'Gemma 4',
    quantization: 'Q4_K_M (GGUF)',
    diskSizeGb: 2.78,
    minRamGb: 6,
    recommendedRamGb: 12,
    tokensPerSecEst: 22,
    speedTradeoff: 'Slower (~22 tok/s CPU)',
    qualityTradeoff: 'Highest reasoning for complex workflows',
    bundledByDefault: false,
    license: 'Gemma Terms of Use',
    modelFile: 'models/gemma-4-e4b-q4_k_m.gguf',
    notes: 'Higher-reasoning offline assistant for complex accessibility workflows and multi-modal diagnostics.',
  },
];

export const LOCAL_MODEL_PRESETS: LocalModelPreset[] = [
  {
    id: 'lightweight',
    tierLabel: 'Lightweight',
    modelName: 'Gemma 4 E2B Instruct',
    family: 'Gemma 4',
    quantization: 'Q4_K_M (GGUF)',
    diskSizeGb: 1.45,
    minRamGb: 4,
    recommendedRamGb: 4,
    contextLength: 512,
    speedTradeoff: 'Fast (~48 tok/s CPU)',
    qualityTradeoff: 'Concise phrase & sign-gloss translation',
    bundledByDefault: true,
    license: 'Gemma Terms of Use',
    modelFile: 'models/gemma-4-e2b-q4_k_m.gguf',
    notes: 'Bundled default for low-RAM 4 GB Windows laptops and mini-PCs.',
  },
  {
    id: 'balanced',
    tierLabel: 'Balanced',
    modelName: 'Gemma 4 E4B Instruct',
    family: 'Gemma 4',
    quantization: 'Q4_K_M (GGUF)',
    diskSizeGb: 2.78,
    minRamGb: 6,
    recommendedRamGb: 8,
    contextLength: 1024,
    speedTradeoff: 'Moderate (~24 tok/s CPU)',
    qualityTradeoff: 'Strong multilingual & grammar accuracy',
    bundledByDefault: true,
    license: 'Gemma Terms of Use',
    modelFile: 'models/gemma-4-e4b-q4_k_m.gguf',
    notes: 'Recommended balanced preset (~2.9 GB peak RAM alongside webcam tracking).',
  },
  {
    id: 'high-quality',
    tierLabel: 'High Quality',
    modelName: 'Gemma 4 12B / Qwen 2.5 7B Adapter',
    family: 'Gemma 4 / Qwen 2.5 (Swappable)',
    quantization: 'Q4_K_M (GGUF)',
    diskSizeGb: 6.4,
    minRamGb: 10,
    recommendedRamGb: 16,
    contextLength: 2048,
    speedTradeoff: 'Slower on CPU (~8 tok/s)',
    qualityTradeoff: 'Highest reasoning & nuance for full paragraphs',
    bundledByDefault: false,
    license: 'Gemma Terms / Apache-2.0 (Qwen)',
    modelFile: 'models/gemma-4-12b-q4_k_m.gguf',
    notes: 'Install manually into models/; warns below 10 GB RAM or when paired with large SLM.',
  },
  {
    id: 'custom',
    tierLabel: 'Custom',
    modelName: 'User-Supplied Local GGUF Model',
    family: 'llama.cpp Compatible',
    quantization: 'User GGUF',
    diskSizeGb: 3.2,
    minRamGb: 6,
    recommendedRamGb: 8,
    contextLength: 1024,
    speedTradeoff: 'Depends on local GGUF size',
    qualityTradeoff: 'User-configured local checkpoint',
    bundledByDefault: false,
    license: 'Per user model license',
    modelFile: 'models/custom-local-model.gguf',
    notes: 'Drop any llama.cpp-compatible GGUF model (Llama 3.2, Qwen 2.5, Mistral, Gemma) into models/ without editing code.',
  },
];

export const MODEL_CONFIG_STORAGE_KEY = 'signbridge.model_adapter_config.v2';

export interface ModelAdapterConfig {
  activeTierId: ModelTierId;
  activeAssistantTierId: AssistantSlmTierId;
  customModelPath: string;
  threads: number;
  hostRamGb: number;
  offlineOnlyMode: boolean;
  slmAvailable: boolean;
  installedModelIds: string[];
}

export const DEFAULT_MODEL_CONFIG: ModelAdapterConfig = {
  activeTierId: 'balanced',
  activeAssistantTierId: 'slm-fast',
  customModelPath: 'models/custom-local-model.gguf',
  threads: 4,
  hostRamGb: 8,
  offlineOnlyMode: false,
  slmAvailable: true,
  installedModelIds: ['slm-fast', 'lightweight', 'balanced'],
};

export interface ModelCompatibilityCheck {
  compatible: boolean;
  level: 'nominal' | 'warning' | 'incompatible';
  message: string;
  combinedMinRamGb?: number;
}

export function checkModelCompatibility(
  preset: Pick<LocalModelPreset | OnboardingSlmPreset, 'modelName' | 'minRamGb' | 'recommendedRamGb'>,
  hostRamGb: number
): ModelCompatibilityCheck {
  if (hostRamGb < preset.minRamGb) {
    return {
      compatible: false,
      level: 'incompatible',
      message: `Insufficient RAM: ${preset.modelName} requires at least ${preset.minRamGb} GB RAM (host configured at ${hostRamGb} GB). Switch to Lightweight.`,
    };
  }
  if (hostRamGb < preset.recommendedRamGb) {
    return {
      compatible: true,
      level: 'warning',
      message: `Slow performance / tight memory warning: ${preset.recommendedRamGb} GB RAM recommended for smooth TTS + MediaPipe concurrency.`,
    };
  }
  return {
    compatible: true,
    level: 'nominal',
    message: `Compatible: ${preset.modelName} fits comfortably within ${hostRamGb} GB host memory.`,
  };
}

export function checkDualModelCompatibility(
  assistantPreset: OnboardingSlmPreset,
  translationPreset: LocalModelPreset,
  hostRamGb: number,
  installedModelIds: string[]
): ModelCompatibilityCheck {
  const combinedMinRamGb = Math.max(
    translationPreset.minRamGb,
    Math.round((assistantPreset.minRamGb + translationPreset.minRamGb) * 0.75)
  );
  const assistantInstalled = installedModelIds.includes(assistantPreset.id);
  const translatorInstalled = installedModelIds.includes(translationPreset.id);

  if (hostRamGb < translationPreset.minRamGb || hostRamGb < assistantPreset.minRamGb) {
    return {
      compatible: false,
      level: 'incompatible',
      combinedMinRamGb,
      message: `Insufficient RAM: ${translationPreset.modelName} (${translationPreset.minRamGb} GB) and ${assistantPreset.modelName} (${assistantPreset.minRamGb} GB) exceed ${hostRamGb} GB host RAM. Switch to Lightweight.`,
    };
  }

  if (!assistantInstalled || !translatorInstalled) {
    const missingNames = [
      !assistantInstalled ? assistantPreset.modelName : null,
      !translatorInstalled ? translationPreset.modelName : null,
    ].filter(Boolean);
    return {
      compatible: true,
      level: 'warning',
      combinedMinRamGb,
      message: `Selected weight not marked installed locally (${missingNames.join(', ')}). Offline deterministic fallback stays active until GGUF is installed.`,
    };
  }

  if (hostRamGb < translationPreset.recommendedRamGb) {
    return {
      compatible: true,
      level: 'warning',
      combinedMinRamGb,
      message: `May run slowly on ${hostRamGb} GB RAM (${translationPreset.recommendedRamGb} GB recommended when hand tracking is open).`,
    };
  }

  return {
    compatible: true,
    level: 'nominal',
    combinedMinRamGb,
    message: `Ready: ${assistantPreset.tierLabel} + ${translationPreset.tierLabel} fit cleanly within ${hostRamGb} GB RAM.`,
  };
}
