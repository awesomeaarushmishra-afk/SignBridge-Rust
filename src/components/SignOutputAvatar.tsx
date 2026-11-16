import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { ASL_ALPHABET_SPECS, generateAslLetterLandmarks } from '../utils/aslClassifier';
import { HAND_CONNECTIONS } from '../utils/signClassifier';

interface SignOutputAvatarProps {
  signSequence: string[];
  highContrast?: boolean;
}

export function SignOutputAvatar({
  signSequence,
  highContrast = false,
}: SignOutputAvatarProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speedMs, setSpeedMs] = useState(650);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const safeSeq = useMemo(() => (signSequence.length > 0 ? signSequence : ['A']), [signSequence]);

  useEffect(() => {
    setStepIdx(0);
  }, [signSequence]);

  useEffect(() => {
    if (!playing || safeSeq.length <= 1) return;
    const timer = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % safeSeq.length);
    }, speedMs);
    return () => window.clearInterval(timer);
  }, [playing, safeSeq.length, speedMs]);

  const currentToken = safeSeq[Math.min(stepIdx, safeSeq.length - 1)] ?? 'A';
  const currentSpec = useMemo(
    () => ASL_ALPHABET_SPECS.find((s) => s.letter === currentToken) ?? null,
    [currentToken]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = highContrast ? '#000000' : '#0F172A';
    ctx.fillRect(0, 0, w, h);

    if (currentToken === 'SPACE' || signSequence.length === 0) {
      ctx.fillStyle = highContrast ? '#FDE047' : '#94A3B8';
      ctx.font = '600 13px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        signSequence.length === 0
          ? 'Enter letters A–Z to preview ASL fingerspelling posture'
          : 'WORD BOUNDARY PAUSE (SPACE)',
        w / 2,
        h / 2
      );
      return;
    }

    const landmarks = generateAslLetterLandmarks(currentToken, 0.25);

    ctx.strokeStyle = highContrast ? '#38BDF8' : '#60A5FA';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const [a, b] of HAND_CONNECTIONS) {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }

    landmarks.forEach((pt, idx) => {
      const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, isTip ? 5 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle =
        idx === 0
          ? '#FDE047'
          : isTip
            ? highContrast
              ? '#FFFFFF'
              : '#34D399'
            : '#E2E8F0';
      ctx.fill();
    });

    ctx.fillStyle = highContrast ? '#FFFFFF' : '#F8FAFC';
    ctx.font = '700 22px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(currentToken, 14, 30);

    ctx.fillStyle = highContrast ? '#FDE047' : '#94A3B8';
    ctx.font = '500 11px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Step ${stepIdx + 1}/${safeSeq.length}`, w - 14, 24);
  }, [currentToken, stepIdx, safeSeq.length, signSequence.length, highContrast]);

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        highContrast
          ? 'bg-black border-white text-white'
          : 'bg-slate-50 border-slate-200 text-slate-900'
      }`}
      data-testid="sign-output-avatar"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide">
            Sign Output Skeletal Avatar (Offline Fallback)
          </h4>
          <p className={`text-xs ${highContrast ? 'text-yellow-300' : 'text-slate-600'}`}>
            {currentSpec
              ? `${currentSpec.letter}: ${currentSpec.note}`
              : currentToken === 'SPACE'
                ? 'Word pause between spelled tokens'
                : 'Waiting for alphabetic glosses'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setStepIdx((prev) => (prev - 1 + safeSeq.length) % safeSeq.length)
            }
            aria-label="Previous sign frame"
            className={`p-1.5 rounded-md border text-xs ${
              highContrast
                ? 'border-white text-white hover:bg-zinc-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause sign sequence' : 'Play sign sequence'}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium ${
              highContrast
                ? 'bg-sky-400 text-black hover:bg-sky-300'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={() => setStepIdx((prev) => (prev + 1) % safeSeq.length)}
            aria-label="Next sign frame"
            className={`p-1.5 rounded-md border text-xs ${
              highContrast
                ? 'border-white text-white hover:bg-zinc-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setStepIdx(0);
              setPlaying(true);
            }}
            aria-label="Replay sign sequence"
            className={`p-1.5 rounded-md border text-xs ${
              highContrast
                ? 'border-white text-white hover:bg-zinc-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <select
            aria-label="Sign avatar playback speed"
            value={speedMs}
            onChange={(e) => setSpeedMs(Number(e.target.value))}
            className={`ml-1 rounded-md border px-2 py-1 text-xs ${
              highContrast
                ? 'bg-black border-white text-white'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <option value={900}>Slow</option>
            <option value={650}>Normal</option>
            <option value={380}>Fast</option>
          </select>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={420}
        height={210}
        className="w-full h-44 rounded-lg border border-slate-700 block"
      />

      {signSequence.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Sign fingerspelling sequence">
          {signSequence.slice(0, 28).map((tok, i) => {
            const active = i === stepIdx;
            return (
              <button
                key={`${tok}-${i}`}
                type="button"
                onClick={() => {
                  setStepIdx(i);
                  setPlaying(false);
                }}
                className={`px-2 py-0.5 rounded font-mono text-xs border transition-colors ${
                  active
                    ? highContrast
                      ? 'bg-yellow-300 text-black border-yellow-300 font-bold'
                      : 'bg-blue-600 text-white border-blue-600 font-semibold'
                    : highContrast
                      ? 'bg-black text-white border-white/60'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {tok === 'SPACE' ? '·' : tok}
              </button>
            );
          })}
        </div>
      )}

      <p className={`text-[11px] leading-relaxed ${highContrast ? 'text-yellow-200' : 'text-slate-600'}`}>
        <strong>Offline Sign Limitation:</strong> This offline mode generates real-time 21-landmark ASL fingerspelling poses and gloss tokens locally. Continuous 3D co-articulated sign video with facial non-manual markers across regional sign grammars is not synthesized offline on low-RAM CPUs.
      </p>
    </div>
  );
}
