import { describe, it, expect } from 'vitest';
import {
  imageDataToHeightMap,
  brightnessToThickness,
} from './toHeightmap';

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

describe('imageDataToHeightMap', () => {
  it('maps white to 1 and black to 0', () => {
    const hm = imageDataToHeightMap(grayImage([255, 0], 2));
    expect(hm.width).toBe(2);
    expect(hm.height).toBe(1);
    expect(hm.data[0]).toBeCloseTo(1, 5);
    expect(hm.data[1]).toBeCloseTo(0, 5);
  });

  it('inverts brightness when requested', () => {
    const hm = imageDataToHeightMap(grayImage([255, 0], 2), true);
    expect(hm.data[0]).toBeCloseTo(0, 5);
    expect(hm.data[1]).toBeCloseTo(1, 5);
  });
});

describe('brightnessToThickness', () => {
  it('bright -> min, dark -> max', () => {
    expect(brightnessToThickness(1, 0.8, 3)).toBeCloseTo(0.8, 5);
    expect(brightnessToThickness(0, 0.8, 3)).toBeCloseTo(3, 5);
    expect(brightnessToThickness(0.5, 0.8, 3)).toBeCloseTo(1.9, 5);
  });
});
