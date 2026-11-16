export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export interface UpperBodyPose {
  nose: Landmark3D;
  leftShoulder: Landmark3D;
  rightShoulder: Landmark3D;
  leftElbow: Landmark3D;
  rightElbow: Landmark3D;
  leftWrist: Landmark3D;
  rightWrist: Landmark3D;
}

export type SignLabel =
  | 'HELLO'
  | 'THANK YOU'
  | 'YES'
  | 'NO'
  | 'HELP'
  | 'PLEASE'
  | 'WATER'
  | 'GOODBYE'
  | 'SORRY'
  | 'MORE';

export const SIGN_VOCABULARY: SignLabel[] = [
  'HELLO',
  'PLEASE',
  'HELP',
  'THANK YOU',
  'YES',
  'NO',
  'WATER',
  'MORE',
  'SORRY',
  'GOODBYE',
];

// MediaPipe 21-landmark hand skeleton connections
export const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm arch
];

export interface FingerExtensions {
  thumb: number;
  index: number;
  middle: number;
  ring: number;
  pinky: number;
}

export interface SignClassification {
  sign: SignLabel;
  confidence: number;
  fingerExtensions: FingerExtensions;
  wristHeightZone: 'head' | 'chest' | 'neutral';
  cosineScore: number;
}

interface SignPrototype {
  sign: SignLabel;
  // [thumb, index, middle, ring, pinky, wristElevation (0=low, 1=head)]
  vector: [number, number, number, number, number, number];
  description: string;
}

const SIGN_PROTOTYPES: SignPrototype[] = [
  {
    sign: 'HELLO',
    vector: [0.98, 0.98, 0.98, 0.98, 0.98, 0.94],
    description: 'Open 5-finger palm raised high near temple/forehead',
  },
  {
    sign: 'PLEASE',
    vector: [0.85, 0.95, 0.95, 0.95, 0.95, 0.34],
    description: 'Flat open palm positioned low over center chest',
  },
  {
    sign: 'HELP',
    vector: [0.95, 0.12, 0.12, 0.12, 0.12, 0.48],
    description: 'Thumbs-up fist supported on neutral chest plane',
  },
  {
    sign: 'THANK YOU',
    vector: [0.22, 0.96, 0.96, 0.95, 0.94, 0.68],
    description: 'Flat fingers with tucked thumb extending outward from chin',
  },
  {
    sign: 'YES',
    vector: [0.15, 0.12, 0.12, 0.12, 0.12, 0.62],
    description: 'Closed S-handshape fist with nodding wrist arc',
  },
  {
    sign: 'NO',
    vector: [0.70, 0.88, 0.88, 0.12, 0.12, 0.58],
    description: 'Thumb, index, and middle extended; ring & pinky curled',
  },
  {
    sign: 'WATER',
    vector: [0.18, 0.95, 0.95, 0.95, 0.12, 0.78],
    description: 'W-handshape (3 middle fingers up) tapping near chin',
  },
  {
    sign: 'MORE',
    vector: [0.55, 0.48, 0.48, 0.46, 0.45, 0.45],
    description: 'Pinched O-handshape fingers gathered together at chest',
  },
  {
    sign: 'SORRY',
    vector: [0.42, 0.12, 0.12, 0.12, 0.12, 0.28],
    description: 'Closed A-handshape fist over lower chest center',
  },
  {
    sign: 'GOODBYE',
    vector: [0.90, 0.65, 0.65, 0.65, 0.65, 0.82],
    description: 'Half-flexed waving palm at shoulder/head height',
  },
];

