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
