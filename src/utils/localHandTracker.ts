import { Landmark3D } from './signClassifier';
import { ASL_ALPHABET_SPECS, generateAslLetterLandmarks } from './aslClassifier';

export interface HandCalibrationConfig {
  mirrorCamera: boolean;
  handSizeScale: number; // 0.8 = Compact, 1.0 = Standard, 1.2 = Large
  lightingMinLuma: number; // 0..255 threshold
  confidenceThreshold: number; // 0.70..0.90
  debounceFrames: number; // 3..8
}

export const HAND_CALIBRATION_STORAGE_KEY = 'signbridge.hand_calibration';

export const DEFAULT_HAND_CALIBRATION: HandCalibrationConfig = {
  mirrorCamera: true,
  handSizeScale: 1.0,
  lightingMinLuma: 48,
  confidenceThreshold: 0.8,
  debounceFrames: 5,
};

export interface VideoFrameTrackingMetrics {
  meanLuma: number;
  lightingOk: boolean;
  handDetected: boolean;
  foregroundRatio: number;
  motionDelta: number;
  centroidX: number;
  centroidY: number;
  guidanceMessage:
    | 'Lighting too low'
    | 'Move hands into frame'
    | 'Hold sign steady'
    | 'Hand tracked cleanly';
  trackingStatus: 'low-light' | 'no-hand' | 'unstable' | 'locked';
}

/**
 * Pure local pixel-level lighting + skin/foreground hand centroid & stability analyzer.
 * Runs 100% on-device over Uint8ClampedArray pixels from <video>; zero video or telemetry leaves device.
 */
export function analyzeVideoFrameMetrics(
  rgbaPixels: Uint8ClampedArray,
  width: number,
  height: number,
  prevCentroid: { x: number; y: number } | null,
  calibration: HandCalibrationConfig
): VideoFrameTrackingMetrics {
  if (width <= 0 || height <= 0 || rgbaPixels.length < width * height * 4) {
    return {
      meanLuma: 0,
      lightingOk: false,
      handDetected: false,
      foregroundRatio: 0,
      motionDelta: 0,
      centroidX: 0.5,
      centroidY: 0.5,
      guidanceMessage: 'Move hands into frame',
      trackingStatus: 'no-hand',
    };
  }

  let lumaSum = 0;
  let pixelSamples = 0;
  let skinCount = 0;
  let sumX = 0;
  let sumY = 0;

  // Sample grid for sub-millisecond performance on low-power CPUs
  const step = 4;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = rgbaPixels[idx];
      const g = rgbaPixels[idx + 1];
      const b = rgbaPixels[idx + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      lumaSum += luma;
      pixelSamples += 1;

      // Inclusive YCbCr skin-tone chroma envelope for on-device hand presence estimation
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      if (luma > 40 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 175) {
        skinCount += 1;
        sumX += x / width;
        sumY += y / height;
      }
    }
  }

  const meanLuma = pixelSamples > 0 ? lumaSum / pixelSamples : 0;
  const lightingOk = meanLuma >= calibration.lightingMinLuma;
  const foregroundRatio = pixelSamples > 0 ? skinCount / pixelSamples : 0;
  const handDetected = foregroundRatio >= 0.035 && foregroundRatio <= 0.72;

  const centroidX = skinCount > 0 ? sumX / skinCount : 0.5;
  const centroidY = skinCount > 0 ? sumY / skinCount : 0.5;
  const motionDelta =
    prevCentroid && handDetected
      ? Math.hypot(centroidX - prevCentroid.x, centroidY - prevCentroid.y)
      : 0;

  if (!lightingOk) {
    return {
      meanLuma,
      lightingOk: false,
      handDetected,
      foregroundRatio,
      motionDelta,
      centroidX,
      centroidY,
      guidanceMessage: 'Lighting too low',
      trackingStatus: 'low-light',
    };
  }

  if (!handDetected) {
    return {
      meanLuma,
      lightingOk: true,
      handDetected: false,
      foregroundRatio,
      motionDelta: 0,
      centroidX: 0.5,
      centroidY: 0.5,
      guidanceMessage: 'Move hands into frame',
      trackingStatus: 'no-hand',
    };
  }

  if (motionDelta > 0.045) {
    return {
      meanLuma,
      lightingOk: true,
      handDetected: true,
      foregroundRatio,
      motionDelta,
      centroidX,
      centroidY,
      guidanceMessage: 'Hold sign steady',
      trackingStatus: 'unstable',
    };
  }

  return {
    meanLuma,
    lightingOk: true,
    handDetected: true,
    foregroundRatio,
    motionDelta,
    centroidX,
    centroidY,
    guidanceMessage: 'Hand tracked cleanly',
    trackingStatus: 'locked',
  };
}

/**
 * Generates calibrated 21-point landmarks centered at detected live centroid & handScale.
 */
export function buildCalibratedLandmarks(
  poseLetter: string,
  centroidX: number,
  centroidY: number,
  calibration: HandCalibrationConfig,
  phase: number
): Landmark3D[] {
  const base = generateAslLetterLandmarks(poseLetter, phase);
  const dx = centroidX - 0.5;
  const dy = centroidY - 0.55;
  const scale = calibration.handSizeScale;

  return base.map((pt) => {
    const sx = 0.5 + (pt.x - 0.5) * scale + dx * 0.45;
    const sy = 0.55 + (pt.y - 0.55) * scale + dy * 0.45;
    return {
      x: Math.max(0.05, Math.min(0.95, sx)),
      y: Math.max(0.05, Math.min(0.95, sy)),
      z: pt.z * scale,
    };
  });
}

export function getSupportedSignVocabularyInfo() {
  return {
    letters: ASL_ALPHABET_SPECS.map((s) => s.letter),
    phraseGlosses: ['HELLO', 'PLEASE', 'HELP', 'THANK YOU', 'YES', 'NO', 'WATER', 'MORE', 'SORRY', 'GOODBYE'],
    limitations:
      'Recognizes static one-handed ASL A–Z fingerspelling plus 10 core phrase glosses locally. Dynamic regional grammar, two-handed spatial inflections, and non-manual facial expressions are outside static webcam scope; unrecognized signs trigger Clear Confidence/Framing prompts and editable keyboard fallback.',
  };
}
