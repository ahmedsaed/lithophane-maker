import type { HeightMap, GrayscaleMode, CropRect } from '../geometry/types';

const R601 = 0.299, G601 = 0.587, B601 = 0.114;
const R709 = 0.2126, G709 = 0.7152, B709 = 0.0722;

function srgbToLinear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Separable 3×3 Gaussian blur: kernel [0.25, 0.5, 0.25] per axis. */
function gaussianBlur3x3(data: Float32Array, w: number, h: number): Float32Array {
  const tmp = new Float32Array(data.length);
  const out = new Float32Array(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xm = Math.max(0, x - 1), xp = Math.min(w - 1, x + 1);
      tmp[y * w + x] = 0.25 * data[y * w + xm] + 0.5 * data[y * w + x] + 0.25 * data[y * w + xp];
    }
  }
  for (let y = 0; y < h; y++) {
    const ym = Math.max(0, y - 1), yp = Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      out[y * w + x] = 0.25 * tmp[ym * w + x] + 0.5 * tmp[y * w + x] + 0.25 * tmp[yp * w + x];
    }
  }
  return out;
}

export interface HeightMapOptions {
  invert?: boolean;
  grayscaleMode?: GrayscaleMode;
  /** Brightness offset in [-0.5, 0.5]. Default 0. */
  brightness?: number;
  /** Contrast multiplier in [0.5, 2.0]. Default 1. */
  contrast?: number;
  /** Stretch histogram to [0, 1] before other adjustments. Default false. */
  autoContrast?: boolean;
  /** Unsharp mask amount in [0, 2]. Default 0 (off). */
  sharpen?: number;
}

/**
 * Convert RGBA ImageData into a normalized brightness HeightMap,
 * applying the full image-processing pipeline in order:
 *   grayscale → auto-contrast → brightness/contrast → invert → sharpen
 */
export function imageDataToHeightMap(image: ImageData, opts: HeightMapOptions = {}): HeightMap {
  const {
    invert = false,
    grayscaleMode = 'rec601',
    brightness = 0,
    contrast = 1,
    autoContrast = false,
    sharpen = 0,
  } = opts;

  const { width, height, data } = image;
  const out = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    let lum: number;
    switch (grayscaleMode) {
      case 'rec709':
        lum = (R709 * r + G709 * g + B709 * b) / 255;
        break;
      case 'average':
        lum = (r + g + b) / (3 * 255);
        break;
      case 'luminosity': {
        const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b);
        lum = R709 * rl + G709 * gl + B709 * bl;
        break;
      }
      default: // 'rec601'
        lum = (R601 * r + G601 * g + B601 * b) / 255;
    }
    out[i] = lum;
  }

  // Histogram stretch: pull min→0, max→1
  if (autoContrast) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < out.length; i++) { lo = Math.min(lo, out[i]); hi = Math.max(hi, out[i]); }
    const range = hi - lo;
    if (range > 0.01) {
      for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / range;
    }
  }

  // Brightness and contrast
  if (brightness !== 0 || contrast !== 1) {
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.max(0, Math.min(1, out[i] * contrast + brightness));
    }
  }

  if (invert) {
    for (let i = 0; i < out.length; i++) out[i] = 1 - out[i];
  }

  // Unsharp mask — safe on any size; blur is identity when ≤1 pixel per axis
  if (sharpen > 0) {
    const blurred = gaussianBlur3x3(out, width, height);
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.max(0, Math.min(1, out[i] + sharpen * (out[i] - blurred[i])));
    }
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

/**
 * Extract a sub-region from a HeightMap using a normalized CropRect.
 * Coordinates in crop are [0,1] relative to the source image.
 */
export function cropHeightMap(hm: HeightMap, crop: CropRect): HeightMap {
  const x0 = Math.round(crop.x * hm.width);
  const y0 = Math.round(crop.y * hm.height);
  const cw = Math.max(1, Math.round(crop.w * hm.width));
  const ch = Math.max(1, Math.round(crop.h * hm.height));
  const out = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      out[y * cw + x] = hm.data[
        Math.min(hm.height - 1, y0 + y) * hm.width +
        Math.min(hm.width - 1, x0 + x)
      ];
    }
  }
  return { width: cw, height: ch, data: out };
}

/**
 * Box-filter downsample: for each output pixel, averages all source pixels in
 * its footprint. Only does work when targetW < hm.width or targetH < hm.height;
 * returns the input unchanged if no downsampling is needed.
 */
export function downsampleHeightMap(hm: HeightMap, targetW: number, targetH: number): HeightMap {
  if (targetW >= hm.width && targetH >= hm.height) return hm;
  const scaleX = hm.width / targetW;
  const scaleY = hm.height / targetH;
  const out = new Float32Array(targetW * targetH);
  for (let ty = 0; ty < targetH; ty++) {
    for (let tx = 0; tx < targetW; tx++) {
      const x0 = Math.floor(tx * scaleX);
      const x1 = Math.min(hm.width, Math.ceil((tx + 1) * scaleX));
      const y0 = Math.floor(ty * scaleY);
      const y1 = Math.min(hm.height, Math.ceil((ty + 1) * scaleY));
      let sum = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          sum += hm.data[sy * hm.width + sx];
          n++;
        }
      }
      out[ty * targetW + tx] = n > 0 ? sum / n : 0;
    }
  }
  return { width: targetW, height: targetH, data: out };
}

/** Sample brightness at integer grid coords (clamped). */
export function sampleBrightness(hm: HeightMap, x: number, y: number): number {
  const cx = Math.min(hm.width - 1, Math.max(0, x));
  const cy = Math.min(hm.height - 1, Math.max(0, y));
  return hm.data[cy * hm.width + cx];
}

/**
 * Map a brightness value to lithophane thickness.
 * Bright (1) → lithoMin, dark (0) → lithoMax.
 * `gamma` compensates for Beer-Lambert light-transmission non-linearity:
 *   0.45 ≈ inverse sRGB gamma (recommended default), 1.0 = linear.
 */
export function brightnessToThickness(
  brightness: number,
  lithoMin: number,
  lithoMax: number,
  gamma = 1.0,
): number {
  const corrected = Math.pow(Math.max(0, brightness), gamma);
  return lithoMax - corrected * (lithoMax - lithoMin);
}
