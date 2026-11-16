import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Play, AlertTriangle, SlidersHorizontal, Lock, BookOpen } from 'lucide-react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HAND_CONNECTIONS, Landmark3D } from '../utils/signClassifier';
import {
  ASL_ALPHABET_SPECS,
  AslFrameResult,
  SignBuffer,
  classifyAslLandmarks,
} from '../utils/aslClassifier';
import {
  DEFAULT_HAND_CALIBRATION,
  HAND_CALIBRATION_STORAGE_KEY,
  HandCalibrationConfig,
  VideoFrameTrackingMetrics,
  analyzeVideoFrameMetrics,
  buildCalibratedLandmarks,
  getSupportedSignVocabularyInfo,
} from '../utils/localHandTracker';

interface SignMediaPipeStageProps {
  decodedText: string;
  onDecodedTextChange: (nextText: string) => void;
  onTriggerTranslateAndSpeak?: (textToSpeak: string) => void;
}

type TrackerMode = 'active' | 'model-missing' | 'camera-disconnected';

export function SignMediaPipeStage({
  decodedText,
  onDecodedTextChange,
  onTriggerTranslateAndSpeak,
}: SignMediaPipeStageProps) {
  const [activeTargetLetter, setActiveTargetLetter] = useState<string | null>(null);
  const [trackerMode, setTrackerMode] = useState<TrackerMode>('active');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [mpReadyState, setMpReadyState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [sequenceRunning, setSequenceRunning] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);
  const [trackerLogs, setTrackerLogs] = useState<string[]>([]);

  const [calibration, setCalibration] = useState<HandCalibrationConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_HAND_CALIBRATION;
    try {
      const saved = window.localStorage.getItem(HAND_CALIBRATION_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as HandCalibrationConfig) : DEFAULT_HAND_CALIBRATION;
    } catch {
      return DEFAULT_HAND_CALIBRATION;
    }
  });

  const [liveMetrics, setLiveMetrics] = useState<VideoFrameTrackingMetrics>({
    meanLuma: 128,
    lightingOk: true,
    handDetected: false,
    foregroundRatio: 0,
    motionDelta: 0,
    centroidX: 0.5,
    centroidY: 0.55,
    guidanceMessage: 'Move hands into frame',
    trackingStatus: 'no-hand',
  });

  const [frameResult, setFrameResult] = useState<AslFrameResult | null>(null);
  const [streakInfo, setStreakInfo] = useState<{ letter: string | null; count: number }>({
    letter: null,
    count: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const phaseRef = useRef(0);
  const signBufferRef = useRef<SignBuffer>(new SignBuffer());
  const activeTargetRef = useRef<string | null>(activeTargetLetter);
  const trackerModeRef = useRef<TrackerMode>(trackerMode);
  const calibrationRef = useRef<HandCalibrationConfig>(calibration);
  const prevCentroidRef = useRef<{ x: number; y: number } | null>(null);
  const lowConfStreakLoggedRef = useRef(0);
  const lastVideoTimestampRef = useRef<number>(-1);

  activeTargetRef.current = activeTargetLetter;
  trackerModeRef.current = trackerMode;
  calibrationRef.current = calibration;

  const updateCalibration = (next: HandCalibrationConfig) => {
    setCalibration(next);
    try {
      window.localStorage.setItem(HAND_CALIBRATION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const appendLog = useCallback((msg: string) => {
    setTrackerLogs((prev) => [msg, ...prev.slice(0, 4)]);
  }, []);

  useEffect(() => {
    if (decodedText === '' && signBufferRef.current.text !== '') {
      signBufferRef.current.clear();
      setStreakInfo({ letter: null, count: 0 });
    }
  }, [decodedText]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, []);

  const ensureHandLandmarker = useCallback(async (): Promise<HandLandmarker | null> => {
    if (handLandmarkerRef.current) return handLandmarkerRef.current;
    setMpReadyState('loading');
    try {
      const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/mediapipe/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
      });
      handLandmarkerRef.current = landmarker;
      setMpReadyState('ready');
      appendLog('[OK] Local MediaPipe HandLandmarker loaded from /mediapipe/ (0 uploads)');
      return landmarker;
    } catch {
      try {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        });
        handLandmarkerRef.current = landmarker;
        setMpReadyState('ready');
        appendLog('[OK] Local MediaPipe HandLandmarker (CPU) loaded');
        return landmarker;
      } catch (err) {
        setMpReadyState('error');
        const msg = err instanceof Error ? err.message : 'MediaPipe WASM load failed';
        setCameraNotice(
          `Real-time MediaPipe WASM failed (${msg}). Use manual A–Z buttons or Keyboard mode (Alt+1).`
        );
        appendLog(`[WARN] MediaPipe init fallback: ${msg}`);
        return null;
      }
    }
  }, [appendLog]);

  const toggleCamera = async () => {
    if (cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setCameraNotice(null);
      setFrameResult(null);
      setStreakInfo({ letter: null, count: 0 });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const msg =
        'Webcam API unavailable; use manual A–Z fallback buttons or switch to Keyboard mode (Alt+1).';
      setCameraNotice(msg);
      appendLog(`[WARN] ${msg}`);
      return;
    }

    try {
      setActiveTargetLetter(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCameraNotice(null);
      setTrackerMode('active');
      void ensureHandLandmarker();
      appendLog('[OK] Local webcam stream started — place one hand in frame to sign');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera permission denied';
      setCameraNotice(
        `Camera unavailable (${msg}). Use manual A–Z sign buttons or switch to Keyboard mode (Alt+1).`
      );
      appendLog(`[WARN] Camera unavailable: ${msg}`);
    }
  };

  // Dedicated 15 FPS on-device hand tracking loop
  useEffect(() => {
    if (sequenceRunning) return;

    const intervalId = window.setInterval(() => {
      const mode = trackerModeRef.current;
      const calib = calibrationRef.current;
      const canvas = canvasRef.current;

      if (mode !== 'active') {
        setFrameResult(null);
        setStreakInfo({ letter: null, count: 0 });
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
        return;
      }

      phaseRef.current = (phaseRef.current + 0.08) % 1;
      const manualTarget = activeTargetRef.current;
      let metrics: VideoFrameTrackingMetrics;
      let landmarks: Landmark3D[] | null = null;
      let result: AslFrameResult | null = null;

      // Read REAL camera hand landmarks when webcam is active
      if (cameraActive && videoRef.current && videoRef.current.readyState >= 2) {
        if (!analysisCanvasRef.current) {
          analysisCanvasRef.current = document.createElement('canvas');
          analysisCanvasRef.current.width = 96;
          analysisCanvasRef.current.height = 72;
        }
        const aCanvas = analysisCanvasRef.current;
        const aCtx = aCanvas.getContext('2d', { willReadFrequently: true });
        let meanLuma = 128;
        let lightingOk = true;
        if (aCtx) {
          aCtx.drawImage(videoRef.current, 0, 0, aCanvas.width, aCanvas.height);
          const img = aCtx.getImageData(0, 0, aCanvas.width, aCanvas.height);
          const pxMetrics = analyzeVideoFrameMetrics(
            img.data,
            aCanvas.width,
            aCanvas.height,
            prevCentroidRef.current,
            calib
          );
          meanLuma = pxMetrics.meanLuma;
          lightingOk = pxMetrics.lightingOk;
        }

        // Run real MediaPipe HandLandmarker on the live video frame
        const landmarker = handLandmarkerRef.current;
        let rawMpLandmarks: Landmark3D[] | null = null;
        if (landmarker) {
          const nowMs = performance.now();
          if (nowMs > lastVideoTimestampRef.current) {
            lastVideoTimestampRef.current = nowMs;
            try {
              const mpRes = landmarker.detectForVideo(videoRef.current, nowMs);
              if (mpRes.landmarks && mpRes.landmarks.length > 0) {
                rawMpLandmarks = mpRes.landmarks[0].map((pt) => ({
                  x: calib.mirrorCamera ? 1 - pt.x : pt.x,
                  y: pt.y,
                  z: pt.z,
                }));
              }
            } catch {
              rawMpLandmarks = null;
            }
          }
        }

        if (!lightingOk) {
          prevCentroidRef.current = null;
          metrics = {
            meanLuma,
            lightingOk: false,
            handDetected: Boolean(rawMpLandmarks),
            foregroundRatio: rawMpLandmarks ? 0.16 : 0,
            motionDelta: 0,
            centroidX: 0.5,
            centroidY: 0.5,
            guidanceMessage: 'Lighting too low',
            trackingStatus: 'low-light',
          };
        } else if (!rawMpLandmarks) {
          prevCentroidRef.current = null;
          metrics = {
            meanLuma,
            lightingOk: true,
            handDetected: false,
            foregroundRatio: 0,
            motionDelta: 0,
            centroidX: 0.5,
            centroidY: 0.5,
            guidanceMessage:
              mpReadyState === 'loading' ? 'Hold sign steady' : 'Move hands into frame',
            trackingStatus: 'no-hand',
          };
        } else {
          // Real hand detected! Measure palm/wrist centroid stability
          const wrist = rawMpLandmarks[0];
          const midMcp = rawMpLandmarks[9];
          const cx = (wrist.x + midMcp.x) * 0.5;
          const cy = (wrist.y + midMcp.y) * 0.5;
          const motionDelta = prevCentroidRef.current
            ? Math.hypot(cx - prevCentroidRef.current.x, cy - prevCentroidRef.current.y)
            : 0;
          prevCentroidRef.current = { x: cx, y: cy };

          const isSteady = motionDelta <= 0.045;
          metrics = {
            meanLuma,
            lightingOk: true,
            handDetected: true,
            foregroundRatio: 0.18,
            motionDelta,
            centroidX: cx,
            centroidY: cy,
            guidanceMessage: isSteady ? 'Hand tracked cleanly' : 'Hold sign steady',
            trackingStatus: isSteady ? 'locked' : 'unstable',
          };
          landmarks = rawMpLandmarks;
          result = classifyAslLandmarks(landmarks);
          setFrameResult(result);
        }
      } else if (manualTarget) {
        // Explicit manual fallback pose button selected when webcam is off
        metrics = {
          meanLuma: 132,
          lightingOk: true,
          handDetected: true,
          foregroundRatio: 0.16,
          motionDelta: 0.005,
          centroidX: 0.5,
          centroidY: 0.55,
          guidanceMessage: 'Hand tracked cleanly',
          trackingStatus: 'locked',
        };
        landmarks = buildCalibratedLandmarks(
          manualTarget,
          metrics.centroidX,
          metrics.centroidY,
          calib,
          phaseRef.current
        );
        result = classifyAslLandmarks(landmarks);
        setFrameResult(result);
      } else {
        // Neither live webcam hand nor manual pose is active -> ZERO fake letters emitted
        metrics = {
          meanLuma: 132,
          lightingOk: true,
          handDetected: false,
          foregroundRatio: 0,
          motionDelta: 0,
          centroidX: 0.5,
          centroidY: 0.55,
          guidanceMessage: 'Move hands into frame',
          trackingStatus: 'no-hand',
        };
        setFrameResult(null);
      }

      if (result && result.confidence < calib.confidenceThreshold) {
        lowConfStreakLoggedRef.current += 1;
        if (lowConfStreakLoggedRef.current === 5) {
          appendLog(
            `[INFO] Confidence below ${calib.confidenceThreshold.toFixed(2)} — hold clear ASL hand sign`
          );
        }
      } else if (result) {
        lowConfStreakLoggedRef.current = 0;
      }

      setLiveMetrics(metrics);

      const committed = signBufferRef.current.ingestFrame(
        result && metrics.trackingStatus === 'locked'
          ? { letter: result.letter, confidence: result.confidence }
          : null,
        performance.now(),
        {
          confidenceThreshold: calib.confidenceThreshold,
          debounceFrames: calib.debounceFrames,
        }
      );
      setStreakInfo(signBufferRef.current.streak);

      if (committed !== null) {
        onDecodedTextChange(signBufferRef.current.text);
      }

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          if (!cameraActive) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
            ctx.lineWidth = 1;
            for (let gx = 40; gx < w; gx += 40) {
              ctx.beginPath();
              ctx.moveTo(gx, 0);
              ctx.lineTo(gx, h);
              ctx.stroke();
            }
            for (let gy = 40; gy < h; gy += 40) {
              ctx.beginPath();
              ctx.moveTo(0, gy);
              ctx.lineTo(w, gy);
              ctx.stroke();
            }
          }

          // Calibration framing guide box
          ctx.strokeStyle =
            metrics.trackingStatus === 'locked'
              ? 'rgba(52, 211, 153, 0.55)'
              : 'rgba(251, 191, 36, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(w * 0.2, h * 0.14, w * 0.6, h * 0.72);
          ctx.setLineDash([]);

          if (landmarks) {
            ctx.strokeStyle =
              result && result.confidence >= calib.confidenceThreshold
                ? '#3b82f6'
                : '#f59e0b';
            ctx.lineWidth = 2.5;
            for (const [i, j] of HAND_CONNECTIONS) {
              const p1 = landmarks[i];
              const p2 = landmarks[j];
              ctx.beginPath();
              ctx.moveTo(p1.x * w, p1.y * h);
              ctx.lineTo(p2.x * w, p2.y * h);
              ctx.stroke();
            }

            landmarks.forEach((pt, idx) => {
              ctx.fillStyle =
                idx === 0 ? '#f59e0b' : idx % 4 === 0 ? '#22c55e' : '#f8fafc';
              ctx.beginPath();
              ctx.arc(pt.x * w, pt.y * h, idx === 0 ? 5.5 : 3.5, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      }
    }, 66);

    return () => window.clearInterval(intervalId);
  }, [cameraActive, mpReadyState, sequenceRunning, appendLog, onDecodedTextChange]);

  const runAbcSequence = () => {
    if (sequenceRunning) return;
    setTrackerMode('active');
    signBufferRef.current.clear();
    onDecodedTextChange('');
    setSequenceRunning(true);

    const req = calibration.debounceFrames;
    const frameQueue = [
      ...Array(req + 1).fill('A'),
      ...Array(req + 1).fill('B'),
      ...Array(req + 1).fill('C'),
    ];
    let frameIdx = 0;

    const seqTimer = window.setInterval(() => {
      if (frameIdx >= frameQueue.length) {
        window.clearInterval(seqTimer);
        setActiveTargetLetter(null);
        setSequenceRunning(false);
        const finalText = signBufferRef.current.text;
        if (finalText && onTriggerTranslateAndSpeak) {
          onTriggerTranslateAndSpeak(finalText);
        }
        return;
      }

      const letter = frameQueue[frameIdx];
      frameIdx += 1;
      setActiveTargetLetter(letter);
      phaseRef.current = (phaseRef.current + 0.08) % 1;

      const landmarks = buildCalibratedLandmarks(letter, 0.5, 0.55, calibration, phaseRef.current);
      const result = classifyAslLandmarks(landmarks);
      setFrameResult(result);

      const committed = signBufferRef.current.ingestFrame(
        { letter: result.letter, confidence: result.confidence },
        performance.now(),
        {
          confidenceThreshold: calibration.confidenceThreshold,
          debounceFrames: calibration.debounceFrames,
        }
      );
      setStreakInfo(signBufferRef.current.streak);
      if (committed !== null) {
        onDecodedTextChange(signBufferRef.current.text);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2.5;
          for (const [i, j] of HAND_CONNECTIONS) {
            ctx.beginPath();
            ctx.moveTo(landmarks[i].x * w, landmarks[i].y * h);
            ctx.lineTo(landmarks[j].x * w, landmarks[j].y * h);
            ctx.stroke();
          }
          landmarks.forEach((pt, idx) => {
            ctx.fillStyle = idx === 0 ? '#f59e0b' : idx % 4 === 0 ? '#22c55e' : '#f8fafc';
            ctx.beginPath();
            ctx.arc(pt.x * w, pt.y * h, idx === 0 ? 5.5 : 3.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
    }, 70);
  };

  const activeSpec = ASL_ALPHABET_SPECS.find((s) => s.letter === activeTargetLetter);
  const vocabInfo = getSupportedSignVocabularyInfo();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Local Hand Tracking &amp; Sign-to-Text Pipeline
          </h3>
          <p className="text-xs text-slate-600">
            On-device webcam hand landmarks &rarr; [f32; 63] normalization &rarr; editable SignBuffer transcript.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runAbcSequence}
            disabled={sequenceRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            {sequenceRunning ? 'Signing A, B, C...' : 'Perform ASL A, B, C'}
          </button>
          <button
            type="button"
            onClick={toggleCamera}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            {cameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
            {cameraActive ? 'Stop Webcam' : 'Use Webcam'}
          </button>
          <button
            type="button"
            data-testid="toggle-calibration-btn"
            aria-expanded={calibrationOpen}
            onClick={() => setCalibrationOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Calibrate
          </button>
        </div>
      </div>

      {/* Privacy & Vocabulary Controls Strip */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
          <Lock className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
          On-Device Privacy: Zero camera frames or landmark coordinates leave this machine.
        </span>
        <button
          type="button"
          data-testid="toggle-sign-vocab-btn"
          aria-expanded={vocabOpen}
          onClick={() => setVocabOpen((v) => !v)}
          className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          Vocabulary &amp; Limitations
        </button>
      </div>

      {/* Calibration Drawer */}
      {calibrationOpen && (
        <div
          data-testid="hand-calibration-panel"
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">
              Hand Tracking Calibration (Position, Hand Size, Lighting &amp; Stability)
            </h4>
            <button
              type="button"
              onClick={() => updateCalibration(DEFAULT_HAND_CALIBRATION)}
              className="underline hover:no-underline"
            >
              Reset Defaults
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-1 block">
              <span>Hand Size Scale: {calibration.handSizeScale.toFixed(1)}x</span>
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.1}
                value={calibration.handSizeScale}
                onChange={(e) =>
                  updateCalibration({
                    ...calibration,
                    handSizeScale: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-600"
              />
            </label>
            <label className="space-y-1 block">
              <span>Min Lighting Luma: {calibration.lightingMinLuma}</span>
              <input
                type="range"
                min={25}
                max={95}
                step={5}
                value={calibration.lightingMinLuma}
                onChange={(e) =>
                  updateCalibration({
                    ...calibration,
                    lightingMinLuma: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-600"
              />
            </label>
            <label className="space-y-1 block">
              <span>Confidence Gate: {calibration.confidenceThreshold.toFixed(2)}</span>
              <input
                type="range"
                min={0.7}
                max={0.9}
                step={0.05}
                value={calibration.confidenceThreshold}
                onChange={(e) =>
                  updateCalibration({
                    ...calibration,
                    confidenceThreshold: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-600"
              />
            </label>
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={calibration.mirrorCamera}
                  onChange={(e) =>
                    updateCalibration({
                      ...calibration,
                      mirrorCamera: e.target.checked,
                    })
                  }
                  className="accent-blue-600"
                />
                <span>Mirror Selfie Camera</span>
              </label>
              <div className="font-mono text-[11px] text-slate-600">
                Measured Luma: {Math.round(liveMetrics.meanLuma)} / 255
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supported Vocabulary & Limitations Drawer */}
      {vocabOpen && (
        <div
          data-testid="sign-vocab-panel"
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-700"
        >
          <div className="font-semibold text-slate-900">
            Supported Offline Sign Vocabulary &amp; Fallback Behavior
          </div>
          <p>
            <strong>Static ASL Letters:</strong> {vocabInfo.letters.join(', ')}
          </p>
          <p>
            <strong>Phrase Glosses:</strong> {vocabInfo.phraseGlosses.join(', ')}
          </p>
          <p>{vocabInfo.limitations}</p>
        </div>
      )}

      {cameraNotice && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {cameraNotice}
        </div>
      )}

      {trackerMode !== 'active' && (
        <div
          role="alert"
          data-testid="sign-unavailable-banner"
          className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-sm text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
            <span>
              <strong>Sign language unavailable</strong> —{' '}
              {trackerMode === 'model-missing'
                ? 'Local ONNX model unavailable. Keyboard, Braille, and manual A–Z controls remain operational.'
                : 'Camera disconnected cleanly. Reconnect or use manual A–Z / keyboard input.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setTrackerMode('active');
              setActiveTargetLetter(null);
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-red-200 text-red-800 hover:bg-red-100 whitespace-nowrap"
          >
            Restore Tracker
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6 space-y-3">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`absolute inset-0 w-full h-full object-cover ${
                cameraActive && trackerMode === 'active'
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              } ${calibration.mirrorCamera ? '-scale-x-100' : ''}`}
            />
            <canvas
              ref={canvasRef}
              width={480}
              height={360}
              data-testid="mediapipe-canvas"
              className="relative z-10 w-full h-full block"
            />
            {/* Top live tracking status + lighting guidance pill */}
            <div
              data-testid="hand-guidance-banner"
              className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between bg-slate-950/85 text-white px-3 py-1.5 rounded-lg text-xs font-mono"
            >
              <span>{liveMetrics.guidanceMessage}</span>
              <span>Luma {Math.round(liveMetrics.meanLuma)}</span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between bg-slate-950/85 text-white px-3 py-2 rounded-lg text-xs font-mono tabular-nums">
              {trackerMode !== 'active' ? (
                <span className="text-red-300">Sign language unavailable</span>
              ) : frameResult ? (
                <>
                  <span>
                    {cameraActive ? 'Webcam Sign' : 'Manual Pose'}: <strong>{frameResult.letter}</strong> ({streakInfo.letter === frameResult.letter.toLowerCase() ? streakInfo.count : 0}/{calibration.debounceFrames})
                  </span>
                  <span className={frameResult.confidence >= calibration.confidenceThreshold ? 'text-emerald-400' : 'text-amber-300'}>
                    Conf {(frameResult.confidence * 100).toFixed(1)}% · 15 FPS
                  </span>
                </>
              ) : (
                <span className="text-slate-300">
                  {cameraActive
                    ? mpReadyState === 'loading'
                      ? 'Loading local MediaPipe hand tracker...'
                      : 'Show a hand sign in frame · >500ms absent inserts space'
                    : 'Click Use Webcam & raise your hand to sign (zero auto-typing)'}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  signBufferRef.current.commit_word();
                  onDecodedTextChange(signBufferRef.current.text);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Commit Word
              </button>
              <button
                type="button"
                onClick={() => {
                  signBufferRef.current.backspace();
                  onDecodedTextChange(signBufferRef.current.text);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Backspace
              </button>
              <button
                type="button"
                onClick={() => {
                  signBufferRef.current.clear();
                  onDecodedTextChange('');
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Clear Buffer
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTrackerMode('model-missing');
                  appendLog('[ERROR] Local ONNX model missing (fallback active)');
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 whitespace-nowrap"
              >
                Simulate Model Error
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrackerMode('camera-disconnected');
                  appendLog('[WARN] Camera stream disconnected gracefully');
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 whitespace-nowrap"
              >
                Simulate Disconnect
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
              <span className="font-medium">Manual Pose Fallback (Hold {calibration.debounceFrames} frames)</span>
              <button
                type="button"
                onClick={() => setActiveTargetLetter(null)}
                className={`px-2 py-0.5 rounded border text-[11px] font-medium whitespace-nowrap ${
                  activeTargetLetter === null
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                No Hand (Space &gt;500ms)
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="ASL alphabet gestures">
              {ASL_ALPHABET_SPECS.map((spec) => {
                const selected = activeTargetLetter === spec.letter;
                return (
                  <button
                    key={spec.letter}
                    type="button"
                    onClick={() => {
                      setTrackerMode('active');
                      setActiveTargetLetter(spec.letter);
                    }}
                    className={`w-9 h-9 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {spec.letter}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-medium text-slate-900">
              <span>Normalized [f32; 63] Landmark Vector &amp; Edit Guide</span>
              <span className="font-mono text-slate-500">
                Gate &ge; {calibration.confidenceThreshold.toFixed(2)}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2.5 overflow-x-auto whitespace-nowrap tabular-nums">
              {frameResult
                ? `wrist=(0.00, 0.00, 0.00) · idx_tip=(${frameResult.features63[24].toFixed(2)}, ${frameResult.features63[25].toFixed(2)}, ${frameResult.features63[26].toFixed(2)}) · dims=63`
                : 'No landmarks extracted (None returned safely)'}
            </div>
            <p className="text-slate-600">
              {activeSpec ? activeSpec.note : 'Hand absent — SignBuffer inserts a word space after 500 ms.'}{' '}
              You can edit the recognized transcript directly inside Box 1 below before converting or speaking.
            </p>
          </div>

          {trackerLogs.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1">
              {trackerLogs.map((line, i) => (
                <div key={`${i}-${line}`} className="truncate">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
