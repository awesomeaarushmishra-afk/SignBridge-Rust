import { Landmark3D } from './signClassifier';

export const ASL_CONFIDENCE_THRESHOLD = 0.8;
export const ASL_CONSECUTIVE_FRAMES_REQUIRED = 5;
export const ASL_WORD_BOUNDARY_MS = 500;

export interface AslFrameResult {
  letter: string;
  confidence: number;
  accepted: boolean;
  features63: number[];
}

export interface AslAlphabetPoseSpec {
  letter: string;
  // [thumb, index, middle, ring, pinky] extension [0..1]
  fingers: [number, number, number, number, number];
  // Hand orientation / spread bias [spreadX, tiltAngleRad, thumbCrossX, pinchIndex]
  spread: number;
  tilt: number;
  thumbCross: number;
  pinchIndex: number;
  note: string;
}

/**
 * Distinct 21-landmark geometric pose specifications for static ASL A–Z fingerspelling.
 * Used both for deterministic landmark synthesis and lightweight prototype matching
 * over the normalized 63-float vector.
 */
export const ASL_ALPHABET_SPECS: AslAlphabetPoseSpec[] = [
  { letter: 'A', fingers: [0.92, 0.08, 0.08, 0.08, 0.08], spread: 0.15, tilt: 0.0, thumbCross: 0.05, pinchIndex: 0.0, note: 'Closed fist with thumb upright along index side' },
  { letter: 'B', fingers: [0.12, 0.98, 0.98, 0.98, 0.96], spread: 0.06, tilt: 0.0, thumbCross: 0.85, pinchIndex: 0.0, note: 'Four fingers extended upright together, thumb tucked across palm' },
  { letter: 'C', fingers: [0.68, 0.56, 0.56, 0.54, 0.50], spread: 0.22, tilt: 0.28, thumbCross: -0.1, pinchIndex: 0.25, note: 'Curved C-arch formed by thumb and four fingers' },
  { letter: 'D', fingers: [0.42, 0.98, 0.30, 0.28, 0.26], spread: 0.12, tilt: 0.0, thumbCross: 0.45, pinchIndex: 0.65, note: 'Index upright; middle, ring, pinky touch thumb tip' },
  { letter: 'E', fingers: [0.20, 0.22, 0.22, 0.22, 0.20], spread: 0.10, tilt: 0.0, thumbCross: 0.75, pinchIndex: 0.2, note: 'All fingers curled down resting on tucked thumb' },
  { letter: 'F', fingers: [0.48, 0.38, 0.98, 0.98, 0.96], spread: 0.34, tilt: 0.0, thumbCross: 0.40, pinchIndex: 0.92, note: 'Thumb and index pinched; middle, ring, pinky spread upright' },
  { letter: 'G', fingers: [0.80, 0.94, 0.10, 0.10, 0.10], spread: 0.16, tilt: 1.35, thumbCross: 0.0, pinchIndex: 0.0, note: 'Index and thumb parallel pointing horizontally' },
  { letter: 'H', fingers: [0.35, 0.95, 0.95, 0.10, 0.10], spread: 0.10, tilt: 1.38, thumbCross: 0.55, pinchIndex: 0.0, note: 'Index and middle extended together horizontally' },
  { letter: 'I', fingers: [0.28, 0.10, 0.10, 0.10, 0.98], spread: 0.20, tilt: 0.0, thumbCross: 0.65, pinchIndex: 0.0, note: 'Pinky upright; remaining fingers curled under thumb' },
  { letter: 'J', fingers: [0.30, 0.10, 0.10, 0.10, 0.96], spread: 0.25, tilt: -0.45, thumbCross: 0.62, pinchIndex: 0.0, note: 'Pinky extended tilted into J-arc posture' },
  { letter: 'K', fingers: [0.66, 0.96, 0.88, 0.10, 0.10], spread: 0.36, tilt: 0.08, thumbCross: 0.32, pinchIndex: 0.0, note: 'Index and middle spread in V with thumb wedged between' },
  { letter: 'L', fingers: [0.98, 0.98, 0.10, 0.10, 0.10], spread: 0.42, tilt: 0.0, thumbCross: -0.25, pinchIndex: 0.0, note: 'L-shape: thumb horizontal, index straight up' },
  { letter: 'M', fingers: [0.22, 0.36, 0.36, 0.34, 0.12], spread: 0.08, tilt: -0.15, thumbCross: 0.88, pinchIndex: 0.15, note: 'Three fingers folded forward over tucked thumb' },
  { letter: 'N', fingers: [0.22, 0.38, 0.38, 0.12, 0.12], spread: 0.08, tilt: -0.15, thumbCross: 0.82, pinchIndex: 0.15, note: 'Two fingers folded over tucked thumb' },
  { letter: 'O', fingers: [0.55, 0.46, 0.46, 0.44, 0.42], spread: 0.10, tilt: 0.12, thumbCross: 0.45, pinchIndex: 0.88, note: 'Fingertips meet thumb tip forming closed O-ring' },
  { letter: 'P', fingers: [0.64, 0.92, 0.78, 0.12, 0.12], spread: 0.32, tilt: 2.35, thumbCross: 0.30, pinchIndex: 0.0, note: 'K-handshape inverted pointing downward' },
  { letter: 'Q', fingers: [0.85, 0.92, 0.10, 0.10, 0.10], spread: 0.24, tilt: 2.55, thumbCross: -0.05, pinchIndex: 0.0, note: 'G-handshape inverted pointing downward' },
  { letter: 'R', fingers: [0.28, 0.96, 0.92, 0.10, 0.10], spread: -0.34, tilt: 0.0, thumbCross: 0.60, pinchIndex: 0.0, note: 'Index and middle extended and crossed tightly' },
  { letter: 'S', fingers: [0.24, 0.08, 0.08, 0.08, 0.08], spread: 0.10, tilt: 0.0, thumbCross: 0.78, pinchIndex: 0.1, note: 'Tight fist with thumb folded across front of fingers' },
  { letter: 'T', fingers: [0.46, 0.30, 0.10, 0.10, 0.10], spread: 0.12, tilt: 0.0, thumbCross: 0.50, pinchIndex: 0.35, note: 'Thumb tucked between index and middle fingers' },
  { letter: 'U', fingers: [0.26, 0.98, 0.98, 0.10, 0.10], spread: 0.04, tilt: 0.0, thumbCross: 0.62, pinchIndex: 0.0, note: 'Index and middle upright pressed side by side' },
  { letter: 'V', fingers: [0.26, 0.98, 0.98, 0.10, 0.10], spread: 0.48, tilt: 0.0, thumbCross: 0.62, pinchIndex: 0.0, note: 'Index and middle spread wide in V-sign' },
  { letter: 'W', fingers: [0.24, 0.98, 0.98, 0.98, 0.10], spread: 0.38, tilt: 0.0, thumbCross: 0.65, pinchIndex: 0.0, note: 'Index, middle, and ring extended and separated' },
  { letter: 'X', fingers: [0.28, 0.56, 0.10, 0.10, 0.10], spread: 0.12, tilt: 0.1, thumbCross: 0.58, pinchIndex: 0.0, note: 'Index bent into hook; other fingers curled' },
  { letter: 'Y', fingers: [0.96, 0.10, 0.10, 0.10, 0.96], spread: 0.50, tilt: -0.18, thumbCross: -0.20, pinchIndex: 0.0, note: 'Thumb and pinky extended wide (shaka posture)' },
  { letter: 'Z', fingers: [0.32, 0.98, 0.10, 0.10, 0.10], spread: 0.12, tilt: 0.38, thumbCross: 0.55, pinchIndex: 0.0, note: 'Index extended diagonally to trace Z' },
];

