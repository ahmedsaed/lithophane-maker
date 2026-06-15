import { describe, it, expect } from 'vitest';
import {
  imageDataToHeightMap,
  brightnessToThickness,
  downsampleHeightMap,
  cropHeightMap,
} from './toHeightmap';
import type { HeightMap } from '../geometry/types';

/** Build a minimal ImageData-like object from grayscale 0..255 values. */
function grayImage(values: number[], width: number): ImageData {
  const height = values.length / width;
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach((v, i) => {
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  });
  return { width, height, data } as ImageData;
}

/** Helper: make a simple HeightMap from a flat array. */
function makeHm(data: number[], width: number): HeightMap {
  return { width, height: data.length / width, data: new Float32Array(data) };
}

describe('imageDataToHeightMap', () => {
  it('maps white to 1 and black to 0 (rec601 default)', () => {
    const hm = imageDataToHeightMap(grayImage([255, 0], 2));
    expect(hm.width).toBe(2);
    expect(hm.height).toBe(1);
    expect(hm.data[0]).toBeCloseTo(1, 5);
    expect(hm.data[1]).toBeCloseTo(0, 5);
  });

  it('inverts brightness when requested', () => {
    const hm = imageDataToHeightMap(grayImage([255, 0], 2), { invert: true });
    expect(hm.data[0]).toBeCloseTo(0, 5);
    expect(hm.data[1]).toBeCloseTo(1, 5);
  });

  it('rec709 mode gives same result as rec601 for neutral gray', () => {
    const hm601 = imageDataToHeightMap(grayImage([128], 1), { grayscaleMode: 'rec601' });
    const hm709 = imageDataToHeightMap(grayImage([128], 1), { grayscaleMode: 'rec709' });
    expect(hm601.data[0]).toBeCloseTo(hm709.data[0], 3);
  });

  it('average mode gives (r+g+b)/3', () => {
    const img: ImageData = {
      width: 1, height: 1,
      data: new Uint8ClampedArray([60, 120, 180, 255]),
    } as ImageData;
    const hm = imageDataToHeightMap(img, { grayscaleMode: 'average' });
    expect(hm.data[0]).toBeCloseTo((60 + 120 + 180) / (3 * 255), 5);
  });

  it('luminosity mode linearises sRGB before weighting', () => {
    const hm601 = imageDataToHeightMap(grayImage([180], 1), { grayscaleMode: 'rec601' });
    const hmLum = imageDataToHeightMap(grayImage([180], 1), { grayscaleMode: 'luminosity' });
    // Linear luminance < sRGB-encoded luma for mid-range values
    expect(hmLum.data[0]).toBeLessThan(hm601.data[0]);
  });

  it('brightness offset shifts values', () => {
    const hm = imageDataToHeightMap(grayImage([128], 1), { brightness: 0.2 });
    const base = imageDataToHeightMap(grayImage([128], 1));
    expect(hm.data[0]).toBeCloseTo(Math.min(1, base.data[0] + 0.2), 4);
  });

  it('contrast multiplier scales values', () => {
    const hm = imageDataToHeightMap(grayImage([128], 1), { contrast: 2 });
    const base = imageDataToHeightMap(grayImage([128], 1));
    expect(hm.data[0]).toBeCloseTo(Math.min(1, base.data[0] * 2), 4);
  });

  it('autoContrast stretches narrow histogram to [0, 1]', () => {
    // All values in range [100, 150], should stretch so min→0 and max→1
    const hm = imageDataToHeightMap(grayImage([100, 125, 150], 3), { autoContrast: true });
    expect(hm.data[0]).toBeCloseTo(0, 4);
    expect(hm.data[2]).toBeCloseTo(1, 4);
    expect(hm.data[1]).toBeCloseTo(0.5, 2);
  });

  it('sharpen increases contrast around edges', () => {
    // 3-pixel image: dark edge | bright | dark edge — sharpening should push bright higher
    const hm0 = imageDataToHeightMap(grayImage([0, 200, 0], 3), { sharpen: 0 });
    const hm1 = imageDataToHeightMap(grayImage([0, 200, 0], 3), { sharpen: 1 });
    expect(hm1.data[1]).toBeGreaterThan(hm0.data[1]);
  });
});