function distance3D(a: Landmark3D, b: Landmark3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Mirrors sign-language-translator's Landmarks normalization:
 * Translates WRIST (0) to origin and normalizes by palm scale (WRIST -> MIDDLE_MCP).
 */
export function normalizeHandLandmarks(landmarks: Landmark3D[]): Landmark3D[] {
  if (landmarks.length < 21) return landmarks;
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const palmScale = Math.max(distance3D(wrist, middleMcp), 1e-4);

  return landmarks.map((pt) => ({
    x: (pt.x - wrist.x) / palmScale,
    y: (pt.y - wrist.y) / palmScale,
    z: (pt.z - wrist.z) / palmScale,
  }));
}

function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

/**
 * Computes normalized finger extension ratios [0..1] from 21 MediaPipe hand landmarks.
 */
export function computeFingerExtensions(landmarks: Landmark3D[]): FingerExtensions {
  const norm = normalizeHandLandmarks(landmarks);
  if (norm.length < 21) {
    return { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
  }

  // Thumb: tip (4) distance from pinky MCP (17) normalized
  const thumbSpan = distance3D(norm[4], norm[17]);
  const thumb = clamp01((thumbSpan - 0.55) / 1.05);

  // Fingers: tip distance to wrist relative to MCP-to-wrist (~1.0)
  const fingerRatio = (mcpIdx: number, tipIdx: number): number => {
    const mcpDist = Math.max(distance3D(norm[0], norm[mcpIdx]), 0.35);
    const tipDist = distance3D(norm[0], norm[tipIdx]);
    return clamp01((tipDist / mcpDist - 0.85) / 1.05);
  };

  return {
    thumb,
    index: fingerRatio(5, 8),
    middle: fingerRatio(9, 12),
    ring: fingerRatio(13, 16),
    pinky: fingerRatio(17, 20),
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 1e-6 ? dot / denom : 0;
}

export function classifySignGesture(
  handLandmarks: Landmark3D[],
  pose?: UpperBodyPose
): SignClassification {
  const ext = computeFingerExtensions(handLandmarks);
  const wristY = handLandmarks[0]?.y ?? 0.55;
  const noseY = pose?.nose.y ?? 0.25;
  const shoulderY = pose
    ? (pose.leftShoulder.y + pose.rightShoulder.y) / 2
    : 0.45;

  // Map wrist vertical position into [0..1] elevation (1 = head level, 0 = waist)
  const elevation = clamp01(1 - (wristY - noseY) / Math.max(0.55, shoulderY - noseY + 0.35));
  const wristHeightZone: 'head' | 'chest' | 'neutral' =
    elevation >= 0.68 ? 'head' : elevation >= 0.38 ? 'chest' : 'neutral';

  const featureVec = [
    ext.thumb,
    ext.index,
    ext.middle,
    ext.ring,
    ext.pinky,
    elevation,
  ];

  let bestSign: SignLabel = 'HELLO';
  let bestScore = -1;

  for (const proto of SIGN_PROTOTYPES) {
    const cos = cosineSimilarity(featureVec, proto.vector);
    // Euclidean proximity penalty differentiates low vs high extension scales
    const sqDist = featureVec.reduce(
      (acc, v, i) => acc + (v - proto.vector[i]) ** 2,
      0
    );
    const l2Bonus = Math.exp(-sqDist * 1.35);
    const combined = cos * 0.45 + l2Bonus * 0.55;

    if (combined > bestScore) {
      bestScore = combined;
      bestSign = proto.sign;
    }
  }

  return {
    sign: bestSign,
    confidence: Number(clamp01(bestScore).toFixed(3)),
    fingerExtensions: ext,
    wristHeightZone,
    cosineScore: Number(clamp01(bestScore).toFixed(3)),
  };
}

export function getSignPrototypeDescription(sign: SignLabel): string {
  return SIGN_PROTOTYPES.find((p) => p.sign === sign)?.description ?? '';
}

/**
 * Generates deterministic 21-point MediaPipe Hand Landmarks + UpperBodyPose
 * for a target sign at animation phase [0..1], enabling live landmark inspection
 * and verification even without a physical webcam.
 */
export function generateSignLandmarkFrame(
  sign: SignLabel,
  phase = 0.5
): { hand: Landmark3D[]; pose: UpperBodyPose } {
  const proto = SIGN_PROTOTYPES.find((p) => p.sign === sign) ?? SIGN_PROTOTYPES[0];
  const [thumbExt, idxExt, midExt, ringExt, pinkyExt, elev] = proto.vector;

  const wave = Math.sin(phase * Math.PI * 2);
  const wristX = 0.62 + (sign === 'HELLO' || sign === 'GOODBYE' ? wave * 0.035 : 0);
  // Matches elevation = clamp01(1 - (wristY - noseY) / 0.55)
  const wristY = 0.24 + (1 - elev) * 0.55 + (sign === 'YES' ? wave * 0.02 : 0);

  const pose: UpperBodyPose = {
    nose: { x: 0.5, y: 0.24, z: -0.05 },
    leftShoulder: { x: 0.36, y: 0.44, z: 0 },
    rightShoulder: { x: 0.64, y: 0.44, z: 0 },
    leftElbow: { x: 0.30, y: 0.64, z: 0.02 },
    rightElbow: { x: 0.72, y: 0.62, z: 0.02 },
    leftWrist: { x: 0.38, y: 0.76, z: -0.03 },
    rightWrist: { x: wristX, y: wristY, z: -0.06 },
  };

  const palmH = 0.085;
  const hand: Landmark3D[] = new Array(21);
  hand[0] = { x: wristX, y: wristY, z: 0 };

  // Thumb (1..4): tucked across palm when thumbExt is low, abducted outward when high
  const thumbTipX = wristX + 0.016 - thumbExt * 0.115;
  const thumbTipY = wristY - 0.068 - thumbExt * 0.035;
  hand[1] = { x: wristX - 0.024, y: wristY - 0.022, z: -0.01 };
  hand[2] = { x: wristX - 0.032 - thumbExt * 0.025, y: wristY - 0.045, z: -0.015 };
  hand[3] = { x: (hand[2].x + thumbTipX) * 0.5, y: (hand[2].y + thumbTipY) * 0.5, z: -0.02 };
  hand[4] = { x: thumbTipX, y: thumbTipY, z: -0.025 };

  // Helper for fingers 1..4 (Index, Middle, Ring, Pinky)
  const buildFinger = (
    baseIdx: number,
    xOffset: number,
    lengthScale: number,
    extension: number
  ) => {
    const mcpX = wristX + xOffset;
    const mcpY = wristY - palmH;
    hand[baseIdx] = { x: mcpX, y: mcpY, z: 0 };

    // When curled (extension -> 0), segments fold inward toward palm
    const reach = 0.25 + extension * 0.75;
    const curlDrop = (1 - extension) * 0.055;
    const curlZ = (1 - extension) * -0.04;

    hand[baseIdx + 1] = {
      x: mcpX + xOffset * 0.12,
      y: mcpY - 0.038 * lengthScale * reach + curlDrop * 0.2,
      z: curlZ * 0.3,
    };
    hand[baseIdx + 2] = {
      x: mcpX + xOffset * 0.2,
      y: mcpY - 0.068 * lengthScale * reach + curlDrop * 0.65,
      z: curlZ * 0.7,
    };
    hand[baseIdx + 3] = {
      x: mcpX + xOffset * 0.25,
      y: mcpY - 0.092 * lengthScale * reach + curlDrop * 1.15,
      z: curlZ,
    };
  };

  buildFinger(5, -0.036, 1.0, idxExt);
  buildFinger(9, -0.012, 1.08, midExt);
  buildFinger(13, 0.014, 1.0, ringExt);
  buildFinger(17, 0.038, 0.84, pinkyExt);

  return { hand, pose };
}