/**
 * Step 3: Landmark normalization (exact spec):
 * 1. Translate so wrist (landmark 0) is at origin (0,0,0).
 * 2. Scale by the max Euclidean distance from wrist across all 21 points.
 * 3. Flatten to a [f32; 63] feature vector.
 */
export function normalizeLandmarksTo63(landmarks: Landmark3D[]): number[] {
  if (landmarks.length !== 21) {
    return new Array(63).fill(0);
  }
  const wrist = landmarks[0];
  let maxDist = 1e-5;

  const translated = landmarks.map((pt) => {
    const dx = pt.x - wrist.x;
    const dy = pt.y - wrist.y;
    const dz = pt.z - wrist.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) {
      maxDist = dist;
    }
    return { x: dx, y: dy, z: dz };
  });

  const vec63: number[] = new Array(63);
  for (let i = 0; i < 21; i++) {
    vec63[i * 3] = translated[i].x / maxDist;
    vec63[i * 3 + 1] = translated[i].y / maxDist;
    vec63[i * 3 + 2] = translated[i].z / maxDist;
  }
  return vec63;
}

/**
 * Deterministic 21-point hand landmark generator for any static ASL letter A–Z.
 */
export function generateAslLetterLandmarks(
  letter: string,
  phase = 0.25
): Landmark3D[] {
  const upper = letter.toUpperCase();
  const spec =
    ASL_ALPHABET_SPECS.find((s) => s.letter === upper) ?? ASL_ALPHABET_SPECS[0];

  const [thumbExt, idxExt, midExt, ringExt, pinkyExt] = spec.fingers;
  const microJitter = Math.sin(phase * Math.PI * 2) * 0.004;
  const wristX = 0.5 + microJitter;
  const wristY = 0.68;

  const raw: Landmark3D[] = new Array(21);
  raw[0] = { x: 0, y: 0, z: 0 };

  // Thumb (1..4)
  const thumbX = 0.038 - spec.thumbCross * 0.095 - thumbExt * 0.065;
  const thumbY = -0.055 - thumbExt * 0.075;
  raw[1] = { x: -0.024, y: -0.022, z: -0.01 };
  raw[2] = { x: -0.036 + (thumbX + 0.036) * 0.35, y: -0.045, z: -0.015 };
  raw[3] = { x: -0.036 + (thumbX + 0.036) * 0.7, y: thumbY * 0.75, z: -0.02 };
  raw[4] = { x: thumbX, y: thumbY, z: -0.025 };

  const buildFinger = (
    baseIdx: number,
    baseOffset: number,
    spreadFactor: number,
    lengthScale: number,
    ext: number,
    pinchPull: number
  ) => {
    const mcpX = baseOffset;
    const mcpY = -0.095;
    raw[baseIdx] = { x: mcpX, y: mcpY, z: 0 };

    const reach = 0.22 + ext * 0.78;
    const curlDrop = (1 - ext) * 0.058;
    const curlZ = (1 - ext) * -0.042;
    const fanX = spreadFactor * spec.spread * 0.065;

    const tipX =
      mcpX + fanX - pinchPull * 0.025;
    const tipY =
      mcpY - 0.115 * lengthScale * reach + curlDrop + pinchPull * 0.03;

    raw[baseIdx + 1] = {
      x: mcpX + fanX * 0.28,
      y: mcpY - 0.042 * lengthScale * reach + curlDrop * 0.25,
      z: curlZ * 0.3,
    };
    raw[baseIdx + 2] = {
      x: mcpX + fanX * 0.62 - pinchPull * 0.012,
      y: mcpY - 0.08 * lengthScale * reach + curlDrop * 0.7,
      z: curlZ * 0.65,
    };
    raw[baseIdx + 3] = {
      x: tipX,
      y: tipY,
      z: curlZ,
    };
  };

  buildFinger(5, -0.036, -1.2, 1.0, idxExt, spec.pinchIndex);
  buildFinger(9, -0.012, -0.2, 1.08, midExt, 0);
  buildFinger(13, 0.014, 0.5, 1.0, ringExt, 0);
  buildFinger(17, 0.038, 1.25, 0.85, pinkyExt, 0);

  // Rotate around wrist in XY plane by spec.tilt and translate into image coords
  const cosT = Math.cos(spec.tilt);
  const sinT = Math.sin(spec.tilt);

  return raw.map((pt) => ({
    x: wristX + pt.x * cosT - pt.y * sinT,
    y: wristY + pt.x * sinT + pt.y * cosT,
    z: pt.z,
  }));
}

