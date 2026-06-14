import type { HeightMap } from '../geometry/types';

/** Rec. 601 luma weights for perceptual grayscale. */
const R_W = 0.299;
const G_W = 0.587;
const B_W = 0.114;

/**
 * Convert RGBA ImageData into a normalized brightness HeightMap.
 *
 * `invert` flips brightness so callers can keep a single thickness mapping:
 * by lithophane convention dark pixels print thicker (block more light).
 */
export function imageDataToHeightMap(image: ImageData, invert = false): HeightMap {
  const { width, height, data } = image;
  const out = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    let lum = (R_W * r + G_W * g + B_W * b) / 255; // 0..1, 1 = white/bright
    if (invert) lum = 1 - lum;
    out[i] = lum;
  }
  return { width, height, data: out };
}

/**
 * Center-crop a HeightMap to the given target aspect ratio (targetW : targetH).
 * The largest centered rectangle with that ratio is extracted from the source.
 */
export function centerCropHeightMap(
  hm: HeightMap,
  targetW: number,
  targetH: number,
): HeightMap {
  const srcAspect = hm.width / hm.height;
  const tgtAspect = targetW / targetH;
  let cropW: number, cropH: number;
  if (srcAspect > tgtAspect) {
    cropH = hm.height;
    cropW = Math.max(1, Math.round(cropH * tgtAspect));
  } else {
    cropW = hm.width;
    cropH = Math.max(1, Math.round(cropW / tgtAspect));
  }
  const x0 = Math.floor((hm.width - cropW) / 2);
  const y0 = Math.floor((hm.height - cropH) / 2);
  const out = new Float32Array(cropW * cropH);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      out[y * cropW + x] = hm.data[(y0 + y) * hm.width + (x0 + x)];
    }
  }
  return { width: cropW, height: cropH, data: out };
}

/** Sample brightness at integer grid coords (clamped). */
export function sampleBrightness(hm: HeightMap, x: number, y: number): number {
  const cx = Math.min(hm.width - 1, Math.max(0, x));
  const cy = Math.min(hm.height - 1, Math.max(0, y));
  return hm.data[cy * hm.width + cx];
}

/**
 * Map a brightness value to lithophane thickness.
 * Bright (1) -> lithoMin, dark (0) -> lithoMax.
 */
export function brightnessToThickness(
  brightness: number,
  lithoMin: number,
  lithoMax: number,
): number {
  return lithoMax - brightness * (lithoMax - lithoMin);
}
