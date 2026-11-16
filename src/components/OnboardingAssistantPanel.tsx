import { FormEvent, useMemo, useState } from 'react';
import { HelpCircle, X, ShieldCheck, Cpu } from 'lucide-react';
import {
  AssistantContextState,
  SUGGESTED_ONBOARDING_QUESTIONS,
  answerOnboardingQuestion,
} from '../utils/onboardingSlm';
import {
  AssistantSlmTierId,
  ONBOARDING_SLM_PRESETS,
} from '../utils/modelPresets';

interface OnboardingAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  context: AssistantContextState;
  onSelectAssistantTier: (tierId: AssistantSlmTierId) => void;
  onToggleSlmAvailable: () => void;
  onOpenModelsTab: () => void;
  highContrast?: boolean;
}

export function OnboardingAssistantPanel({
  open,
  onClose,
  context,
  onSelectAssistantTier,
  onToggleSlmAvailable,
  onOpenModelsTab,
  highContrast = false,
}: OnboardingAssistantPanelProps) {
  const [question, setQuestion] = useState('How do I translate English to Braille?');
  const [submittedQuestion, setSubmittedQuestion] = useState(
    'How do I translate English to Braille?'
  );

  const reply = useMemo(
    () => answerOnboardingQuestion(submittedQuestion, context),
    [submittedQuestion, context]
  );

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmittedQuestion(question);
  };

  const surfaceCls = highContrast
    ? 'bg-black border-white text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const mutedCls = highContrast ? 'text-yellow-300' : 'text-slate-600';

  return (
    <section
      role="region"
      aria-label="Built-in offline SLM onboarding assistant"
      data-testid="onboarding-assistant-panel"
      className={`rounded-xl border p-5 space-y-4 shadow-sm ${surfaceCls}`}
    >
      {/* Clear distinction header: Guidance Only != Translation Output */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200/70">
        <div className="space-y-1">
          <div
            className={`flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
              highContrast ? 'text-sky-300' : 'text-blue-700'
            }`}
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            <span>Navigation Guidance Only (Not Translation Output)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-normal">
              {reply.isStaticFallback ? 'Static Help Fallback' : '100% Offline SLM'}
            </span>
          </div>
          <h2 className="text-base font-bold">
            Built-in Onboarding &amp; Navigation Assistant
          </h2>
          <p className={`text-xs ${mutedCls}`}>
            Ask how to translate, switch to Morse, calibrate local webcam hand tracking, or swap AI models. Works offline with zero cloud APIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
          <label className="flex flex-wrap items-center gap-1.5 text-xs w-full sm:w-auto min-w-0 max-w-full">
            <Cpu className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className={`${mutedCls} shrink-0`}>Assistant SLM</span>
            <select
              aria-label="Onboarding SLM model selector"
              data-testid="assistant-slm-select"
              value={context.assistantPreset.id}
              onChange={(e) => onSelectAssistantTier(e.target.value as AssistantSlmTierId)}
              className={`rounded-md border px-2 py-1 text-xs w-full sm:w-auto max-w-full min-w-0 truncate ${
                highContrast
                  ? 'bg-black border-white text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {ONBOARDING_SLM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tierLabel} ({p.modelName})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            data-testid="toggle-slm-fallback-btn"
            onClick={onToggleSlmAvailable}
            className={`px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap ${
              !context.slmAvailable
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : highContrast
                  ? 'border-white text-white hover:bg-zinc-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {context.slmAvailable ? 'Simulate SLM Unavailable' : 'Restore Offline SLM'}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close onboarding assistant"
            className={`p-1.5 rounded-md border ${
              highContrast
                ? 'border-white text-white hover:bg-zinc-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Suggested onboarding questions">
        {SUGGESTED_ONBOARDING_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setQuestion(q);
              setSubmittedQuestion(q);
            }}
            className={`px-2.5 py-1.5 rounded-md border text-xs ${
              submittedQuestion === q
                ? highContrast
                  ? 'bg-sky-400 text-black border-sky-400 font-semibold'
                  : 'bg-slate-900 text-white border-slate-900 font-medium'
                : highContrast
                  ? 'bg-black border-white/80 text-white hover:bg-zinc-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Custom Keyboard Question Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="slm-question-input" className="sr-only">
          Ask the offline onboarding assistant a question
        </label>
        <input
          id="slm-question-input"
          data-testid="slm-question-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask how to translate, use Morse, calibrate webcam hand tracking, or swap models..."
          className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none ${
            highContrast
              ? 'bg-black border-white text-white'
              : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-600'
          }`}
        />
        <button
          type="submit"
          data-testid="slm-ask-btn"
          className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
            highContrast
              ? 'bg-yellow-300 text-black hover:bg-yellow-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Ask Offline Assistant
        </button>
      </form>

      {/* Screen-reader live guidance output */}
      <div
        aria-live="polite"
        data-testid="slm-guidance-output"
        className={`rounded-xl border p-4 space-y-3 ${
          highContrast
            ? 'bg-zinc-950 border-white text-white'
            : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            {reply.engineLabel}
          </span>
          <span className={mutedCls}>
            {reply.isStaticFallback
              ? 'Static Help Active · Core Translation Unaffected'
              : `${context.assistantPreset.speedTradeoff} · On-Device`}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold">{reply.title}</h3>
          <p className={`text-xs ${mutedCls}`}>{reply.summary}</p>
        </div>

        <ol className="space-y-1.5 text-xs leading-relaxed">
          {reply.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className={`pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs ${mutedCls}`}>
          <span>
            <strong>Current Screen Context:</strong> {reply.contextTip}
          </span>
          <button
            type="button"
            onClick={onOpenModelsTab}
            className="underline hover:no-underline font-medium shrink-0"
          >
            Open Full Model Manager
          </button>
        </div>
      </div>
    </section>
  );
}