describe('brightnessToThickness', () => {
  it('bright -> min, dark -> max (gamma=1 linear)', () => {
    expect(brightnessToThickness(1, 0.8, 3, 1)).toBeCloseTo(0.8, 5);
    expect(brightnessToThickness(0, 0.8, 3, 1)).toBeCloseTo(3, 5);
    expect(brightnessToThickness(0.5, 0.8, 3, 1)).toBeCloseTo(1.9, 5);
  });

  it('gamma defaults to 1 (backwards compatible)', () => {
    expect(brightnessToThickness(1, 0.8, 3)).toBeCloseTo(0.8, 5);
    expect(brightnessToThickness(0, 0.8, 3)).toBeCloseTo(3, 5);
  });

  it('gamma < 1 makes mid-tones thinner (brighter when backlit)', () => {
    const linear = brightnessToThickness(0.5, 0.8, 3, 1.0);
    const gamma45 = brightnessToThickness(0.5, 0.8, 3, 0.45);
    // gamma=0.45: pow(0.5, 0.45) > 0.5, so corrected brightness is higher → thickness is lower
    expect(gamma45).toBeLessThan(linear);
  });

  it('gamma > 1 makes mid-tones thicker (darker when backlit)', () => {
    const linear = brightnessToThickness(0.5, 0.8, 3, 1.0);
    const gamma2 = brightnessToThickness(0.5, 0.8, 3, 2.0);
    expect(gamma2).toBeGreaterThan(linear);
  });

  it('endpoints are unchanged regardless of gamma', () => {
    expect(brightnessToThickness(1, 0.8, 3, 0.45)).toBeCloseTo(0.8, 5);
    expect(brightnessToThickness(0, 0.8, 3, 0.45)).toBeCloseTo(3, 5);
  });
});

describe('cropHeightMap', () => {
  it('extracts the correct sub-region', () => {
    // 4×2 image: top-left quadrant all 0.2, top-right all 0.8, bottom-left 0.4, bottom-right 0.6
    const data = [0.2, 0.2, 0.8, 0.8, 0.4, 0.4, 0.6, 0.6];
    const hm = makeHm(data, 4);
    // Crop right half: x=0.5, y=0, w=0.5, h=1
    const out = cropHeightMap(hm, { x: 0.5, y: 0, w: 0.5, h: 1 });
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect(out.data[0]).toBeCloseTo(0.8, 5);
    expect(out.data[1]).toBeCloseTo(0.8, 5);
    expect(out.data[2]).toBeCloseTo(0.6, 5);
    expect(out.data[3]).toBeCloseTo(0.6, 5);
  });

  it('returns full image when crop covers entire area', () => {
    const hm = makeHm([0.1, 0.2, 0.3, 0.4], 2);
    const out = cropHeightMap(hm, { x: 0, y: 0, w: 1, h: 1 });
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect(Array.from(out.data)).toEqual(Array.from(hm.data));
  });
});

describe('downsampleHeightMap', () => {
  it('returns input unchanged when no downsampling needed', () => {
    const hm = makeHm([0.2, 0.4, 0.6, 0.8], 2);
    const out = downsampleHeightMap(hm, 2, 2);
    expect(out).toBe(hm);
  });

  it('averages a 2×1 to 1×1', () => {
    const hm = makeHm([0.0, 1.0], 2);
    const out = downsampleHeightMap(hm, 1, 1);
    expect(out.width).toBe(1);
    expect(out.height).toBe(1);
    expect(out.data[0]).toBeCloseTo(0.5, 5);
  });

  it('averages a 4×2 to 2×1', () => {
    // Row 0: [0, 0, 1, 1], Row 1: [0, 0, 1, 1]
    const hm = makeHm([0, 0, 1, 1, 0, 0, 1, 1], 4);
    const out = downsampleHeightMap(hm, 2, 1);
    expect(out.width).toBe(2);
    expect(out.height).toBe(1);
    expect(out.data[0]).toBeCloseTo(0, 5);
    expect(out.data[1]).toBeCloseTo(1, 5);
  });
});
