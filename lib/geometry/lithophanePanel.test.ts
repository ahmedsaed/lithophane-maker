import { describe, it, expect } from 'vitest';
import { buildLithophanePanel, panelCells } from './lithophanePanel';
import type { HeightMap } from './types';

const hm: HeightMap = {
  width: 2,
  height: 2,
  data: Float32Array.from([0, 1, 1, 0]),
};

describe('buildLithophanePanel', () => {
  const cellsX = 4;
  const cellsY = 4;
  const geom = buildLithophanePanel({
    width: 20,
    height: 20,
    thickness: 3,
    tongueWidth: 2,
    lithoMin: 0.8,
    lithoMax: 3,
    heightMap: hm,
    cellsX,
    cellsY,
  });

  it('has front + back grid vertices', () => {
    const pos = geom.getAttribute('position');
    expect(pos.count).toBe(2 * (cellsX + 1) * (cellsY + 1));
  });

  it('is indexed', () => {
    expect(geom.getIndex()).not.toBeNull();
  });

  it('contains no NaN positions', () => {
    const arr = geom.getAttribute('position').array;
    for (let i = 0; i < arr.length; i++) expect(Number.isNaN(arr[i])).toBe(false);
  });

  it('keeps relief within plate thickness', () => {
    const pos = geom.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      expect(z).toBeGreaterThanOrEqual(-1e-6);
      expect(z).toBeLessThanOrEqual(3 + 1e-6);
    }
  });
});

describe('panelCells', () => {
  it('caps the longest side to the resolution', () => {
    const big: HeightMap = {
      width: 1000,
      height: 500,
      data: new Float32Array(1000 * 500),
    };
    const { cellsX, cellsY } = panelCells(big, 200);
    expect(cellsX).toBe(200);
    expect(cellsY).toBe(100);
  });
});
