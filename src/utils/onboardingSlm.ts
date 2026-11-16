import { OnboardingSlmPreset } from './modelPresets';
import { SpokenLanguage, UniversalModality } from './offlineTranslator';

export interface AssistantContextState {
  activeSection: string;
  sourceModality: UniversalModality;
  targetModality: UniversalModality;
  sourceLanguage: SpokenLanguage;
  targetLanguage: Exclude<SpokenLanguage, 'Auto-Detect'>;
  cameraActive: boolean;
  slmAvailable: boolean;
  assistantPreset: OnboardingSlmPreset;
}

export interface OnboardingAssistantReply {
  question: string;
  title: string;
  summary: string;
  steps: string[];
  contextTip: string;
  shortcuts: string[];
  engineLabel: string;
  isStaticFallback: boolean;
  isGuidanceOnly: true;
}

export const SUGGESTED_ONBOARDING_QUESTIONS: string[] = [
  'How do I translate English to Braille?',
  'How do I switch to Morse input?',
  'How do I enable hand tracking?',
  'How do I change models?',
  'What can I do on my current screen?',
];

export function answerOnboardingQuestion(
  rawQuestion: string,
  ctx: AssistantContextState
): OnboardingAssistantReply {
  const q = rawQuestion.trim();
  const low = q.toLowerCase();
  const isFallback = !ctx.slmAvailable;
  const isHigherReasoning = ctx.assistantPreset.id === 'slm-reasoning';
  const engineLabel = isFallback
    ? 'Static Offline Help Documentation (SLM Fallback — Translation Unaffected)'
    : `Local Offline SLM · ${ctx.assistantPreset.modelName}`;

  const contextTip =
    ctx.activeSection === 'models'
      ? `You are on the Models screen. You can swap either the Onboarding SLM (${ctx.assistantPreset.tierLabel}) or the Main Translation pipeline without restarting.`
      : ctx.activeSection === 'desktop'
        ? 'You are on the Desktop .exe screen showing Windows PyInstaller/Inno Setup scripts, offline keyboard guides, and supported standards.'
        : `Active mode: ${ctx.sourceModality.toUpperCase()} (${ctx.sourceLanguage}) -> ${ctx.targetModality.toUpperCase()} (${ctx.targetLanguage}). Press Alt+1..4 for Source or Alt+Shift+1..4 for Target.`;

  if (low.includes('braille') || (low.includes('english') && !low.includes('morse'))) {
    return {
      question: q,
      title: 'Translate English (or any spoken language) to Braille offline',
      summary:
        'Type normal text on a standard keyboard while Target is set to Braille; Unicode Braille and ASCII BRF update automatically.',
      steps: [
        '1. Open Live Pipeline and select "Text / Speech" as Source Input Modality (keyboard shortcut: Alt+1).',
        '2. Select "Braille (Unicode + BRF)" as Target Output Modality (keyboard shortcut: Alt+Shift+2).',
        '3. Type normal English inside the Active Input Buffer—Grade-1 Unicode Braille (U+2800..283F) and ASCII BRF update live on every keystroke.',
        '4. Press "Export .brf" or "Save .txt" to save the embosser-ready file offline, or press "Speak" to hear the phrase.',
        ...(isHigherReasoning
          ? [
              '5. Reasoning note: To reverse Braille -> English, switch Source to Braille (Alt+2), paste Unicode Braille or BRF, and set Target to Text / Speech (Alt+Shift+1).',
            ]
          : []),
      ],
      contextTip,
      shortcuts: ['Alt+1 (Source Text)', 'Alt+Shift+2 (Target Braille)', 'Alt+H (High Contrast)'],
      engineLabel,
      isStaticFallback: isFallback,
      isGuidanceOnly: true,
    };
  }

  if (low.includes('morse')) {
    return {
      question: q,
      title: 'Switch to Morse Code input or output',
      summary:
        'Key dots and dashes with buttons/spacebar paddle, or type normal text to auto-generate visual Morse and PCM .wav audio.',
      steps: [
        '1. To key Morse IN: select "Morse Code" as Source Input Modality (Alt+3).',
        '2. Tap "Dot (·)" / "Dash (—)", enable "Spacebar Paddle" for timed holds (PARIS WPM slider), or type dots/dashes directly into the input buffer.',
        '3. Select your Target Output Modality (Text/Speech Alt+Shift+1, Braille Alt+Shift+2, or Sign Alt+Shift+4).',
        '4. To convert English -> Morse audio: select Source Text (Alt+1), Target Morse (Alt+Shift+3), then click "Play Morse Tone" or "Export Morse .wav".',
      ],
      contextTip,
      shortcuts: ['Alt+3 (Source Morse)', 'Alt+Shift+3 (Target Morse)'],
      engineLabel,
      isStaticFallback: isFallback,
      isGuidanceOnly: true,
    };
  }

  if (
    low.includes('hand') ||
    low.includes('sign') ||
    low.includes('camera') ||
    low.includes('webcam') ||
    low.includes('track') ||
    low.includes('calibrat')
  ) {
    return {
      question: q,
      title: 'Enable local webcam hand tracking & sign calibration',
      summary:
        'All video processing stays 100% on-device with zero uploads. Includes calibration and full keyboard fallback.',
      steps: [
        '1. Select "Sign Language" as Source Input Modality (Alt+4) on the Live Pipeline screen.',
        '2. Click "Calibrate Camera & Lighting" to set hand size scale, camera mirror, confidence threshold, and check ambient lighting luma.',
        '3. Click "Use Webcam" to stream locally. Place one hand cleanly inside the guide box; watch live status prompts ("Move hands into frame", "Lighting too low", "Hold sign steady").',
        '4. Hold a static ASL A–Z shape for 5 frames (~0.33s) to append letters into the editable transcript buffer; edit any letter before converting or speaking.',
        '5. Fallback: If no webcam is available, use the A–Z hand pose buttons ("Perform ASL A, B, C") or switch back to normal keyboard typing (Alt+1).',
      ],
      contextTip,
      shortcuts: ['Alt+4 (Source Sign)', 'Alt+Shift+4 (Target Sign Avatar)', 'Alt+1 (Keyboard Fallback)'],
      engineLabel,
      isStaticFallback: isFallback,
      isGuidanceOnly: true,
    };
  }

  if (
    low.includes('model') ||
    low.includes('slm') ||
    low.includes('switch') ||
    low.includes('swap') ||
    low.includes('ram') ||
    low.includes('reason')
  ) {
    return {
      question: q,
      title: 'Switch between lightweight SLMs and higher-reasoning models',
      summary:
        'Swap both the Onboarding SLM and the main Translation/Sign model directly in the Models tab without editing code.',
      steps: [
        '1. Open the "Models" tab in the top navigation bar (or click "Swap Model" in the utility strip).',
        '2. Under "Onboarding & Navigation SLM", pick Lightweight SLM (Qwen 2.5 0.5B, fastest), Balanced SLM (Gemma 4 E2B), or Higher-Reasoning SLM (Gemma 4 E4B).',
        '3. Under "Main Translation & Sign Pipeline", pick Lightweight, Balanced, High Quality, or Custom Local GGUF.',
        '4. Adjust "Host Machine RAM" to inspect live compatibility warnings, disk size, memory headroom, and bundled/installed status.',
        '5. Optionally click "Download models.json" to deploy your chosen presets into the Windows offline desktop directory.',
      ],
      contextTip,
      shortcuts: ['Tab / Enter (Switch Models)', 'Ctrl+/ (Toggle Assistant)'],
      engineLabel,
      isStaticFallback: isFallback,
      isGuidanceOnly: true,
    };
  }

  return {
    question: q || 'What can I do on my current screen?',
    title: 'Context-aware offline accessibility walkthrough',
    summary:
      'SignBridge works 100% offline with keyboard navigation, bidirectional cross-modal conversion, local hand tracking, and swappable SLMs.',
    steps: [
      `1. Current Screen: ${ctx.activeSection === 'workbench' ? 'Live Pipeline Workbench' : ctx.activeSection}.`,
      `2. Current Route: Source=${ctx.sourceModality.toUpperCase()} (${ctx.sourceLanguage}) -> Target=${ctx.targetModality.toUpperCase()} (${ctx.targetLanguage}).`,
      '3. Type directly in the Active Input Buffer to auto-convert without clicking any Convert button, or use Speak / Copy / Save .txt / Export .brf / Export Morse .wav.',
      '4. Press Alt+H anytime for WCAG High Contrast mode, or open "Models" to change local SLM / translation model tiers.',
    ],
    contextTip,
    shortcuts: [
      'Ctrl+/ (Open/Close Assistant)',
      'Alt+1..4 (Source Modality)',
      'Alt+Shift+1..4 (Target Modality)',
      'Alt+H (High Contrast)',
    ],
    engineLabel,
    isStaticFallback: isFallback,
    isGuidanceOnly: true,
  };
}