interface AnatomicalPoseFeatures {
  ext: [number, number, number, number, number]; // thumb, index, middle, ring, pinky [0..1]
  pinchIndex: number; // [0..1] thumb tip <-> index tip proximity
  pinchMiddle: number; // [0..1] thumb tip <-> middle tip proximity
  thumbCross: number; // [0..1] thumb tucked across toward ring/pinky MCP
  spreadIndexMiddle: number; // normalized distance between index tip (8) and middle tip (12)
  horizRatio: number; // |dx| / len of primary hand axis (detects G/H horizontal vs upright)
  downRatio: number; // dy / len (detects P/Q inverted downward)
  spreadDirCross: number; // detects crossed fingers (R) vs open spread (V/U)
}

function dist3(a: Landmark3D, b: Landmark3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function fingerExtensionFromLandmarks(
  wrist: Landmark3D,
  mcp: Landmark3D,
  pip: Landmark3D,
  tip: Landmark3D
): number {
  const mcpWrist = Math.max(dist3(mcp, wrist), 1e-4);
  const tipWrist = dist3(tip, wrist);
  const reachRatio = clamp01((tipWrist / mcpWrist - 1.02) / 0.92);

  const v1x = pip.x - mcp.x;
  const v1y = pip.y - mcp.y;
  const v2x = tip.x - pip.x;
  const v2y = tip.y - pip.y;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  const straightCos =
    n1 > 1e-4 && n2 > 1e-4 ? (v1x * v2x + v1y * v2y) / (n1 * n2) : 0;
  const straightScore = clamp01((straightCos + 0.15) / 1.1);

  return reachRatio * 0.65 + straightScore * 0.35;
}

function extractAnatomicalFeatures(features63: number[]): AnatomicalPoseFeatures {
  const pts: Landmark3D[] = [];
  for (let i = 0; i < 21; i++) {
    pts.push({
      x: features63[i * 3],
      y: features63[i * 3 + 1],
      z: features63[i * 3 + 2],
    });
  }

  const wrist = pts[0];
  const palmScale = Math.max(dist3(wrist, pts[9]), dist3(pts[5], pts[17]), 0.15);

  const idxExt = fingerExtensionFromLandmarks(wrist, pts[5], pts[6], pts[8]);
  const midExt = fingerExtensionFromLandmarks(wrist, pts[9], pts[10], pts[12]);
  const ringExt = fingerExtensionFromLandmarks(wrist, pts[13], pts[14], pts[16]);
  const pinkyExt = fingerExtensionFromLandmarks(wrist, pts[17], pts[18], pts[20]);

  // Thumb extension relative to index MCP (5) & palm center (9)
  const thumbOutDist = dist3(pts[4], pts[5]) / palmScale;
  const thumbPalmDist = dist3(pts[4], pts[9]) / palmScale;
  const thumbExt = clamp01((Math.max(thumbOutDist, thumbPalmDist * 0.85) - 0.32) / 0.72);

  // Thumb tucked across palm toward ring/pinky base
  const thumbPinkyDist = dist3(pts[4], pts[17]) / palmScale;
  const thumbCross = clamp01(1 - (thumbPinkyDist - 0.25) / 0.95);

  // Thumb pinch to index tip (F, O) and middle/ring tips (D)
  const pinchIndex = clamp01(1 - (dist3(pts[4], pts[8]) / palmScale - 0.12) / 0.68);
  const pinchMiddle = clamp01(1 - (dist3(pts[4], pts[12]) / palmScale - 0.15) / 0.75);

  // Spread between index tip (8) and middle tip (12)
  const tipGap = dist3(pts[8], pts[12]) / palmScale;
  const mcpGap = Math.max(dist3(pts[5], pts[9]) / palmScale, 0.08);
  const spreadIndexMiddle = clamp01(tipGap / 0.95);

  // Detect crossed fingers (R): tips closer/inverted horizontally relative to MCPs while both extended
  const mcpOrder = pts[5].x - pts[9].x;
  const tipOrder = pts[8].x - pts[12].x;
  const spreadDirCross =
    idxExt > 0.6 && midExt > 0.6 && mcpOrder * tipOrder < 0 && tipGap < mcpGap * 1.4
      ? 1.0
      : 0.0;

  // Hand orientation via wrist->middle MCP & index pointing vector
  const axisX = pts[9].x - wrist.x + (pts[8].x - pts[5].x) * 0.45;
  const axisY = pts[9].y - wrist.y + (pts[8].y - pts[5].y) * 0.45;
  const axisLen = Math.max(Math.hypot(axisX, axisY), 1e-4);
  const horizRatio = clamp01(Math.abs(axisX) / axisLen);
  const downRatio = clamp01((axisY / axisLen + 0.15) / 1.15);

  return {
    ext: [thumbExt, idxExt, midExt, ringExt, pinkyExt],
    pinchIndex,
    pinchMiddle,
    thumbCross,
    spreadIndexMiddle,
    horizRatio,
    downRatio,
    spreadDirCross,
  };
}

// Precompute normalized 63-float & anatomical feature templates once at module load
const ASL_TEMPLATE_63: Record<string, number[]> = Object.fromEntries(
  ASL_ALPHABET_SPECS.map((s) => [
    s.letter,
    normalizeLandmarksTo63(generateAslLetterLandmarks(s.letter, 0)),
  ])
);

const ASL_ANATOMICAL_TEMPLATES: Record<string, AnatomicalPoseFeatures> = Object.fromEntries(
  ASL_ALPHABET_SPECS.map((s) => [
    s.letter,
    extractAnatomicalFeatures(ASL_TEMPLATE_63[s.letter]),
  ])
);

function anatomicalDistanceSq(a: AnatomicalPoseFeatures, b: AnatomicalPoseFeatures): number {
  let d = 0;
  for (let i = 0; i < 5; i++) {
    const diff = a.ext[i] - b.ext[i];
    d += diff * diff * 2.4;
  }
  d += (a.pinchIndex - b.pinchIndex) ** 2 * 1.6;
  d += (a.pinchMiddle - b.pinchMiddle) ** 2 * 0.9;
  d += (a.thumbCross - b.thumbCross) ** 2 * 1.2;
  d += (a.spreadIndexMiddle - b.spreadIndexMiddle) ** 2 * 1.5;
  d += (a.horizRatio - b.horizRatio) ** 2 * 1.8;
  d += (a.downRatio - b.downRatio) ** 2 * 1.8;
  d += (a.spreadDirCross - b.spreadDirCross) ** 2 * 2.0;
  return d;
}

/**
 * Classifies a 21-landmark hand frame into (letter, confidence) using the
 * 63-float max-wrist-distance normalized feature vector combined with
 * scale- and handedness-invariant anatomical pose matching.
 */
export function classifyAslLandmarks(landmarks: Landmark3D[]): AslFrameResult {
  const features63 = normalizeLandmarksTo63(landmarks);
  if (landmarks.length !== 21) {
    return { letter: 'A', confidence: 0, accepted: false, features63 };
  }

  // Validate non-degenerate skeletal hand geometry (palm must have measurable span)
  const palmSpan = Math.hypot(
    features63[9 * 3] - features63[0],
    features63[9 * 3 + 1] - features63[1],
    features63[9 * 3 + 2] - features63[2]
  );
  const knuckleSpan = Math.hypot(
    features63[17 * 3] - features63[5 * 3],
    features63[17 * 3 + 1] - features63[5 * 3 + 1],
    features63[17 * 3 + 2] - features63[5 * 3 + 2]
  );

  if (palmSpan < 0.14 || knuckleSpan < 0.08) {
    return { letter: 'A', confidence: 0.15, accepted: false, features63 };
  }

  const liveAnat = extractAnatomicalFeatures(features63);

  let bestLetter = 'A';
  let minCost = Infinity;
  let minAnatDist = Infinity;
  const scores: Array<{ letter: string; logit: number }> = [];

  for (const spec of ASL_ALPHABET_SPECS) {
    const tmpl = ASL_TEMPLATE_63[spec.letter];
    const anatTmpl = ASL_ANATOMICAL_TEMPLATES[spec.letter];
    let sqDistDirect = 0;
    let sqDistMirrored = 0;
    for (let i = 0; i < 63; i++) {
      const isX = i % 3 === 0;
      const diffDirect = features63[i] - tmpl[i];
      const diffMirror = (isX ? -features63[i] : features63[i]) - tmpl[i];
      sqDistDirect += diffDirect * diffDirect;
      sqDistMirrored += diffMirror * diffMirror;
    }
    const sqDist = Math.min(sqDistDirect, sqDistMirrored);
    const anatDist = anatomicalDistanceSq(liveAnat, anatTmpl);
    // Prioritize anatomical invariants so real human hands with varied proportions/handedness classify accurately
    const combinedCost = anatDist * 0.72 + Math.min(sqDist, 6.0) * 0.28;

    if (combinedCost < minCost) {
      minCost = combinedCost;
      minAnatDist = anatDist;
      bestLetter = spec.letter;
    }
    scores.push({ letter: spec.letter, logit: -combinedCost * 34.0 });
  }

  const maxLogit = Math.max(...scores.map((s) => s.logit));
  const expSum = scores.reduce((acc, s) => acc + Math.exp(s.logit - maxLogit), 0);
  const bestProb =
    Math.exp((scores.find((s) => s.letter === bestLetter)?.logit ?? 0) - maxLogit) /
    Math.max(expSum, 1e-6);

  const distancePenalty = Math.exp(-minAnatDist * 0.22);
  const confidence = Number(
    Math.max(0, Math.min(1, bestProb * distancePenalty)).toFixed(3)
  );

  return {
    letter: bestLetter,
    confidence,
    accepted: confidence >= ASL_CONFIDENCE_THRESHOLD,
    features63,
  };
}

/**
 * Debounce + word-boundary SignBuffer state machine matching the Rust SignBuffer spec:
 * - Same letter for N=5 consecutive frames (>= 0.80 conf) -> commit once.
 * - Hand absent for > 500 ms -> commit word boundary (space).
 */
export class SignBuffer {
  private buffer = '';
  private candidateLetter: string | null = null;
  private consecutiveCount = 0;
  private lastCommittedRunLetter: string | null = null;
  private lastHandSeenMs: number | null = null;
  private spaceInsertedAfterLoss = false;

  get text(): string {
    return this.buffer;
  }

  get streak(): { letter: string | null; count: number } {
    return { letter: this.candidateLetter, count: this.consecutiveCount };
  }

  push_letter(c: string): void {
    this.buffer += c.toLowerCase();
  }

  commit_word(): void {
    if (this.buffer.length > 0 && !this.buffer.endsWith(' ')) {
      this.buffer += ' ';
    }
    this.lastCommittedRunLetter = null;
  }

  backspace(): void {
    if (this.buffer.length > 0) {
      this.buffer = this.buffer.slice(0, -1);
    }
    this.lastCommittedRunLetter = null;
  }

  clear(): void {
    this.buffer = '';
    this.candidateLetter = null;
    this.consecutiveCount = 0;
    this.lastCommittedRunLetter = null;
    this.lastHandSeenMs = null;
    this.spaceInsertedAfterLoss = false;
  }

  /**
   * Feeds one tracker frame (or null if no hand detected) at `nowMs`.
   * Returns the committed letter (e.g. 'a') or ' ' if a word boundary was inserted, or null.
   */
  ingestFrame(
    detection: { letter: string; confidence: number } | null,
    nowMs: number,
    options?: { confidenceThreshold?: number; debounceFrames?: number }
  ): string | null {
    const threshold = options?.confidenceThreshold ?? ASL_CONFIDENCE_THRESHOLD;
    const requiredFrames = options?.debounceFrames ?? ASL_CONSECUTIVE_FRAMES_REQUIRED;

    if (!detection) {
      this.candidateLetter = null;
      this.consecutiveCount = 0;
      if (
        this.lastHandSeenMs !== null &&
        !this.spaceInsertedAfterLoss &&
        nowMs - this.lastHandSeenMs > ASL_WORD_BOUNDARY_MS
      ) {
        this.spaceInsertedAfterLoss = true;
        if (this.buffer.length > 0 && !this.buffer.endsWith(' ')) {
          this.commit_word();
          return ' ';
        }
      }
      return null;
    }

    this.lastHandSeenMs = nowMs;
    this.spaceInsertedAfterLoss = false;

    if (detection.confidence < threshold) {
      this.candidateLetter = null;
      this.consecutiveCount = 0;
      return null;
    }

    const lower = detection.letter.toLowerCase();
    if (this.candidateLetter === lower) {
      this.consecutiveCount += 1;
    } else {
      this.candidateLetter = lower;
      this.consecutiveCount = 1;
      this.lastCommittedRunLetter = null;
    }

    if (
      this.consecutiveCount >= requiredFrames &&
      this.lastCommittedRunLetter !== lower
    ) {
      this.push_letter(lower);
      this.lastCommittedRunLetter = lower;
      return lower;
    }

    return null;
  }
}
